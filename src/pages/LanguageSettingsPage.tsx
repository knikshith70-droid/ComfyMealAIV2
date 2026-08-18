import { useState } from "react";
import { useI18n, LANGUAGES, type Lang } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { upsertProfile } from "../lib/api";
import { Globe, Check, Loader2 } from "lucide-react";

export function LanguageSettingsPage() {
  const { lang, setLang, t } = useI18n();
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSelect = async (code: Lang) => {
    setLang(code);
    if (profile) {
      setSaving(true);
      try {
        await upsertProfile({ ...profile, language: code });
        await refreshProfile();
      } catch {
        // silently fail — localStorage already saved the preference
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="px-5 sm:px-8 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <Globe className="h-6 w-6 text-sage-700" />
        <h1 className="font-serif text-3xl text-charcoal-900">{t("language")}</h1>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-sage-600" />}
      </div>
      <p className="muted mb-8">{t("languagePageSub")}</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {LANGUAGES.map((l) => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => handleSelect(l.code as Lang)}
              className={`card p-4 sm:p-5 text-left flex items-center justify-between gap-3 transition-all duration-200 ${active ? "ring-2 ring-sage-500 border-sage-400 bg-sage-50/60" : "hover:border-sage-300"}`}
            >
              <div>
                <div className={`font-medium ${active ? "text-sage-800" : "text-charcoal-900"}`}>{l.label}</div>
                <div className="text-xs muted mt-0.5 uppercase tracking-wider">{l.flag}</div>
              </div>
              {active && (
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-sage-600 text-cream-50 shrink-0">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 card p-4 sm:p-5 bg-sage-50 border-sage-200">
        <div className="font-medium text-sage-800 mb-1">{t("languageHowTitle")}</div>
        <ul className="text-sm text-sage-800/80 space-y-1.5 mt-2">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-sage-600 mt-0.5 shrink-0" /> {t("langUiSwitch")}</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-sage-600 mt-0.5 shrink-0" /> {t("langAiRecipes")}</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-sage-600 mt-0.5 shrink-0" /> {t("langKeepOld")}</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-sage-600 mt-0.5 shrink-0" /> {t("langPersist")}</li>
        </ul>
      </div>
    </div>
  );
}
