import { useState } from "react";
import type { PantryItem, Profile, Recipe, SpiceItem } from "../lib/supabase";
import { saveRecipe, adjustRecipe } from "../lib/api";
import { isIngredientAvailable } from "../lib/ingredientMatch";
import { useI18n } from "../lib/i18n";
import { CompactRecipeImage } from "./RecipeImage";
import { NutritionChart } from "./NutritionChart";
import {
  Bookmark, Check, Clock, CookingPot, Flame, Leaf, Loader2, X, Utensils, Users, RefreshCw,
  ShoppingCart, Plus, AlertCircle, Microwave, Pencil, Soup, Wind,
} from "lucide-react";

interface Props {
  recipe: Recipe | null | undefined;
  pantry: PantryItem[] | null | undefined;
  spices?: SpiceItem[] | null | undefined;
  onClose: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  mealSlot?: string;
  profile?: Profile;
  flex?: { stock_level: string; cook_capacity: string; meal_type: string; comfort_score: number };
  language?: string;
  onCook?: () => void;
}

/** Parse an ingredient string into { name, quantity } parts. */
function parseIngredient(ing: string): { quantity: string; name: string } {
  const match = ing.match(/^(\d+(?:[./]\d+)?\s*(?:cups?|cup|tbsp|tsp|oz|g|kg|ml|l|lbs?|lb|cloves?|cloves|slices?|pieces?|medium|small|large|bunch|handful|pinch|dash|cans?|jars?|packs?|packets?|sticks?)?\b)\s*(.*)$/i);
  if (match) {
    return { quantity: match[1].trim(), name: match[2].trim() || ing };
  }
  return { quantity: "", name: ing };
}

export function RecipeDetailModal({ recipe, pantry, spices, onClose, onRegenerate, regenerating, mealSlot, profile, flex, language, onCook }: Props) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [addedToShopping, setAddedToShopping] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>(recipe?.ingredients ?? []);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [cooking, setCooking] = useState(false);
  const [cooked, setCooked] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [adjustedRecipe, setAdjustedRecipe] = useState<Recipe | null>(null);

  const activeRecipe = adjustedRecipe ?? recipe;

  if (!recipe) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div
          className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center animate-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle className="h-12 w-12 text-clay-500 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-charcoal-900 mb-2">{t("recipeUnavailable")}</h2>
          <p className="text-charcoal-700 text-sm mb-4">{t("recipeUnavailableDesc")}</p>
          <button type="button" onClick={onClose} className="btn-primary">
            {t("close")}
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRecipe({ ...safeRecipe, ingredients });
      setSaved(true);
    } catch {
      // Silently fail for now
    } finally {
      setSaving(false);
    }
  };

  const safeRecipe = {
    title: activeRecipe?.title ?? "Untitled Recipe",
    description: activeRecipe?.description ?? "",
    time_minutes: activeRecipe?.time_minutes ?? 30,
    servings: activeRecipe?.servings ?? 1,
    ingredients: Array.isArray(activeRecipe?.ingredients) ? activeRecipe.ingredients : [],
    steps: Array.isArray(activeRecipe?.steps) ? activeRecipe.steps : [],
    tags: Array.isArray(activeRecipe?.tags) ? activeRecipe.tags : [],
    nutrition: activeRecipe?.nutrition ?? undefined,
  };

  const safePantry = Array.isArray(pantry) ? pantry : [];
  const safeSpices = Array.isArray(spices) ? spices : [];
  const ingredientStatus = safeRecipe.ingredients.map((ing) => ({
    ingredient: ing,
    available: isIngredientAvailable(ing, safePantry, safeSpices),
  }));

  const availableCount = ingredientStatus.filter((i) => i.available).length;
  const missingIngredients = ingredientStatus.filter((i) => !i.available).map((i) => i.ingredient);

  const toggleShoppingItem = (item: string) => {
    setShoppingList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addAllToShoppingList = () => {
    setShoppingList(missingIngredients);
    setAddedToShopping(true);
    setTimeout(() => setAddedToShopping(false), 2000);
  };

  const getDifficulty = () => {
    if (safeRecipe.steps.length <= 5 && safeRecipe.time_minutes <= 20) return t("difficultyEasy");
    if (safeRecipe.steps.length <= 10 && safeRecipe.time_minutes <= 45) return t("difficultyMedium");
    return t("difficultyHard");
  };

  const prepTime = Math.round(safeRecipe.time_minutes * 0.4);
  const cookTime = Math.round(safeRecipe.time_minutes * 0.6);

  const updateIngredient = (i: number, value: string) => {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? value : ing));
  };

  const handleAdjust = async (label: string, instruction: string) => {
    if (!profile || !flex) return;
    setAdjusting(label);
    try {
      const res = await adjustRecipe({
        profile,
        pantry: safePantry,
        flex,
        tier: "standard",
        language: language ?? "en",
        adjustment: instruction,
        previousRecipe: safeRecipe,
      });
      if (res.recipes[0]) {
        setAdjustedRecipe(res.recipes[0]);
        setIngredients(res.recipes[0].ingredients);
      }
    } catch {
      // silently fail
    } finally {
      setAdjusting(null);
    }
  };

  const ADJUSTMENTS = [
    { label: t("makeVegetarian"), instruction: "Make this recipe fully vegetarian (no meat, poultry, or fish). Keep the flavor profile and overall structure similar.", icon: <Leaf className="h-4 w-4" /> },
    { label: t("makeMilder"), instruction: "Make this recipe noticeably milder — reduce chili/heat and strong spices while keeping the dish recognizable.", icon: <Leaf className="h-4 w-4" /> },
    { label: t("makeSpicier"), instruction: "Make this recipe noticeably spicier — add heat via chili, hot sauce, or spices, while keeping the dish recognizable.", icon: <Flame className="h-4 w-4" /> },
    { label: t("turnIntoSoup"), instruction: "Reimagine this dish as a soup — keep the core flavors but adapt it into a comforting bowl with broth.", icon: <Soup className="h-4 w-4" /> },
    { label: t("turnIntoSalad"), instruction: "Reimagine this dish as a salad — keep the core flavors but make it a fresh, leaf- or grain-based salad.", icon: <Leaf className="h-4 w-4" /> },
    { label: t("airFryer"), instruction: "Adapt this recipe for an air-fryer where it makes sense — adjust technique, time, and temperature accordingly.", icon: <Wind className="h-4 w-4" /> },
    { label: t("stovetopShortcut"), instruction: "Give me a faster stovetop-only version of this recipe — fewer steps, less time, same core flavors.", icon: <Microwave className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — compact image banner */}
        <div className="relative shrink-0">
          <div className="px-4 sm:px-6 pt-4 pb-3">
            <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden bg-cream-100 border border-cream-200">
              <CompactRecipeImage title={safeRecipe.title} cuisine={profile?.cuisines[0]} mealType={mealSlot} ingredients={safeRecipe.ingredients} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 h-8 w-8 inline-flex items-center justify-center rounded-full bg-charcoal-900/40 text-cream-50 hover:bg-charcoal-900/60 transition"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
          {mealSlot && (
            <div className="absolute top-6 left-6 px-2.5 py-1 rounded-full bg-sage-600 text-cream-50 text-xs font-semibold uppercase tracking-wide">
              {mealSlot}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0">
          <div className="mb-4">
            <h2 className="font-serif text-2xl sm:text-3xl text-charcoal-900">{safeRecipe.title}</h2>
            {safeRecipe.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {safeRecipe.tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-sage-100 text-sage-800 text-xs font-medium px-2.5 py-1">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <p className="text-charcoal-700 leading-relaxed mb-5">{safeRecipe.description}</p>

          {/* Time and servings grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="rounded-xl bg-cream-100/70 border border-cream-200 px-3 py-2.5 text-center">
              <div className="text-xs text-charcoal-700/70 mb-0.5">{t("prepTime")}</div>
              <div className="font-semibold text-charcoal-900">{prepTime} {t("min")}</div>
            </div>
            <div className="rounded-xl bg-cream-100/70 border border-cream-200 px-3 py-2.5 text-center">
              <div className="text-xs text-charcoal-700/70 mb-0.5">{t("cookTimeLabel")}</div>
              <div className="font-semibold text-charcoal-900">{cookTime} {t("min")}</div>
            </div>
            <div className="rounded-xl bg-cream-100/70 border border-cream-200 px-3 py-2.5 text-center">
              <div className="text-xs text-charcoal-700/70 mb-0.5">{t("totalTime")}</div>
              <div className="font-semibold text-charcoal-900">{safeRecipe.time_minutes} {t("min")}</div>
            </div>
            <div className="rounded-xl bg-cream-100/70 border border-cream-200 px-3 py-2.5 text-center">
              <div className="text-xs text-charcoal-700/70 mb-0.5">{t("servings")}</div>
              <div className="font-semibold text-charcoal-900">{safeRecipe.servings}</div>
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-2 text-sm text-charcoal-700">
              <Flame className="h-4 w-4 text-sage-600" />
              <span>{t("difficulty")}: <span className="font-medium text-charcoal-900">{getDifficulty()}</span></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-charcoal-700">
              <Users className="h-4 w-4 text-sage-600" />
              <span>{t("serves")} <span className="font-medium text-charcoal-900">{safeRecipe.servings}</span></span>
            </div>
          </div>

          {/* Pantry status */}
          <div className="rounded-xl bg-sage-50 border border-sage-200 px-4 py-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-sage-800">
                <Leaf className="h-4 w-4" />
                {t("pantryStatus")}
              </div>
              <span className="text-xs text-sage-700">{availableCount}/{safeRecipe.ingredients.length} {t("available")}</span>
            </div>
            <div className="h-2 rounded-full bg-sage-200 overflow-hidden">
              <div
                className="h-full bg-sage-500 rounded-full transition-all"
                style={{ width: `${safeRecipe.ingredients.length > 0 ? (availableCount / safeRecipe.ingredients.length) * 100 : 0}%` }}
              />
            </div>
            {missingIngredients.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-sage-700 mb-2">{t("missingIngredients")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {missingIngredients.map((ing, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-charcoal-900/5 text-charcoal-700 text-xs px-2 py-1">
                      {shoppingList.includes(ing) && <Check className="h-3 w-3 text-sage-600" />}
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ingredients with editable quantities */}
          <div className="mb-6">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
              <Utensils className="h-5 w-5 text-sage-600" />
              {t("ingredients")}
            </h3>
            {safeRecipe.ingredients.length > 0 ? (
              <ul className="space-y-2">
                {ingredientStatus.map((item, i) => {
                  const { quantity, name } = parseIngredient(item.ingredient);
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-3 p-2 rounded-lg transition ${
                        shoppingList.includes(item.ingredient)
                          ? "bg-sage-100 border border-sage-200"
                          : item.available
                          ? "bg-cream-50"
                          : "bg-charcoal-900/5"
                      }`}
                    >
                      {!item.available && !shoppingList.includes(item.ingredient) && (
                        <button type="button" onClick={() => toggleShoppingItem(item.ingredient)} className="shrink-0">
                          <Plus className="h-4 w-4 text-charcoal-700/50" />
                        </button>
                      )}
                      {!item.available && shoppingList.includes(item.ingredient) && (
                        <Check className="h-4 w-4 text-sage-600 shrink-0" />
                      )}
                      {item.available && (
                        <Check className="h-4 w-4 text-sage-600 shrink-0" />
                      )}
                      <input
                        type="text"
                        value={quantity}
                        onChange={(e) => {
                          const newName = parseIngredient(item.ingredient).name;
                          updateIngredient(i, e.target.value ? `${e.target.value} ${newName}` : newName);
                        }}
                        placeholder="—"
                        aria-label={t("editQuantity")}
                        className="w-20 rounded-md border border-cream-300 bg-cream-50/50 px-2 py-0.5 text-xs text-charcoal-900 focus:outline-none focus:border-sage-400 focus:bg-cream-50 transition"
                      />
                      <span className={`text-sm flex-1 ${item.available ? "text-charcoal-700" : "text-charcoal-900"}`}>
                        {name}
                      </span>
                      {item.available && (
                        <span className="text-xs text-sage-600">{t("inPantry")}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-charcoal-700/70 italic">{t("noIngredients")}</p>
            )}
          </div>

          {/* Steps */}
          <div className="mb-6">
            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-sage-600" />
              {t("instructions")}
            </h3>
            {safeRecipe.steps.length > 0 ? (
              <ol className="space-y-4">
                {safeRecipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-sage-100 text-sage-700 text-sm font-semibold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-charcoal-700 leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-charcoal-700/70 italic">{t("noInstructions")}</p>
            )}
          </div>

          {/* Nutrition */}
          {safeRecipe.nutrition && (
            <div className="mb-6">
              <NutritionChart nutrition={safeRecipe.nutrition} servings={safeRecipe.servings} />
            </div>
          )}

          {/* Micro-adjustments */}
          {profile && flex && (
            <div className="mb-6 pt-5 border-t border-cream-200">
              <h3 className="font-serif text-lg mb-1">{t("microAdjustments")}</h3>
              <p className="muted text-sm mb-4">{t("microAdjustmentsSub")}</p>
              <div className="flex flex-wrap gap-2">
                {ADJUSTMENTS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => handleAdjust(a.label, a.instruction)}
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
                        handleAdjust(t("addYourOwn"), customText.trim());
                        setCustomText("");
                        setCustomOpen(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!customText.trim() || adjusting !== null}
                    onClick={() => {
                      handleAdjust(t("addYourOwn"), customText.trim());
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
          )}

          {/* Shopping list summary */}
          {shoppingList.length > 0 && (
            <div className="rounded-xl bg-clay-50 border border-clay-200 px-4 py-3 mb-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-clay-700 text-sm font-medium">
                  <ShoppingCart className="h-4 w-4" />
                  {t("shoppingList")} ({shoppingList.length})
                </div>
                <button
                  type="button"
                  onClick={() => setShoppingList([])}
                  className="text-xs text-clay-600 hover:text-clay-800 underline"
                >
                  {t("clear")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-cream-200 bg-cream-100/50 px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className="btn-secondary"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4 text-sage-700" /> : <Bookmark className="h-4 w-4" />}
              {saved ? t("saved") : t("saveRecipe")}
            </button>

            {missingIngredients.length > 0 && (
              <button
                type="button"
                onClick={addAllToShoppingList}
                disabled={addedToShopping}
                className="btn-secondary"
              >
                {addedToShopping ? <Check className="h-4 w-4 text-sage-700" /> : <ShoppingCart className="h-4 w-4" />}
                {addedToShopping ? t("addedToList") : t("addAllToShopping")}
              </button>
            )}

            {onCook && safeRecipe.ingredient_details?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCooking(true);
                  Promise.resolve(onCook()).finally(() => {
                    setCooking(false);
                    setCooked(true);
                    setTimeout(() => setCooked(false), 2000);
                  });
                }}
                disabled={cooking || cooked}
                className="btn-clay"
              >
                {cooking ? <Loader2 className="h-4 w-4 animate-spin" /> : cooked ? <Check className="h-4 w-4 text-sage-700" /> : <CookingPot className="h-4 w-4" />}
                {cooked ? t("cooked") : t("cook")}
              </button>
            )}

            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="btn-clay"
              >
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {regenerating ? t("regeneratingMeal") : t("regenerateThisMeal")}
              </button>
            )}

            <div className="flex-1" />

            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              <X className="h-4 w-4" />
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
