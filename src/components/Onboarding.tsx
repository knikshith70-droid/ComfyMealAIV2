import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { upsertProfile } from "../lib/api";
import type { Profile } from "../lib/supabase";
import { ChipSelector } from "./ChipSelector";
import { Logo, Wordmark } from "./Logo";
import {
  AlertCircle, ChevronLeft, ChevronRight, Loader2, Minus, Plus, Salad, Globe, Users, Target, Compass, Heart, Utensils, ChefHat, Clock, Flame,
} from "lucide-react";

const TOTAL = 11;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, lang } = useI18n();
  const { user, profile, ensureProfileRow, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base: Profile = profile ?? {
    id: user?.id ?? "",
    allergies: [],
    lifestyle: [],
    cuisines: [],
    adults: 1,
    children: 0,
    goals: [],
    cuisine_theme: [],
    comfort_style: [],
    adventure_level: [],
    cooking_skill: [],
    meal_occasion: [],
    flavor_profile: [],
    onboarded: false,
    language: lang,
  };

  const [draft, setDraft] = useState<Profile>(base);

  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!user) throw new Error("Not signed in.");
      const row = await ensureProfileRow(user.id);
      await upsertProfile({ ...draft, id: row.id, onboarded: true, language: lang });
      await refreshProfile();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <Wordmark className="text-lg" />
        </div>
        <div className="text-sm muted">{t("onboardingStep", { n: step + 1, total: TOTAL })}</div>
      </header>

      <div className="px-6">
        <div className="max-w-2xl mx-auto">
          <div className="h-1.5 w-full rounded-full bg-cream-200 overflow-hidden">
            <div
              className="h-full bg-sage-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-start sm:items-center justify-center px-5 py-8">
        <div className="w-full max-w-2xl">
          <div key={step} className="animate-fade-up">
            {step === 0 && (
              <Step
                icon={<AlertCircle className="h-6 w-6" />}
                title={t("stepAllergiesTitle")}
                subtitle={t("stepAllergiesSub")}
              >
                <ChipSelector
                  category="allergy"
                  selected={draft.allergies}
                  onChange={(allergies) => setDraft({ ...draft, allergies })}
                  color="clay"
                  placeholder="e.g. corn"
                />
              </Step>
            )}

            {step === 1 && (
              <Step
                icon={<Salad className="h-6 w-6" />}
                title={t("stepLifestyleTitle")}
                subtitle={t("stepLifestyleSub")}
              >
                <ChipSelector
                  category="lifestyle"
                  selected={draft.lifestyle}
                  onChange={(lifestyle) => setDraft({ ...draft, lifestyle })}
                />
              </Step>
            )}

            {step === 2 && (
              <Step
                icon={<Globe className="h-6 w-6" />}
                title={t("stepCuisinesTitle")}
                subtitle={t("stepCuisinesSub")}
              >
                <ChipSelector
                  category="cuisine"
                  selected={draft.cuisines}
                  onChange={(cuisines) => setDraft({ ...draft, cuisines })}
                />
              </Step>
            )}

            {step === 3 && (
              <Step
                icon={<Users className="h-6 w-6" />}
                title={t("stepHouseholdTitle")}
                subtitle={t("stepHouseholdSub")}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Counter
                    label={t("adults")}
                    value={draft.adults}
                    onChange={(adults) => setDraft({ ...draft, adults: Math.max(0, adults) })}
                    min={0}
                  />
                  <Counter
                    label={t("children")}
                    value={draft.children}
                    onChange={(children) => setDraft({ ...draft, children: Math.max(0, children) })}
                    min={0}
                  />
                </div>
                <p className="muted text-sm mt-4">
                  {t("totalServings")} <span className="font-medium text-charcoal-900">{Math.max(1, draft.adults + Math.round(draft.children * 0.6))}</span>
                </p>
              </Step>
            )}

            {step === 4 && (
              <Step
                icon={<Target className="h-6 w-6" />}
                title={t("stepGoalsTitle")}
                subtitle={t("stepGoalsSub")}
              >
                <ChipSelector
                  category="goal"
                  selected={draft.goals}
                  onChange={(goals) => setDraft({ ...draft, goals })}
                />
              </Step>
            )}

            {step === 5 && (
              <Step
                icon={<Utensils className="h-6 w-6" />}
                title={t("stepCuisineThemeTitle")}
                subtitle={t("stepCuisineThemeSub")}
              >
                <ChipSelector
                  category="cuisine_theme"
                  selected={draft.cuisine_theme}
                  onChange={(cuisine_theme) => setDraft({ ...draft, cuisine_theme })}
                />
              </Step>
            )}

            {step === 6 && (
              <Step
                icon={<Heart className="h-6 w-6" />}
                title={t("stepComfortStyleTitle")}
                subtitle={t("stepComfortStyleSub")}
              >
                <ChipSelector
                  category="comfort_style"
                  selected={draft.comfort_style}
                  onChange={(comfort_style) => setDraft({ ...draft, comfort_style })}
                />
              </Step>
            )}

            {step === 7 && (
              <Step
                icon={<Compass className="h-6 w-6" />}
                title={t("stepAdventureTitle")}
                subtitle={t("stepAdventureSub")}
              >
                <ChipSelector
                  category="adventure_level"
                  selected={draft.adventure_level}
                  onChange={(adventure_level) => setDraft({ ...draft, adventure_level })}
                />
              </Step>
            )}

            {step === 8 && (
              <Step
                icon={<ChefHat className="h-6 w-6" />}
                title={t("stepCookingSkillTitle")}
                subtitle={t("stepCookingSkillSub")}
              >
                <ChipSelector
                  category="cooking_skill"
                  selected={draft.cooking_skill}
                  onChange={(cooking_skill) => setDraft({ ...draft, cooking_skill })}
                  color="sage"
                />
              </Step>
            )}

            {step === 9 && (
              <Step
                icon={<Clock className="h-6 w-6" />}
                title={t("stepMealOccasionTitle")}
                subtitle={t("stepMealOccasionSub")}
              >
                <ChipSelector
                  category="meal_occasion"
                  selected={draft.meal_occasion}
                  onChange={(meal_occasion) => setDraft({ ...draft, meal_occasion })}
                  color="sage"
                  placeholder="e.g. Date night dinners"
                />
              </Step>
            )}

            {step === 10 && (
              <Step
                icon={<Flame className="h-6 w-6" />}
                title={t("stepFlavorProfileTitle")}
                subtitle={t("stepFlavorProfileSub")}
              >
                <ChipSelector
                  category="flavor_profile"
                  selected={draft.flavor_profile}
                  onChange={(flavor_profile) => setDraft({ ...draft, flavor_profile })}
                  color="sage"
                  placeholder="e.g. Garlicky, Herby"
                />
              </Step>
            )}
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={back}
              disabled={step === 0 || saving}
              className="btn-ghost"
            >
              <ChevronLeft className="h-4 w-4" /> {t("back")}
            </button>
            {step < TOTAL - 1 ? (
              <button type="button" onClick={next} className="btn-primary">
                {t("continue")} <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={finish} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("startCooking")}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-sage-100 text-sage-700 mb-4">
        {icon}
      </div>
      <h2 className="section-title text-balance">{title}</h2>
      <p className="muted mt-2 mb-6 text-balance">{subtitle}</p>
      <div>{children}</div>
    </div>
  );
}

function Counter({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <div className="text-sm muted">{label}</div>
        <div className="font-serif text-2xl text-charcoal-900">{value}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-cream-100 hover:bg-cream-200 text-charcoal-700 disabled:opacity-40 active:scale-95 transition"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-sage-600 hover:bg-sage-700 text-cream-50 active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
