import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Logo, Wordmark } from "./Logo";
import { useI18n } from "../lib/i18n";
import {
  Leaf, Mail, Loader2, AlertCircle, KeyRound, ArrowLeft,
  CheckCircle2, UserPlus, LogIn, Eye, EyeOff,
} from "lucide-react";

type AuthMode = "signin" | "signup";
type AuthMethod = "password" | "otp";

interface AuthScreenProps {
  onBackToLanding: () => void;
}

function GoogleG() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.01 13.22l7.98 6.19C11.9 13.72 17.45 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.66 5.94c4.47-4.13 7.12-10.2 7.12-17.59Z" />
      <path fill="#FBBC05" d="M9.99 28.59A14.4 14.4 0 0 1 9.22 24c0-1.59.27-3.13.76-4.59L2.01 13.22A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.58 10.78l7.41-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.86l-7.66-5.94c-2.13 1.43-4.85 2.28-8.24 2.28-6.55 0-12.1-4.22-14.01-10.09l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

export function AuthScreen({ onBackToLanding }: AuthScreenProps) {
  const { t } = useI18n();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [method, setMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState<null | "password" | "otp-send" | "otp-verify" | "google">(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignUp = mode === "signup";
  const busy = loading !== null;
  const edgeUrl = (fn: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`;
  const edgeHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  });

  const clearFeedback = () => { setError(null); setInfo(null); };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setMethod("password");
    setOtpSent(false);
    setCode("");
    clearFeedback();
  };

  const switchMethod = (next: AuthMethod) => {
    setMethod(next);
    setOtpSent(false);
    setCode("");
    clearFeedback();
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading("password");
    clearFeedback();
    try {
      if (isSignUp) {
        const res = await fetch(edgeUrl("signup-with-otp"), {
          method: "POST",
          headers: edgeHeaders(),
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? `Sign-up failed (${res.status}).`);
        setOtpSent(true);
        setInfo(json.dev_code ? `Dev mode — code is ${json.dev_code}` : t("enterCode"));
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      if (!isSignUp && /invalid login credentials/i.test(message)) {
        setError("Invalid login credentials. If you originally signed up with \"Continue with Google,\" use that button above instead — or tap \"Use a one-time email code instead\" below to sign in without a password.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(null);
    }
  };

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }

    setLoading("otp-send");
    clearFeedback();
    try {
      const res = await fetch(edgeUrl("send-otp"), {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
      setOtpSent(true);
      setInfo(json.dev_code ? `Dev mode — code is ${json.dev_code}` : t("enterCode"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(null);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { setError("Enter the 6-digit code from your email."); return; }

    setLoading("otp-verify");
    clearFeedback();
    try {
      const res = await fetch(edgeUrl("verify-otp"), {
        method: "POST",
        headers: edgeHeaders(),
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Verification failed (${res.status}).`);

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });
      if (sessionError) throw sessionError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
    } finally {
      setLoading(null);
    }
  };

  const signInWithGoogle = async () => {
    setLoading("google");
    clearFeedback();
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setLoading(null);
    }
  };

  const heroTitle = otpSent ? t("checkEmail") : isSignUp ? "Create your account" : t("landingHead");
  const heroSub = otpSent ? t("enterCode") : isSignUp ? "Enter your email and a password to get started." : t("landingSub");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <button type="button" onClick={onBackToLanding} className="flex items-center gap-2.5" aria-label="Back to ComfyMeal AI home">
          <Logo />
          <Wordmark />
        </button>
        <button type="button" onClick={onBackToLanding} className="btn-ghost px-3 py-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-16 pt-4">
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-sage-100 text-sage-700 mb-4">
              <Leaf className="h-7 w-7" />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-charcoal-900 text-balance">{heroTitle}</h1>
            <p className="muted mt-3 text-balance max-w-sm mx-auto">{heroSub}</p>
          </div>

          <div className="card p-6 sm:p-7">
            {!otpSent && (
              <div className="flex rounded-xl bg-cream-100 p-1 mb-6">
                <button type="button" onClick={() => switchMode("signin")} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${!isSignUp ? "bg-white shadow-sm text-charcoal-900" : "text-charcoal-700/60 hover:text-charcoal-900"}`}>
                  <LogIn className="h-3.5 w-3.5" /> Sign in
                </button>
                <button type="button" onClick={() => switchMode("signup")} className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${isSignUp ? "bg-white shadow-sm text-charcoal-900" : "text-charcoal-700/60 hover:text-charcoal-900"}`}>
                  <UserPlus className="h-3.5 w-3.5" /> Sign up
                </button>
              </div>
            )}

            {otpSent ? (
              <form onSubmit={verifyOtp} className="space-y-4 animate-fade-up">
                <div className="flex items-center justify-between rounded-xl bg-cream-100/70 border border-cream-200/70 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-xs muted">{t("codeSentTo")}</div>
                    <div className="font-medium text-charcoal-900 truncate">{email}</div>
                  </div>
                  <button type="button" onClick={() => { setOtpSent(false); setCode(""); clearFeedback(); }} className="btn-ghost text-xs px-2.5 py-1.5 shrink-0">
                    <ArrowLeft className="h-3.5 w-3.5" /> {t("change")}
                  </button>
                </div>
                <div>
                  <label className="label" htmlFor="otp-code">{t("digitCode")}</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-700/40" />
                    <input id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" autoFocus className="input pl-10 tracking-[0.4em] font-mono text-lg" />
                  </div>
                </div>
                <FeedbackBanner error={error} info={info} />
                <button type="submit" disabled={busy || code.length < 6} className="btn-primary w-full">
                  {loading === "otp-verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {isSignUp ? "Verify & create account" : t("verifyContinue")}
                </button>
                <button type="button" onClick={sendOtp} disabled={busy} className="btn-ghost w-full text-sm">{t("resendCode")}</button>
              </form>
            ) : (
              <>
                <button type="button" onClick={signInWithGoogle} disabled={busy} className="mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-4 py-3 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleG />}
                  {isSignUp ? "Sign up with Google" : "Sign in with Google"}
                </button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-cream-300" /></div>
                  <div className="relative flex justify-center"><span className="bg-cream-50 px-3 text-xs uppercase tracking-wider muted">or continue with email</span></div>
                </div>

                {method === "password" && (
                  <form onSubmit={submitPassword} className="space-y-4">
                    <div>
                      <label className="label" htmlFor="auth-email">{t("email")}</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-700/40" />
                        <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input pl-10" />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="auth-password">Password</label>
                      <div className="relative">
                        <input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignUp ? "At least 6 characters" : "Your password"} className="input pr-11" />
                        <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-700/40 hover:text-charcoal-700/70 transition" aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <FeedbackBanner error={error} info={info} />
                    <button type="submit" disabled={busy} className="btn-primary w-full">
                      {loading === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                      {isSignUp ? "Create account" : "Sign in"}
                    </button>
                    {!isSignUp && (
                      <button type="button" onClick={() => switchMethod("otp")} className="btn-ghost w-full text-sm text-charcoal-700/60">
                        <Mail className="h-3.5 w-3.5" /> Use a one-time email code instead
                      </button>
                    )}
                  </form>
                )}

                {method === "otp" && (
                  <form onSubmit={sendOtp} className="space-y-4">
                    <div>
                      <label className="label" htmlFor="otp-email">{t("email")}</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-700/40" />
                        <input id="otp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus className="input pl-10" />
                      </div>
                    </div>
                    <FeedbackBanner error={error} info={info} />
                    <button type="submit" disabled={busy} className="btn-primary w-full">
                      {loading === "otp-send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {t("sendCode")}
                    </button>
                    <button type="button" onClick={() => switchMethod("password")} className="btn-ghost w-full text-sm text-charcoal-700/60">
                      <KeyRound className="h-3.5 w-3.5" /> Use a password instead
                    </button>
                  </form>
                )}

                <p className="text-center text-xs muted mt-5">
                  {isSignUp ? (
                    <>Already have an account?{" "}<button type="button" onClick={() => switchMode("signin")} className="text-sage-700 font-medium hover:underline">Sign in</button></>
                  ) : (
                    <>Don&apos;t have an account?{" "}<button type="button" onClick={() => switchMode("signup")} className="text-sage-700 font-medium hover:underline">Sign up</button></>
                  )}
                </p>
              </>
            )}
          </div>

          <p className="text-center text-xs muted mt-5 max-w-sm mx-auto">{t("authNote")}</p>
        </div>
      </main>
    </div>
  );
}

function FeedbackBanner({ error, info }: { error: string | null; info: string | null }) {
  if (error) {
    return <div className="flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3 animate-fade-in"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>;
  }
  if (info) {
    return <div className="flex items-start gap-2 text-sm text-sage-800 bg-sage-50 border border-sage-200 rounded-xl px-3.5 py-3 animate-fade-in"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /><span>{info}</span></div>;
  }
  return null;
}
