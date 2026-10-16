import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, code } = (await req.json()) as { email?: string; code?: string };
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and code are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const normalized = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    if (!/^\\d{6}$/.test(trimmedCode)) {
      return new Response(
        JSON.stringify({ error: "That code is invalid or has already been used. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const codeHash = await sha256(trimmedCode);

    // The database function locks the current code row and counts failed attempts
    // atomically, so parallel requests cannot bypass the five-attempt limit.
    const { data: attempts, error: attemptError } = await admin.rpc("verify_otp_attempt", {
      p_email: normalized,
      p_code_hash: codeHash,
    });

    if (attemptError) {
      throw new Error("Could not verify the code. Please try again.");
    }

    const attempt = attempts?.[0] as { status?: string; otp_id?: string } | undefined;
    if (attempt?.status !== "verified") {
      const message = attempt?.status === "locked"
        ? "Too many incorrect attempts. Please request a new code."
        : "That code is invalid or has already been used. Please request a new one.";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // generateLink creates the user if they don't exist and issues a one-time
    // magic-link token we can immediately exchange for a real session. For
    // users created via signup-with-otp (already exists, email unconfirmed),
    // we confirm the email first so the link succeeds.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalized,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      throw new Error(`Failed to issue session token: ${linkError?.message ?? "no token returned"}`);
    }

    // If the user existed but was unconfirmed (signup flow), mark confirmed.
    const linkUser = linkData.user;
    if (linkUser && !linkUser.email_confirmed_at) {
      await admin.auth.admin.updateUserById(linkUser.id, { email_confirm: true });
    }

    // Exchange the magic-link token for a real access + refresh token pair.
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError || !verifyData?.session) {
      throw new Error(`Failed to establish session: ${verifyError?.message ?? "no session returned"}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        expires_in: verifyData.session.expires_in,
        user: {
          id: verifyData.user?.id,
          email: verifyData.user?.email ?? normalized,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
