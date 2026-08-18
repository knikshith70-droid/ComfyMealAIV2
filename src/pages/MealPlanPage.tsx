import { useState } from "react";
import { useI18n } from "../lib/i18n";
import { useInventory } from "../lib/inventory";
import { generateMealPlan, saveMealPlan } from "../lib/api";
import type { MealPlanDay, MealPlanSettings, PantryItem, Profile, Recipe, SpiceItem } from "../lib/supabase";
import { RecipeDetailModal } from "../components/RecipeDetailModal";
import { ChipSelector } from "../components/ChipSelector";
import { PantryInventory } from "../components/PantryInventory";
import {
  AlertCircle, CalendarRange, Check, Clock, CookingPot, Loader2, Sparkles, Download, RefreshCw, Utensils, Wallet, Timer, Leaf,
} from "lucide-react";

type Duration = "1day" | "3day" | "1week" | "2week" | "1month";

interface Props {
  profile: Profile;
}

export function MealPlanPage({ profile }: Props) {
  const { t, lang } = useI18n();
  const { pantry, spices, quantityTracking, cookRecipe: deductInventory } = useInventory();
  const [duration, setDuration] = useState<Duration>("3day");
  const [budget, setBudget] = useState("any");
  const [cookTime, setCookTime] = useState("any");
  const [plan, setPlan] = useState<MealPlanDay[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<{ dayIndex: number; slot: string } | null>(null);

  const dietary: string[] = [
    ...profile.lifestyle,
    ...profile.allergies.map((a) => `no ${a}`),
  ];

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setPlan(null);
    setSaved(false);
    try {
      const settings: MealPlanSettings = { budget, cook_time: cookTime, dietary };
      const res = await generateMealPlan({
        profile,
        pantry,
        spices,
        duration,
        settings,
        language: lang,
      });
      setPlan(res.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Meal plan generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const regenerateMeal = async (dayIndex: number, slot: string) => {
    if (!plan) return;
    setRegenerating({ dayIndex, slot });
    setError(null);
    try {
      const settings: MealPlanSettings = { budget, cook_time: cookTime, dietary };
      const res = await generateMealPlan({
        profile,
        pantry,
        spices,
        duration,
        settings,
        language: lang,
        regenerate: { dayIndex, mealSlot: slot },
        existingPlan: plan,
      });
      setPlan(res.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed.");
    } finally {
      setRegenerating(null);
    }
  };

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      await saveMealPlan(duration, { budget, cook_time: cookTime, dietary }, plan);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save plan.");
    } finally {
      setSaving(false);
    }
  };

  const exportPlan = () => {
    if (!plan) return;
    const lines: string[] = [`${t("mealPlanTitle")} — ${durationLabel(duration)}`, ""];
    plan.forEach((day, di) => {
      lines.push(`${t("day")} ${di + 1} — ${day.date ?? ""}`);
      lines.push(`  ${t("breakfastLabel")}: ${day.breakfast?.title ?? "—"}`);
      lines.push(`  ${t("lunchLabel")}: ${day.lunch?.title ?? "—"}`);
      lines.push(`  ${t("dinnerLabel")}: ${day.dinner?.title ?? "—"}`);
      lines.push(`  ${t("snacksLabel")}: ${day.snacks?.title ?? "—"}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comfymeal-plan-${duration}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  function durationLabel(d: Duration): string {
    switch (d) {
      case "1day": return t("oneDay");
      case "3day": return t("threeDays");
      case "1week": return t("oneWeek");
      case "2week": return t("twoWeeks");
      case "1month": return t("oneMonth");
    }
  }

  return (
    <div className="px-5 sm:px-8 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <CalendarRange className="h-6 w-6 text-sage-700" />
          <h1 className="font-serif text-3xl sm:text-4xl text-charcoal-900">{t("mealPlanTitle")}</h1>
        </div>
        <p className="muted">{t("mealPlanSubtitle")}</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Settings */}
      <section className="card p-5 sm:p-6 mb-6">
        <div className="space-y-5">
          <div>
            <div className="label mb-2">{t("planDuration")}</div>
            <div className="flex flex-wrap gap-2">
              {(["1day", "3day", "1week", "2week", "1month"] as Duration[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`chip ${duration === d ? "chip-on" : "chip-off"}`}
                >
                  {durationLabel(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <div className="label mb-2 flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> {t("budgetPref")}</div>
              <div className="flex flex-wrap gap-2">
                <OptionChip value="any" current={budget} set={setBudget} label={t("budgetAny")} />
                <OptionChip value="low" current={budget} set={setBudget} label={t("budgetLow")} />
                <OptionChip value="mid" current={budget} set={setBudget} label={t("budgetMid")} />
                <OptionChip value="high" current={budget} set={setBudget} label={t("budgetHigh")} />
              </div>
            </div>
            <div>
              <div className="label mb-2 flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> {t("cookTimePref")}</div>
              <div className="flex flex-wrap gap-2">
                <OptionChip value="any" current={cookTime} set={setCookTime} label={t("cookTimeAny")} />
                <OptionChip value="quick" current={cookTime} set={setCookTime} label={t("cookTimeQuick")} />
                <OptionChip value="standard" current={cookTime} set={setCookTime} label={t("cookTimeStandard")} />
                <OptionChip value="leisurely" current={cookTime} set={setCookTime} label={t("cookTimeLeisurely")} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-cream-100/60 border border-cream-200/70 px-4 py-3">
            <div className="text-sm font-medium text-charcoal-900 mb-1 flex items-center gap-1.5">
              <Leaf className="h-3.5 w-3.5 text-sage-600" /> {t("dietaryPrefs")}
            </div>
            <p className="text-xs muted">{t("dietaryPrefsSub")}: {dietary.length ? dietary.join(", ") : "—"}</p>
          </div>

          {/* Pantry + Spices management */}
          <PantryInventory compact />

          <button type="button" onClick={generate} disabled={generating} className="btn-clay w-full text-base py-3.5">
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {generating ? t("generatingPlan") : t("generatePlan")}
          </button>
        </div>
      </section>

      {/* Plan display */}
      {plan && plan.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} disabled={saving || saved} className="btn-secondary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4 text-sage-700" /> : <CalendarRange className="h-4 w-4" />}
            {saved ? t("planSaved") : t("savePlan")}
          </button>
          <button type="button" onClick={exportPlan} className="btn-ghost">
            <Download className="h-4 w-4" /> {t("exportPlan")}
          </button>
        </div>
      )}

      {plan && plan.length > 0 && (
        <div className="space-y-5">
          {plan.map((day, di) => (
            <section key={di} className="card p-5 sm:p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-sage-100 text-sage-700 text-sm font-semibold">{di + 1}</span>
                <h2 className="font-serif text-xl text-charcoal-900">{t("day")} {di + 1}</h2>
                <span className="text-xs muted ml-1">{day.date}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <MealSlot day={day} slot="breakfast" label={t("breakfastLabel")} regenerating={regenerating} dayIndex={di} onRegenerate={regenerateMeal} pantry={pantry} spices={spices} profile={profile} lang={lang} quantityTracking={quantityTracking} onCook={deductInventory} />
                <MealSlot day={day} slot="lunch" label={t("lunchLabel")} regenerating={regenerating} dayIndex={di} onRegenerate={regenerateMeal} pantry={pantry} spices={spices} profile={profile} lang={lang} quantityTracking={quantityTracking} onCook={deductInventory} />
                <MealSlot day={day} slot="dinner" label={t("dinnerLabel")} regenerating={regenerating} dayIndex={di} onRegenerate={regenerateMeal} pantry={pantry} spices={spices} profile={profile} lang={lang} quantityTracking={quantityTracking} onCook={deductInventory} />
                <MealSlot day={day} slot="snacks" label={t("snacksLabel")} regenerating={regenerating} dayIndex={di} onRegenerate={regenerateMeal} pantry={pantry} spices={spices} profile={profile} lang={lang} quantityTracking={quantityTracking} onCook={deductInventory} />
              </div>
            </section>
          ))}
        </div>
      )}

      {!plan && !generating && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-cream-300">
          <CalendarRange className="h-10 w-10 text-sage-400 mx-auto mb-3" />
          <h3 className="font-serif text-xl mb-1">{t("noPlanYet")}</h3>
          <p className="muted text-sm mb-5">{t("noPlanYetDesc")}</p>
        </div>
      )}
    </div>
  );
}

function OptionChip({ value, current, set, label }: { value: string; current: string; set: (v: string) => void; label: string }) {
  return (
    <button type="button" onClick={() => set(value)} className={`chip ${current === value ? "chip-on" : "chip-off"}`}>
      {label}
    </button>
  );
}

function MealSlot({
  day, slot, label, regenerating, dayIndex, onRegenerate, pantry, spices, profile, lang, quantityTracking, onCook,
}: {
  day: MealPlanDay;
  slot: "breakfast" | "lunch" | "dinner" | "snacks";
  label: string;
  regenerating: { dayIndex: number; slot: string } | null;
  dayIndex: number;
  onRegenerate: (dayIndex: number, slot: string) => void;
  pantry: PantryItem[];
  spices: SpiceItem[];
  profile: Profile;
  lang: string;
  quantityTracking: boolean;
  onCook: (ingredientDetails: import("../lib/supabase").IngredientDetail[]) => Promise<void>;
}) {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [cooked, setCooked] = useState(false);

  // Safely get recipe with fallback
  const recipe: Recipe = day?.[slot] ?? {
    title: t("recipeUnavailable"),
    description: "",
    time_minutes: 30,
    servings: 1,
    ingredients: [],
    steps: [],
    tags: [],
  };

  const isRegen = regenerating?.dayIndex === dayIndex && regenerating?.slot === slot;
  const hasValidData = recipe?.title && recipe.title !== t("recipeUnavailable");

  return (
    <>
      <button
        type="button"
        onClick={() => hasValidData && setShowModal(true)}
        className={`w-full text-left rounded-xl border p-4 transition group ${
          hasValidData
            ? "bg-cream-100/50 border-cream-200/70 hover:bg-cream-100/80 hover:border-cream-300"
            : "bg-clay-50/50 border-clay-200/50 cursor-not-allowed"
        }`}
        disabled={!hasValidData}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-sage-700">{label}</div>
          {hasValidData && (
            <div className="flex items-center gap-1">
              {quantityTracking && recipe.ingredient_details?.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCooking(true);
                    onCook(recipe.ingredient_details).finally(() => {
                      setCooking(false);
                      setCooked(true);
                      setTimeout(() => setCooked(false), 2000);
                    });
                  }}
                  disabled={cooking || cooked}
                  className="h-7 w-7 inline-flex items-center justify-center rounded-full text-charcoal-700/50 hover:text-clay-700 hover:bg-clay-50 transition disabled:opacity-40"
                  aria-label="Cook and deduct"
                  title="Cook — deduct ingredients from pantry"
                >
                  {cooking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : cooked ? <Check className="h-3.5 w-3.5 text-sage-700" /> : <CookingPot className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRegenerate(dayIndex, slot); }}
                disabled={regenerating !== null}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full text-charcoal-700/50 hover:text-sage-700 hover:bg-sage-50 transition disabled:opacity-40"
                aria-label="Regenerate meal"
              >
                {isRegen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
        {hasValidData ? (
          <>
            <div className="font-medium text-charcoal-900 text-sm mb-1 group-hover:text-sage-700 transition">{recipe.title}</div>
            <p className="text-xs text-charcoal-700 leading-relaxed line-clamp-2 mb-2">{recipe.description}</p>
            <div className="flex items-center gap-3 text-xs muted">
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.time_minutes}m</span>
              <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{recipe.servings}</span>
              {recipe.nutrition?.calories != null && <span>{recipe.nutrition.calories} kcal</span>}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-clay-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{t("recipeDataMissing")}</span>
          </div>
        )}
      </button>

      {showModal && hasValidData && (
        <RecipeDetailModal
          recipe={recipe}
          pantry={pantry}
          spices={spices}
          onClose={() => setShowModal(false)}
          onRegenerate={() => { setShowModal(false); onRegenerate(dayIndex, slot); }}
          regenerating={isRegen}
          mealSlot={label}
          profile={profile}
          flex={{ stock_level: "average", cook_capacity: "standard", meal_type: slot, comfort_score: 50 }}
          language={lang}
          onCook={quantityTracking && recipe.ingredient_details?.length ? () => onCook(recipe.ingredient_details) : undefined}
        />
      )}
    </>
  );
}
