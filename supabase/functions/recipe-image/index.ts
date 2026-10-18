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

    const cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const cloudflareApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!cloudflareAccountId || !cloudflareApiToken || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Image generation is not configured." }, 503);
    }

    const bucket = "recipe-artwork";
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    const cacheKey = `${normalizedTitle || "meal"}-${stableKey(title.toLowerCase())}.jpg`;
    const storageBase = `${supabaseUrl.replace(/\/$/, "")}/storage/v1`;
    const publicUrl = `${storageBase}/object/public/${bucket}/${cacheKey}`;
    const authHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

    // Reuse previously generated artwork before calling Cloudflare Workers AI.
    const cached = await fetch(publicUrl, { method: "HEAD" });
    if (cached.ok) return json({ imageUrl: publicUrl, source: "cloudflare-cache" });

    // Create the public bucket if it does not exist yet.
    const bucketCheck = await fetch(`${storageBase}/bucket/${bucket}`, { headers: authHeaders });
    if (!bucketCheck.ok) {
      const create = await fetch(`${storageBase}/bucket`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg"] }),
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

    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cloudflareAccountId)}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
    const requestBody = JSON.stringify({ prompt: prompt.slice(0, 2048), steps: 4 });
    // Do not retry 429 quota/rate-limit responses; only retry temporary server errors.
    let generated: Response | undefined;
    let lastNetworkError: unknown;

    // Retry transient server and network failures up to 3 attempts.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        generated = await fetch(cloudflareUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cloudflareApiToken}` },
          body: requestBody,
          signal: AbortSignal.timeout(30000),
        });
        lastNetworkError = undefined;
        if (generated.ok || ![500, 502, 503, 504].includes(generated.status) || attempt === 2) break;
        console.warn(`Cloudflare Workers AI temporarily unavailable (HTTP ${generated.status}); retrying attempt ${attempt + 2}/3.`);
      } catch (error) {
        lastNetworkError = error;
        if (attempt === 2) break;
        console.warn(`Cloudflare Workers AI image request failed temporarily; retrying attempt ${attempt + 2}/3.`);
      }
      // Short exponential backoff: 700 ms, then 1400 ms.
      await new Promise((resolve) => setTimeout(resolve, 700 * (2 ** attempt)));
    }

    if (!generated) {
      console.error("Cloudflare Workers AI image generation failed after retries:", lastNetworkError instanceof Error ? lastNetworkError.message : "Network error");
      return json({ error: "Image generation is temporarily unavailable. Please try again shortly." }, 503);
    }
    if (!generated.ok) {
      const providerError = (await generated.text()).slice(0, 500);
      console.error("Cloudflare Workers AI image generation failed:", generated.status, providerError);
      return json({ error: generated.status === 429 ? "Image generation free allowance or rate limit reached." : "The image provider could not generate this meal image." }, generated.status === 429 ? 429 : 502);
    }

    const result = await generated.json();
    const imageData = result?.result?.image as string | undefined;
    const mimeType = "image/jpeg";
    if (!imageData) {
      console.error("Cloudflare Workers AI returned no image payload:", JSON.stringify(result).slice(0, 500));
      return json({ error: "The image provider did not return an image." }, 502);
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

    return json({ imageUrl: publicUrl, source: "cloudflare-workers-ai" });
  } catch (error) {
    console.error("Recipe artwork error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Could not generate meal artwork." }, 500);
  }
});
