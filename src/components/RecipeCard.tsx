import { useState } from "react";
import type { PantryFlag, PantryItem, Profile, Recipe, SpiceItem } from "../lib/supabase";
import { saveRecipe } from "../lib/api";
import { filterGenuinelyMissing } from "../lib/ingredientMatch";
import { useI18n } from "../lib/i18n";
import { RecipeImage } from "./RecipeImage";
import { NutritionChart } from "./NutritionChart";
import {
  Bookmark, Check, Clock, CookingPot, Flame, Leaf, Loader2, Microwave, Pencil,
  Soup, Utensils, Wind, AlertCircle,
} from "lucide-react";

export interface RecipeCardProps {
  recipe: Recipe;
  pantryFlags: PantryFlag[];
  useSoonNames: Set<string>;
  adjusting: string | null;
  onAdjust: (label: string, instruction: string) => void;
  onCook?: () => void;
  cooking?: boolean;
  profile: Profile;
  index: number;
  pantry: PantryItem[];
  spices?: SpiceItem[];
}

/** Parse an ingredient string into { name, quantity } parts. */
function parseIngredient(ing: string): { quantity: string; name: string } {
  const match = ing.match(/^(\d+(?:[./]\d+)?\s*(?:cups?|cup|tbsp|tsp|oz|g|kg|ml|l|lbs?|lb|cloves?|cloves|slices?|pieces?|medium|small|large|bunch|handful|pinch|dash|cans?|jars?|packs?|packets?|sticks?)?\b)\s*(.*)$/i);
  if (match) {
    return { quantity: match[1].trim(), name: match[2].trim() || ing };
  }
  return { quantity: "", name: ing };
}

export function RecipeCard({ recipe, pantryFlags, useSoonNames, adjusting, onAdjust, onCook, cooking, profile, index, pantry, spices }: RecipeCardProps) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(recipe.ingredients);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveRecipe({ ...recipe, ingredients });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save recipe.");
    } finally {
      setSaving(false);
    }
  };

  const useSoonList = pantryFlags.filter((p) => p.use_soon);

  const ADJUSTMENTS = [
    { label: t("makeVegetarian"), instruction: "Make this recipe fully vegetarian (no meat, poultry, or fish). Keep the flavor profile and overall structure similar.", icon: <Leaf className="h-4 w-4" /> },
    { label: t("makeMilder"), instruction: "Make this recipe noticeably milder — reduce chili/heat and strong spices while keeping the dish recognizable.", icon: <Leaf className="h-4 w-4" /> },
    { label: t("makeSpicier"), instruction: "Make this recipe noticeably spicier — add heat via chili, hot sauce, or spices, while keeping the dish recognizable.", icon: <Flame className="h-4 w-4" /> },
    { label: t("turnIntoSoup"), instruction: "Reimagine this dish as a soup — keep the core flavors but adapt it into a comforting bowl with broth.", icon: <Soup className="h-4 w-4" /> },
    { label: t("turnIntoSalad"), instruction: "Reimagine this dish as a salad — keep the core flavors but make it a fresh, leaf- or grain-based salad.", icon: <Leaf className="h-4 w-4" /> },
    { label: t("airFryer"), instruction: "Adapt this recipe for an air-fryer where it makes sense — adjust technique, time, and temperature accordingly.", icon: <Wind className="h-4 w-4" /> },
    { label: t("stovetopShortcut"), instruction: "Give me a faster stovetop-only version of this recipe — fewer steps, less time, same core flavors.", icon: <Microwave className="h-4 w-4" /> },
  ];

  const updateIngredient = (i: number, value: string) => {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? value : ing));
  };

  return (
    <div className="card p-0 overflow-hidden animate-pop">
      {/* Food photo */}
      <div className="p-4 sm:p-5 pb-0">
        <RecipeImage title={recipe.title} description={recipe.description} cuisine={profile.cuisines[0]} mealType={pantry.length > 0 ? undefined : undefined} ingredients={recipe.ingredients} />
      </div>

      <div className="p-6 sm:p-8 pt-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">
                {index + 1}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-charcoal-900 text-balance">{recipe.title}</h2>
            {recipe.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {recipe.tags.slice(0, 6).map((tag, i) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-sage-100 text-sage-800 text-xs font-medium px-2.5 py-1">{tag}</span>
                ))}
              </div>
            )}
          </div>
          {/* Save button */}
          <div className="flex items-center gap-2 shrink-0">
            {onCook && (
              <button
                type="button"
                onClick={onCook}
                disabled={cooking || !recipe.ingredient_details?.length}
                className="btn-clay"
                title={recipe.ingredient_details?.length ? "Deduct ingredients from pantry" : "No structured ingredient data"}
              >
                {cooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CookingPot className="h-4 w-4" />}
                Cook
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className="btn-secondary"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4 text-sage-700" /> : <Bookmark className="h-4 w-4" />}
              {saved ? t("saved") : t("save")}
            </button>
          </div>
        </div>

        <p className="text-charcoal-700 mt-3 leading-relaxed">{recipe.description}</p>

        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-charcoal-700">
            <Clock className="h-4 w-4 text-sage-600" /> {recipe.time_minutes} {t("min")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-charcoal-700">
            <Utensils className="h-4 w-4 text-sage-600" /> {t("serves")} {recipe.servings}
          </span>
          <span className="inline-flex items-center gap-1.5 text-charcoal-700">
            <Leaf className="h-4 w-4 text-sage-600" /> {profile.lifestyle.length ? profile.lifestyle.join(", ") : "flexible"}
          </span>
        </div>

        {useSoonList.length > 0 && (
          <div className="mt-4 rounded-xl bg-clay-50 border border-clay-200 px-4 py-3 animate-fade-in">
            <div className="flex items-center gap-2 text-clay-700 text-sm font-medium mb-1">
              <Flame className="h-4 w-4" /> {t("useSoonInRecipe")}
            </div>
            <p className="text-sm text-clay-700/90">
              {useSoonList.map((p) => p.name).join(", ")} {t("useSoonDesc")}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="font-serif text-lg mb-3">{t("ingredients")}</h3>
            <ul className="space-y-2">
              {ingredients.map((ing, i) => {
                const isUseSoon = Array.from(useSoonNames).some((n) => ing.toLowerCase().includes(n.toLowerCase()));
                const { quantity, name } = parseIngredient(ing);
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-charcoal-700">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${isUseSoon ? "bg-clay-500" : "bg-sage-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={quantity}
                          onChange={(e) => {
                            const newName = parseIngredient(ing).name;
                            updateIngredient(i, e.target.value ? `${e.target.value} ${newName}` : newName);
                          }}
                          placeholder="—"
                          aria-label={t("editQuantity")}
                          className="w-20 rounded-md border border-cream-300 bg-cream-50/50 px-2 py-0.5 text-xs text-charcoal-900 focus:outline-none focus:border-sage-400 focus:bg-cream-50 transition"
                        />
                        <span className={isUseSoon ? "text-charcoal-900 font-medium" : ""}>{name}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="font-serif text-lg mb-3">{t("steps")}</h3>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-charcoal-700">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold shrink-0">{i + 1}</span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {recipe.nutrition && (
          <div className="mt-6">
            <NutritionChart nutrition={recipe.nutrition} servings={recipe.servings} />
          </div>
        )}

        {(() => {
          const genuinelyMissing = filterGenuinelyMissing(recipe.missing_ingredients ?? [], pantry, spices ?? []);
          if (genuinelyMissing.length === 0) return null;
          return (
            <div className="mt-4 rounded-xl bg-clay-50/60 border border-clay-200/70 px-4 py-3">
              <div className="flex items-center gap-2 text-clay-700 text-sm font-medium mb-1">
                <AlertCircle className="h-4 w-4" /> Optional / Missing Ingredients
              </div>
              <p className="text-sm text-clay-700/90">
                {genuinelyMissing.map((m) => `${m.quantity} ${m.unit} ${m.name}`).join(", ")}
              </p>
            </div>
          );
        })()}

        {saveError && (
          <div className="mt-4 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{saveError}</span>
          </div>
        )}

        <div className="mt-7 pt-6 border-t border-cream-200">
          <h3 className="font-serif text-lg mb-1">{t("microAdjustments")}</h3>
          <p className="muted text-sm mb-4">{t("microAdjustmentsSub")}</p>
          <div className="flex flex-wrap gap-2">
            {ADJUSTMENTS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => onAdjust(a.label, a.instruction)}
                disabled={adjusting !== null}
                className="chip chip-off"
              >
                {adjusting === a.label ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.icon}
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCustomOpen((o) => !o)}
              disabled={adjusting !== null}
              className={`chip ${customOpen ? "chip-on" : "chip-off"}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("addYourOwn")}
            </button>
          </div>
          {customOpen && (
            <div className="mt-3 flex gap-2 animate-fade-in">
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t("addYourOwnPlaceholder")}
                className="input"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customText.trim() && !adjusting) {
                    onAdjust(t("addYourOwn"), customText.trim());
                    setCustomText("");
                    setCustomOpen(false);
                  }
                }}
              />
              <button
                type="button"
                disabled={!customText.trim() || adjusting !== null}
                onClick={() => {
                  onAdjust(t("addYourOwn"), customText.trim());
                  setCustomText("");
                  setCustomOpen(false);
                }}
                className="btn-primary shrink-0"
              >
                {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t("apply")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
