import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImageRequest {
  title: string;
  cuisine?: string;
  mealType?: string;
  ingredients?: string[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function stableKey(value: string): string {
  // Deterministic non-cryptographic key; the title is normalized before hashing.
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as ImageRequest;
    const title = (body.title ?? "").trim().slice(0, 180);
    if (!title) return json({ error: "A recipe title is required." }, 400);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Image generation is not configured." }, 503);
    }

    const bucket = "recipe-artwork";
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    const cacheKey = `${normalizedTitle || "meal"}-${stableKey(title.toLowerCase())}.png`;
    const storageBase = `${supabaseUrl.replace(/\/$/, "")}/storage/v1`;
    const publicUrl = `${storageBase}/object/public/${bucket}/${cacheKey}`;
    const authHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

    // Reuse previously generated artwork before calling Gemini.
    const cached = await fetch(publicUrl, { method: "HEAD" });
    if (cached.ok) return json({ imageUrl: publicUrl, source: "gemini-cache" });

    // Create the public bucket if it does not exist yet.
    const bucketCheck = await fetch(`${storageBase}/bucket/${bucket}`, { headers: authHeaders });
    if (!bucketCheck.ok) {
      const create = await fetch(`${storageBase}/bucket`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 5242880, allowed_mime_types: ["image/png"] }),
      });
      if (!create.ok && create.status !== 409) {
        console.error("Could not initialize recipe artwork storage:", create.status);
        return json({ error: "Could not initialize image storage." }, 502);
      }
    }

    const ingredients = (body.ingredients ?? []).slice(0, 14).map((item) => String(item).slice(0, 80));
    const prompt = [
      "Create one appetizing, realistic editorial food photograph for a recipe app.",
      `Dish: ${title}.`,
      body.cuisine ? `Cuisine: ${String(body.cuisine).slice(0, 60)}.` : "",
      body.mealType ? `Meal type: ${String(body.mealType).slice(0, 40)}.` : "",
      ingredients.length ? `Relevant ingredients: ${ingredients.join(", ")}.` : "",
      "Show only the prepared dish, served naturally in tasteful ceramic tableware, soft natural window light, clean warm neutral background, subtle styling, realistic edible textures, close three-quarter view, premium cookbook photography.",
      "No people, no hands, no text, no letters, no watermark, no collage. Square composition with the food centered, suitable for cropping into a recipe card.",
    ].filter(Boolean).join(" ");

    const generated = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal: AbortSignal.timeout(45000),
      },
    );

    if (!generated.ok) {
      console.error("Gemini image generation failed:", generated.status, (await generated.text()).slice(0, 500));
      return json({ error: "Gemini could not generate this meal image." }, 502);
    }

    const result = await generated.json();
    const parts = result?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData?.data);
    const imageData = imagePart?.inlineData?.data as string | undefined;
    const mimeType = imagePart?.inlineData?.mimeType ?? "image/png";
    if (!imageData || !mimeType.startsWith("image/")) {
      console.error("Gemini returned no image payload.");
      return json({ error: "Gemini did not return an image." }, 502);
    }

    const binary = Uint8Array.from(atob(imageData), (char) => char.charCodeAt(0));
    const upload = await fetch(`${storageBase}/object/${bucket}/${cacheKey}`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": mimeType,
        "x-upsert": "true",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: binary,
    });
    if (!upload.ok) {
      console.error("Could not cache generated artwork:", upload.status, (await upload.text()).slice(0, 300));
      return json({ error: "Image was generated but could not be cached." }, 502);
    }

    return json({ imageUrl: publicUrl, source: "gemini" });
  } catch (error) {
    console.error("Recipe artwork error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Could not generate meal artwork." }, 500);
  }
});
