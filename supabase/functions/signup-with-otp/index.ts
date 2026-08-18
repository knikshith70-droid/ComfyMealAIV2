import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_URL = "https://api.resend.com/emails";
const FROM_EMAIL = "ComfyMeal AI <onboarding@resend.dev>";
const CODE_TTL_MINUTES = 10;
const RATE_LIMIT_SECONDS = 60;

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSixDigit(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const n = arr[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "A valid email is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const normalized = email.trim().toLowerCase();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Check if an account already exists for this email.
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      throw new Error(`Failed to check existing accounts: ${listError.message}`);
    }
    const exists = (existingUsers?.users ?? []).some(
      (u) => (u.email ?? "").toLowerCase() === normalized,
    );
    if (exists) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists. Please sign in instead.", account_exists: true }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit: no more than one signup code per email per 60s
    const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
    const { count } = await admin
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", normalized)
      .gte("created_at", since);
    if (count && count > 0) {
      return new Response(
        JSON.stringify({ error: `A code was sent recently. Please wait ${RATE_LIMIT_SECONDS}s before requesting another.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create the user with the chosen password. Email is left unconfirmed;
    // the OTP step confirms the email and establishes the session.
    const { error: createError } = await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: false,
    });
    if (createError) {
      throw new Error(`Failed to create account: ${createError.message}`);
    }

    // Generate and store the OTP code.
    const code = generateSixDigit();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await admin
      .from("otp_codes")
      .insert({ email: normalized, code_hash: codeHash, expires_at: expiresAt });
    if (insertError) {
      throw new Error(`Failed to store code: ${insertError.message}`);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.log(`[signup-with-otp] No RESEND_API_KEY. OTP for ${normalized}: ${code}`);
      return new Response(
        JSON.stringify({ ok: true, dev_code: code }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailRes = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: normalized,
        subject: "Your ComfyMeal AI verification code",
        html: `<!doctype html><html><body style="font-family:Inter,Helvetica,Arial,sans-serif;background:#FBF8F3;color:#1E1B18;padding:32px 0;margin:0;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="420" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #EFE7D6;padding:32px;">
      <tr><td style="text-align:center;padding-bottom:8px;">
        <div style="font-family:Georgia,serif;font-size:22px;color:#2D3B29;">ComfyMeal AI</div>
      </td></tr>
      <tr><td style="text-align:center;padding-top:8px;padding-bottom:20px;color:#3A3530;font-size:15px;line-height:1.5;">
        Use the code below to verify your email and finish creating your account. It expires in ${CODE_TTL_MINUTES} minutes.
      </td></tr>
      <tr><td align="center" style="padding:8px 0 24px;">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:36px;letter-spacing:0.5em;color:#2D3B29;background:#F2F5EF;border-radius:12px;padding:20px 24px;display:inline-block;">${code}</div>
      </td></tr>
      <tr><td style="color:#6B6258;font-size:13px;line-height:1.5;text-align:center;padding-top:8px;">
        If you didn't request this code, you can safely ignore this email.
      </td></tr>
    </table>
    <p style="color:#9A9189;font-size:12px;text-align:center;margin-top:20px;">ComfyMeal AI · comfy meal planning</p>
  </td></tr></table>
</body></html>`,
        text: `ComfyMeal AI\n\nYour verification code is: ${code}\n\nIt expires in ${CODE_TTL_MINUTES} minutes. If you didn't request it, you can ignore this email.`,
      }),
    });

    if (!emailRes.ok) {
      const text = await emailRes.text().catch(() => "");
      throw new Error(`Resend email failed (${emailRes.status}): ${text.slice(0, 300)}`);
    }

    return new Response(
      JSON.stringify({ ok: true }),
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
