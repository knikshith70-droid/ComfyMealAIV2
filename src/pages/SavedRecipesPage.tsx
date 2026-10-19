import { useEffect, useState } from "react";
import { fetchSavedRecipes, deleteSavedRecipe } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { Recipe, SavedRecipe } from "../lib/supabase";
import { Bookmark, Clock, Utensils, Trash2, Loader2, AlertCircle, ChevronDown, ChevronUp, Leaf, CalendarDays, Sunrise, Sun, Moon, Coffee, ChevronRight } from "lucide-react";
import { RecipeImage } from "../components/RecipeImage";

export function SavedRecipesPage() {
  const { t } = useI18n();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchSavedRecipes()
      .then((data) => { if (mounted) setRecipes(data as SavedRecipe[]); })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : "Failed to load saved recipes."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteSavedRecipe(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      if (expanded === id) setExpanded(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove recipe.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-sage-600" /></div>;
  }

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <Bookmark className="h-6 w-6 text-sage-700" />
        <h1 className="font-serif text-3xl text-charcoal-900">{t("savedRecipesTitle")}</h1>
      </div>
      <p className="muted mb-7">{t("savedRecipesSub")}</p>

      {error && (
        <div className="mb-5 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {recipes.length === 0 && !loading && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-cream-300">
          <Bookmark className="h-10 w-10 text-charcoal-700/20 mx-auto mb-3" />
          <p className="muted">{t("noSavedRecipesDesc")}</p>
        </div>
      )}

      <div className="space-y-3">
        {recipes.map((recipe) => {
          const open = expanded === recipe.id;
          const isMealPlan = recipe.tags?.some((tag) => tag.toLowerCase() === "meal plan") ?? false;
          return (
            <div key={recipe.id} className="card overflow-hidden">
              <div
                className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-cream-100/50 transition"
                onClick={() => setExpanded(open ? null : recipe.id)}
              >
                <div className="min-w-0">
                  <div className="font-medium text-charcoal-900 truncate">{recipe.title}</div>
                  <div className="flex items-center gap-3 text-xs muted mt-1">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.time_minutes}m</span>
                    <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{t("serves")} {recipe.servings}</span>
                    {recipe.nutrition?.calories != null && <span>{recipe.nutrition.calories} kcal/srv</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                    disabled={deleting === recipe.id}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-full text-charcoal-700/40 hover:text-clay-700 hover:bg-clay-50 transition"
                    aria-label={t("remove")}
                  >
                    {deleting === recipe.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  {open ? <ChevronUp className="h-4 w-4 text-charcoal-700/40" /> : <ChevronDown className="h-4 w-4 text-charcoal-700/40" />}
                </div>
              </div>

              {open && (
                <div className="px-5 pb-5 border-t border-cream-200 pt-4 animate-fade-up">
                  {isMealPlan ? (
                    <SavedMealPlanView recipe={recipe} />
                  ) : (
                    <>
                      <div className="mb-4">
                        <RecipeImage title={recipe.title} description={recipe.description} ingredients={recipe.ingredients} />
                      </div>
                      <p className="text-sm text-charcoal-700 mb-4 leading-relaxed">{recipe.description}</p>
                      {recipe.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {recipe.tags.map((tag, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-sage-100 text-sage-800 text-xs font-medium px-2.5 py-1">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <h3 className="font-serif text-base mb-2">{t("ingredients")}</h3>
                          <ul className="space-y-1.5">
                            {recipe.ingredients.map((ing, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-charcoal-700">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sage-400 shrink-0" />
                                {ing}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="font-serif text-base mb-2">{t("steps")}</h3>
                          <ol className="space-y-2">
                            {recipe.steps.map((step, i) => (
                              <li key={i} className="flex gap-2.5 text-sm text-charcoal-700">
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold shrink-0">{i + 1}</span>
                                <span className="leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                      {recipe.nutrition && (
                        <div className="mt-4 flex flex-wrap gap-3 rounded-xl bg-cream-100 px-4 py-3">
                          <NutrientPill label={t("calories")} value={`${recipe.nutrition.calories} kcal`} />
                          <NutrientPill label={t("protein")} value={`${recipe.nutrition.protein_g}g`} />
                          <NutrientPill label={t("carbs")} value={`${recipe.nutrition.carbs_g}g`} />
                          <NutrientPill label={t("fat")} value={`${recipe.nutrition.fat_g}g`} />
                          <NutrientPill label={t("fiber")} value={`${recipe.nutrition.fiber_g}g`} />
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-3 text-xs muted flex items-center gap-1">
                    <Leaf className="h-3 w-3" /> {t("saved")} {new Date(recipe.created_at).toLocaleDateString()}
                  </div>
                </div>
              )})}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NutrientPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="muted">{label}: </span>
      <span className="font-medium text-charcoal-900">{value}</span>
    </div>
  );
}

type MealSlotName = "breakfast" | "lunch" | "dinner" | "snacks";
type SavedPlanPayload = { version: number; duration?: string; settings?: { budget?: string; cook_time?: string; dietary?: string[] }; plan: Array<{ date?: string; breakfast?: Recipe; lunch?: Recipe; dinner?: Recipe; snacks?: Recipe }> };

function readSavedPlan(recipe: SavedRecipe): SavedPlanPayload | null {
  const encoded = recipe.steps?.find((step) => step.startsWith("COMFYMEAL_PLAN_JSON:"));
  if (encoded) {
    try {
      const payload = JSON.parse(encoded.slice("COMFYMEAL_PLAN_JSON:".length)) as SavedPlanPayload;
      if (Array.isArray(payload.plan)) return payload;
    } catch {
      // Fall through to the legacy format below.
    }
  }

  // Older saved plans stored one descriptive line per meal. Recover the day /
  // meal grouping where possible; old records did not retain per-meal ingredients.
  if (!recipe.tags?.some((tag) => tag.toLowerCase() === "meal plan")) return null;
  const days = new Map<number, SavedPlanPayload["plan"][number]>();
  for (const line of recipe.steps ?? []) {
    const match = line.match(/^Day (\d+) \((.*?)\) — (breakfast|lunch|dinner|snacks): (.*?)\.\s*(.*)$/i);
    if (!match) continue;
    const dayNumber = Number(match[1]);
    const slot = match[3].toLowerCase() as MealSlotName;
    const day = days.get(dayNumber) ?? { date: match[2] };
    day[slot] = { title: match[4], description: match[5], time_minutes: 0, servings: 1, ingredients: [], steps: [], tags: [] };
    days.set(dayNumber, day);
  }
  return days.size ? { version: 0, plan: [...days.entries()].sort(([a], [b]) => a - b).map(([, day]) => day) } : null;
}

function SavedMealPlanView({ recipe }: { recipe: SavedRecipe }) {
  const payload = readSavedPlan(recipe);
  if (!payload?.plan.length) {
    return <p className="text-sm muted">This saved meal plan could not be read. You can keep this saved item, but its original structure is unavailable.</p>;
  }

  const slots: { key: MealSlotName; label: string; Icon: typeof Sunrise }[] = [
    { key: "breakfast", label: "Breakfast", Icon: Sunrise },
    { key: "lunch", label: "Lunch", Icon: Sun },
    { key: "dinner", label: "Dinner", Icon: Moon },
    { key: "snacks", label: "Snacks", Icon: Coffee },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-cream-100/70 border border-cream-200 px-4 py-3">
        <div className="flex items-center gap-2 font-medium text-charcoal-900">
          <CalendarDays className="h-4 w-4 text-sage-700" />
          {payload.plan.length}-day meal plan
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {payload.settings?.dietary?.filter((tag) => !tag.toLowerCase().startsWith("no ")).map((tag) => (
            <span key={tag} className="rounded-full bg-sage-100 text-sage-800 text-xs px-2.5 py-1">{tag}</span>
          ))}
          {payload.settings?.budget && <span className="rounded-full bg-white/70 text-charcoal-700 text-xs px-2.5 py-1">Budget: {payload.settings.budget}</span>}
          {payload.settings?.cook_time && <span className="rounded-full bg-white/70 text-charcoal-700 text-xs px-2.5 py-1">Cooking time: {payload.settings.cook_time}</span>}
        </div>
      </div>

      {payload.plan.map((day, dayIndex) => (
        <section key={dayIndex} className="rounded-xl border border-cream-200 overflow-hidden">
          <div className="flex items-center gap-2 bg-cream-100/70 px-4 py-3">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-sage-100 text-sage-700 text-sm font-semibold">{dayIndex + 1}</span>
            <h3 className="font-serif text-lg text-charcoal-900">Day {dayIndex + 1}</h3>
            {day.date && <span className="text-xs muted ml-auto">{day.date}</span>}
          </div>
          <div className="divide-y divide-cream-200">
            {slots.map(({ key, label, Icon }) => {
              const meal = day[key];
              if (!meal?.title) return null;
              return (
                <details key={key} className="group px-4 py-3">
                  <summary className="flex items-start gap-3 cursor-pointer list-none">
                    <Icon className="h-4 w-4 text-sage-700 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-sage-700">{label}</div>
                      <div className="font-medium text-charcoal-900 mt-0.5">{meal.title}</div>
                      {meal.description && <p className="text-sm text-charcoal-700 mt-1 leading-relaxed">{meal.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs muted mt-2">
                        {meal.time_minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{meal.time_minutes} min</span>}
                        {meal.servings > 0 && <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{meal.servings} servings</span>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-charcoal-700/40 mt-1 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="ml-7 mt-3 grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-charcoal-900 mb-2">Ingredients</h4>
                      {meal.ingredients?.length ? (
                        <ul className="space-y-1.5">{meal.ingredients.map((ingredient, i) => <li key={i} className="text-sm text-charcoal-700 flex gap-2"><span className="text-sage-600">•</span><span>{ingredient}</span></li>)}</ul>
                      ) : <p className="text-xs muted">Per-meal ingredients were not retained in this older saved plan.</p>}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-charcoal-900 mb-2">Cooking instructions</h4>
                      {meal.steps?.length ? (
                        <ol className="space-y-2">{meal.steps.map((step, i) => <li key={i} className="flex gap-2 text-sm text-charcoal-700"><span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-700 text-xs">{i + 1}</span><span>{step}</span></li>)}</ol>
                      ) : <p className="text-xs muted">Detailed cooking steps were not retained in this older saved plan.</p>}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
