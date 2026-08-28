import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { upsertProfile } from "../lib/api";
import { ChipSelector } from "../components/ChipSelector";
import type { Profile } from "../lib/supabase";
import {
  Settings, AlertCircle, Salad, Globe, Users, Target, Loader2, Check, Minus, Plus,
  Utensils, Heart, Compass, ChefHat, Clock, Flame, Scale,
} from "lucide-react";

interface Props {
  profile: Profile;
}

function normalizeProfile(p: Profile): Profile {
  return {
    ...p,
    allergies: p.allergies ?? [],
    lifestyle: p.lifestyle ?? [],
    cuisines: p.cuisines ?? [],
    goals: p.goals ?? [],
    cuisine_theme: p.cuisine_theme ?? [],
    comfort_style: p.comfort_style ?? [],
    adventure_level: p.adventure_level ?? [],
    cooking_skill: p.cooking_skill ?? [],
    meal_occasion: p.meal_occasion ?? [],
    flavor_profile: p.flavor_profile ?? [],
    adults: p.adults ?? 1,
    children: p.children ?? 0,
    quantity_tracking_enabled: p.quantity_tracking_enabled ?? true,
  };
}

export function AccountSettingsPage({ profile }: Props) {
  const { refreshProfile } = useAuth();
  const { t } = useI18n();
  const [draft, setDraft] = useState<Profile>(normalizeProfile(profile));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await upsertProfile({ ...draft, onboarded: true });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const servings = Math.max(1, draft.adults + Math.round(draft.children * 0.6));

  return (
    <div className="px-5 sm:px-8 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <Settings className="h-6 w-6 text-sage-700" />
        <h1 className="font-serif text-3xl text-charcoal-900">{t("accountTitle")}</h1>
      </div>
      <p className="muted mb-8">{t("accountSubtitle")}</p>

      <div className="space-y-7">
        <Section icon={<AlertCircle className="h-5 w-5" />} title={t("stepAllergiesTitle")} sub={t("stepAllergiesSub")}>
          <ChipSelector
            category="allergy"
            selected={draft.allergies}
            onChange={(allergies) => setDraft({ ...draft, allergies })}
            color="clay"
            placeholder="e.g. corn"
          />
        </Section>

        <Section icon={<Salad className="h-5 w-5" />} title={t("stepLifestyleTitle")} sub={t("stepLifestyleSub")}>
          <ChipSelector
            category="lifestyle"
            selected={draft.lifestyle}
            onChange={(lifestyle) => setDraft({ ...draft, lifestyle })}
          />
        </Section>

        <Section icon={<Globe className="h-5 w-5" />} title={t("stepCuisinesTitle")} sub={t("stepCuisinesSub")}>
          <ChipSelector
            category="cuisine"
            selected={draft.cuisines}
            onChange={(cuisines) => setDraft({ ...draft, cuisines })}
          />
        </Section>

        <Section icon={<Users className="h-5 w-5" />} title={t("stepHouseholdTitle")} sub={t("stepHouseholdSub")}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Counter
              label={t("adults")}
              value={draft.adults}
              onChange={(adults) => setDraft({ ...draft, adults: Math.max(0, adults) })}
            />
            <Counter
              label={t("children")}
              value={draft.children}
              onChange={(children) => setDraft({ ...draft, children: Math.max(0, children) })}
            />
          </div>
          <p className="text-sm muted mt-3">
            {t("totalServings")} <span className="font-medium text-charcoal-900">{servings}</span>
          </p>
        </Section>

        <Section icon={<Target className="h-5 w-5" />} title={t("stepGoalsTitle")} sub={t("stepGoalsSub")}>
          <ChipSelector
            category="goal"
            selected={draft.goals}
            onChange={(goals) => setDraft({ ...draft, goals })}
          />
        </Section>

        <Section icon={<Utensils className="h-5 w-5" />} title={t("stepCuisineThemeTitle")} sub={t("stepCuisineThemeSub")}>
          <ChipSelector
            category="cuisine_theme"
            selected={draft.cuisine_theme ?? []}
            onChange={(cuisine_theme) => setDraft({ ...draft, cuisine_theme })}
          />
        </Section>

        <Section icon={<Heart className="h-5 w-5" />} title={t("stepComfortStyleTitle")} sub={t("stepComfortStyleSub")}>
          <ChipSelector
            category="comfort_style"
            selected={draft.comfort_style ?? []}
            onChange={(comfort_style) => setDraft({ ...draft, comfort_style })}
          />
        </Section>

        <Section icon={<Compass className="h-5 w-5" />} title={t("stepAdventureTitle")} sub={t("stepAdventureSub")}>
          <ChipSelector
            category="adventure_level"
            selected={draft.adventure_level ?? []}
            onChange={(adventure_level) => setDraft({ ...draft, adventure_level })}
          />
        </Section>

        <Section icon={<ChefHat className="h-5 w-5" />} title={t("stepCookingSkillTitle")} sub={t("stepCookingSkillSub")}>
          <ChipSelector
            category="cooking_skill"
            selected={draft.cooking_skill ?? []}
            onChange={(cooking_skill) => setDraft({ ...draft, cooking_skill })}
            color="sage"
          />
        </Section>

        <Section icon={<Clock className="h-5 w-5" />} title={t("stepMealOccasionTitle")} sub={t("stepMealOccasionSub")}>
          <ChipSelector
            category="meal_occasion"
            selected={draft.meal_occasion ?? []}
            onChange={(meal_occasion) => setDraft({ ...draft, meal_occasion })}
            color="sage"
            placeholder="e.g. Date night dinners"
          />
        </Section>

        <Section icon={<Flame className="h-5 w-5" />} title={t("stepFlavorProfileTitle")} sub={t("stepFlavorProfileSub")}>
          <ChipSelector
            category="flavor_profile"
            selected={draft.flavor_profile ?? []}
            onChange={(flavor_profile) => setDraft({ ...draft, flavor_profile })}
            color="sage"
            placeholder="e.g. Garlicky, Herby"
          />
        </Section>

        <Section icon={<Scale className="h-5 w-5" />} title={t("quantityTrackingTitle")} sub={t("quantityTrackingSub")}>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, quantity_tracking_enabled: !draft.quantity_tracking_enabled })}
            className={`relative w-14 h-7 rounded-full transition ${draft.quantity_tracking_enabled ? "bg-sage-600" : "bg-cream-300"}`}
            aria-label={t("quantityTrackingTitle")}
          >
            <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-cream-50 shadow transition ${draft.quantity_tracking_enabled ? "translate-x-7" : ""}`} />
          </button>
          <div className="mt-3 space-y-2 text-sm text-charcoal-700">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${draft.quantity_tracking_enabled ? "bg-sage-500" : "bg-charcoal-400"}`} />
              <span>{draft.quantity_tracking_enabled ? t("quantityTrackingOnDesc") : t("quantityTrackingOffDesc")}</span>
            </div>
          </div>
        </Section>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="mt-6 flex items-center gap-2 text-sm text-sage-700 bg-sage-50 border border-sage-200 rounded-xl px-3.5 py-3 animate-fade-in">
          <Check className="h-4 w-4 shrink-0" /> {t("saved")}!
        </div>
      )}

      <div className="mt-8 pb-8">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary px-8">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? t("loading") : t("save")}
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sage-700">{icon}</span>
        <h2 className="font-serif text-lg text-charcoal-900">{title}</h2>
      </div>
      <p className="muted text-sm mb-4">{sub}</p>
      {children}
    </section>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-cream-100 border border-cream-200 px-4 py-3">
      <div>
        <div className="text-sm muted">{label}</div>
        <div className="font-serif text-2xl text-charcoal-900">{value}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-cream-200 hover:bg-cream-300 text-charcoal-700 disabled:opacity-40 active:scale-95 transition"
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
