import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../lib/i18n";
import { useInventory } from "../lib/inventory";
import {
  addPantryItemsWithDate, adjustRecipe, fetchLatestSession,
  fetchNutritionHistory, generateRecipe, saveSession, addNutritionHistory,
} from "../lib/api";
import type { FlexSession, NutritionHistoryEntry, PantryFlag, Profile, Recipe } from "../lib/supabase";
import { RecipeCard } from "../components/RecipeCard";
import { ReceiptOCR } from "../components/ReceiptOCR";
import { ChipSelector } from "../components/ChipSelector";
import { PantryInventory } from "../components/PantryInventory";
import {
  AlertCircle, Clock, CookingPot, Flame, Loader2, Refrigerator, Sparkles,
  Utensils, Zap, History, Leaf,
} from "lucide-react";
import { useNav, type PendingAction } from "../lib/nav";

type StockLevel = "empty" | "average" | "full";
type CookCapacity = "quick" | "standard" | "proper";

interface FlexState {
  stock_level: StockLevel;
  cook_capacity: CookCapacity;
  meal_type: string;
  comfort_score: number;
}

const DEFAULT_FLEX: FlexState = {
  stock_level: "average",
  cook_capacity: "standard",
  meal_type: "dinner",
  comfort_score: 50,
};

interface Props {
  profile: Profile;
  pendingAction?: PendingAction;
  onConsumeAction?: () => void;
}

export function GeneratePage({ profile, pendingAction, onConsumeAction }: Props) {
  const { t, lang } = useI18n();
  const { pantry, spices, quantityTracking, cookRecipe: deductInventory, refresh } = useInventory();
  const [flex, setFlex] = useState<FlexState>(DEFAULT_FLEX);
  const [lastSession, setLastSession] = useState<FlexSession | null>(null);
  const [recentHistory, setRecentHistory] = useState<NutritionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryFlags, setPantryFlags] = useState<PantryFlag[]>([]);
  const [adjusting, setAdjusting] = useState<{ index: number; label: string } | null>(null);
  const [cookingIndex, setCookingIndex] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [last, history] = await Promise.all([
          fetchLatestSession(),
          fetchNutritionHistory(30),
        ]);
        if (!mounted) return;
        setLastSession(last);
        setRecentHistory(history);
        if (last) {
          setFlex({
            stock_level: last.stock_level as StockLevel,
            cook_capacity: last.cook_capacity as CookCapacity,
            meal_type: last.meal_type as string,
            comfort_score: last.comfort_score,
          });
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load your session.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (pendingAction === "same-as-yesterday" && lastSession && !generating) {
      sameAsYesterday();
      onConsumeAction?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, lastSession]);

  const useSoonNames = useMemo(() => new Set(pantryFlags.filter((p) => p.use_soon).map((p) => p.name)), [pantryFlags]);

  const onReceiptConfirm = async (names: string[], loggedAt: string) => {
    await addPantryItemsWithDate(names, loggedAt);
    await refresh();
  };

  const sameAsYesterday = () => {
    if (!lastSession || generating) return;
    const restored: FlexState = {
      stock_level: lastSession.stock_level as StockLevel,
      cook_capacity: lastSession.cook_capacity as CookCapacity,
      meal_type: lastSession.meal_type as string,
      comfort_score: lastSession.comfort_score,
    };
    setFlex(restored);
    void generate(restored);
  };

  const generate = async (override?: FlexState) => {
    const active = override ?? flex;
    setGenerating(true);
    setError(null);
    setRecipes([]);
    setPantryFlags([]);
    try {
      const res = await generateRecipe({
        profile,
        pantry,
        spices,
        flex: { ...active, comfort_score: active.comfort_score },
        tier: "standard",
        language: lang,
        recentRecipes: recentHistory.map((h) => ({
          title: h.recipe_title,
          tags: h.recipe_data?.tags ?? [],
          generated_at: h.generated_at,
        })),
      });
      setRecipes(res.recipes);
      setPantryFlags(res.pantry_flags);
      await Promise.all(res.recipes.map((r) => addNutritionHistory(r, active.meal_type)));
      await saveSession({
        stock_level: active.stock_level,
        cook_capacity: active.cook_capacity,
        meal_type: active.meal_type,
        comfort_score: active.comfort_score,
        pantry_snapshot: pantry.map((p) => p.name),
      });
      const [last, history] = await Promise.all([fetchLatestSession(), fetchNutritionHistory(30)]);
      setLastSession(last);
      setRecentHistory(history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recipe generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const adjust = async (index: number, label: string, instruction: string) => {
    const recipe = recipes[index];
    if (!recipe) return;
    setAdjusting({ index, label });
    setError(null);
    try {
      const res = await adjustRecipe({
        profile,
        pantry,
        spices,
        flex,
        tier: "standard",
        language: lang,
        adjustment: instruction,
        previousRecipe: recipe,
      });
      setRecipes((prev) => prev.map((r, i) => i === index ? res.recipes[0] : r));
      setPantryFlags(res.pantry_flags);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed.");
    } finally {
      setAdjusting(null);
    }
  };

  const handleCook = async (index: number) => {
    const recipe = recipes[index];
    if (!recipe || !recipe.ingredient_details || recipe.ingredient_details.length === 0) {
      setError("This recipe doesn't have structured ingredient data to deduct from the pantry.");
      return;
    }
    setCookingIndex(index);
    setError(null);
    try {
      if (quantityTracking) {
        await deductInventory(recipe.ingredient_details);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update pantry after cooking.");
    } finally {
      setCookingIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-charcoal-900">{t("flexEngineTitle")}</h1>
        <p className="muted mt-2 text-balance">{t("flexEngineSub")}</p>
      </div>

      {lastSession && (
        <button
          type="button"
          onClick={sameAsYesterday}
          disabled={generating}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-sage-100 text-sage-800 px-4 py-2 text-sm font-medium hover:bg-sage-200 transition active:scale-[0.98] disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
          {generating ? t("generating") : t("sameAsYesterday")}
        </button>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pantry + Spices */}
        <div className="space-y-5">
          <PantryInventory compact />
          <div className="card p-5 sm:p-6">
            <div className="mb-3">
              <div className="label mb-2">Scan Receipt</div>
              <ReceiptOCR onConfirm={onReceiptConfirm} />
            </div>
          </div>
        </div>

        {/* Context controls */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CookingPot className="h-5 w-5 text-sage-700" />
            <h2 className="font-serif text-xl">{t("contextTitle")}</h2>
          </div>
          <div className="space-y-5">
            <Field label={t("stockLevel")}>
              <Segmented
                options={[
                  { value: "empty", label: t("empty"), icon: <Refrigerator className="h-4 w-4" /> },
                  { value: "average", label: t("average"), icon: <Leaf className="h-4 w-4" /> },
                  { value: "full", label: t("fullyStocked"), icon: <Utensils className="h-4 w-4" /> },
                ]}
                value={flex.stock_level}
                onChange={(v) => setFlex({ ...flex, stock_level: v as StockLevel })}
              />
            </Field>
            <Field label={t("cookCapacity")}>
              <Segmented
                options={[
                  { value: "quick", label: t("quickEasy"), icon: <Zap className="h-4 w-4" /> },
                  { value: "standard", label: t("standard"), icon: <Clock className="h-4 w-4" /> },
                  { value: "proper", label: t("cookProperly"), icon: <CookingPot className="h-4 w-4" /> },
                ]}
                value={flex.cook_capacity}
                onChange={(v) => setFlex({ ...flex, cook_capacity: v as CookCapacity })}
              />
            </Field>
            <Field label={t("mealType")}>
              <ChipSelector
                category="meal_type"
                selected={[flex.meal_type]}
                onChange={(next) => {
                  if (next.length > 0) setFlex({ ...flex, meal_type: next[next.length - 1] });
                }}
                color="sage"
                placeholder={t("addYourOwn")}
              />
            </Field>
            <Field label={`${t("comfortAdventurous")} · ${flex.comfort_score}`}>
              <div className="pt-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={flex.comfort_score}
                  onChange={(e) => setFlex({ ...flex, comfort_score: Number(e.target.value) })}
                  className="w-full accent-sage-600"
                />
                <div className="flex justify-between text-xs muted mt-1">
                  <span>{t("comfortFood")}</span>
                  <span>{t("balanced")}</span>
                  <span>{t("adventurous")}</span>
                </div>
              </div>
            </Field>
          </div>
        </section>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={() => generate()} disabled={generating} className="btn-clay text-base px-7 py-3.5">
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {generating ? t("generating") : t("generate")}
        </button>
      </div>

      {recipes.length > 0 && (
        <div className="mt-8 space-y-6">
          {recipes.map((recipe, i) => (
            <RecipeCard
              key={i}
              recipe={recipe}
              pantryFlags={pantryFlags}
              useSoonNames={useSoonNames}
              adjusting={adjusting?.index === i ? adjusting.label : null}
              onAdjust={(label, instruction) => adjust(i, label, instruction)}
              onCook={() => handleCook(i)}
              cooking={cookingIndex === i}
              profile={profile}
              index={i}
              pantry={pantry}
              spices={spices}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="label">{label}</div>{children}</div>;
}

function Segmented({ options, value, onChange }: { options: { value: string; label: string; icon?: React.ReactNode }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} className={`chip ${on ? "chip-on" : "chip-off"}`}>
            {opt.icon}{opt.label}
          </button>
        );
      })}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
