import { useEffect, useState } from "react";
import { fetchSavedRecipes, deleteSavedRecipe, fetchProfile, fetchPantry, fetchSpices, generateMealPlan, updateSavedMealPlanRecipe } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { Recipe, SavedRecipe } from "../lib/supabase";
import { Bookmark, Clock, Utensils, Trash2, Loader2, AlertCircle, ChevronDown, ChevronUp, Leaf, CalendarDays, Sunrise, Sun, Moon, Coffee, ChevronRight } from "lucide-react";
import { RecipeImage } from "../components/RecipeImage";
import { supabase } from "../lib/supabase";

export function SavedRecipesPage() {
  const { t } = useI18n();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [recovering, setRecovering] = useState<string | null>(null);

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
    <div className="px-4 sm:px-7 lg:px-8 py-7 sm:py-9 max-w-5xl mx-auto">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#173f35] via-[#28614e] to-[#7c9b63] text-white p-6 sm:p-8 lg:p-10 mb-8 shadow-lg shadow-sage-900/10">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
        <div className="pointer-events-none absolute right-24 -bottom-20 h-48 w-48 rounded-full bg-lime-200/10 blur-2xl" />
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
              <Bookmark className="h-3.5 w-3.5" /> YOUR PERSONAL COOKBOOK
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight mt-4">{t("savedRecipesTitle")}</h1>
            <p className="text-sm sm:text-base text-white/75 mt-3 leading-relaxed max-w-lg">{t("savedRecipesSub")}</p>
          </div>
          <div className="flex gap-3">
            <div className="min-w-24 rounded-2xl border border-white/15 bg-white/10 backdrop-blur px-4 py-3">
              <div className="text-2xl sm:text-3xl font-semibold">{recipes.length}</div>
              <div className="text-[11px] uppercase tracking-wider text-white/70 mt-1">Saved items</div>
            </div>
            <div className="min-w-24 rounded-2xl border border-white/15 bg-white/10 backdrop-blur px-4 py-3">
              <div className="text-2xl sm:text-3xl font-semibold">{recipes.filter((r) => r.tags?.some((tag) => tag.toLowerCase() === "meal plan")).length}</div>
              <div className="text-[11px] uppercase tracking-wider text-white/70 mt-1">Meal plans</div>
            </div>
          </div>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-2 text-xs text-white/85">
          <span className="rounded-full bg-white/10 px-3 py-1.5 border border-white/10">Made for your taste</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 border border-white/10">Ready when you are</span>
        </div>
      </section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl text-charcoal-900">Your collection</h2>
          <p className="text-xs muted mt-1">Open a card to revisit the recipe or explore your saved plan.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-sage-50 border border-sage-100 text-sage-800 px-3 py-1.5 text-xs font-semibold"><Leaf className="h-3.5 w-3.5" /> Kitchen favourites</span>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {recipes.length === 0 && !loading && (
        <div className="text-center py-16 sm:py-20 rounded-[2rem] border border-dashed border-sage-200 bg-gradient-to-b from-sage-50/70 to-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-sage-100"><Bookmark className="h-7 w-7 text-sage-600" /></div>
          <p className="muted">{t("noSavedRecipesDesc")}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {recipes.map((recipe) => {
          const open = expanded === recipe.id;
          const isMealPlan = recipe.tags?.some((tag) => tag.toLowerCase() === "meal plan") ?? false;
          return (
            <div key={recipe.id} className="group overflow-hidden rounded-3xl border border-cream-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sage-200 hover:shadow-lg hover:shadow-sage-900/5">
              <div
                className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-cream-100/50 transition"
                onClick={() => setExpanded(open ? null : recipe.id)}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-3 min-w-0"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-100 to-cream-100 text-sage-800 shadow-inner">{isMealPlan ? <CalendarDays className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}</div><div className="min-w-0"><div className="font-semibold text-charcoal-900 leading-snug group-hover:text-sage-900 transition-colors">{recipe.title}</div><div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-sage-700/70 mt-1">{isMealPlan ? "Planned with care" : "Saved recipe"}</div></div></div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs muted mt-2">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.time_minutes}m</span>
                    <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{t("serves")} {recipe.servings}</span>
                    {recipe.nutrition?.calories != null && <span>{recipe.nutrition.calories} kcal/srv</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isMealPlan && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpanded(open ? null : recipe.id); }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sage-800 text-white hover:bg-sage-900 shadow-sm shadow-sage-900/10 transition px-3 py-2.5 text-xs font-semibold"
                      aria-expanded={open}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {open ? "Hide Plan" : "View Plan"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                    disabled={deleting === recipe.id}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-cream-200 text-charcoal-700/45 hover:text-clay-700 hover:border-clay-200 hover:bg-clay-50 transition"
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
                    <SavedMealPlanView recipe={recipe} onRecovered={(updated) => setRecipes((prev) => prev.map((item) => item.id === updated.id ? updated : item))} />
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
              )}
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
    const day: SavedPlanPayload["plan"][number] = days.get(dayNumber) ?? { date: match[2] };
    day[slot] = { title: match[4], description: match[5], time_minutes: 0, servings: 1, ingredients: [], steps: [], tags: [] };
    days.set(dayNumber, day);
  }
  return days.size ? { version: 0, plan: [...days.entries()].sort(([a], [b]) => a - b).map(([, day]) => day) } : null;
}

function SavedMealPlanView({ recipe, onRecovered }: { recipe: SavedRecipe; onRecovered: (updated: SavedRecipe) => void }) {
  const payload = readSavedPlan(recipe);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const isLegacy = Boolean(payload && payload.version === 0);
  const hasMissingDetails = Boolean(payload?.plan.some((day) =>
    (["breakfast", "lunch", "dinner", "snacks"] as const).some((slot) =>
      day[slot]?.title && (!day[slot]?.ingredients?.length || !day[slot]?.steps?.length),
    ),
  ));

  const recoverLegacyPlan = async () => {
    if (!payload) return;
    setIsRecovering(true);
    setRecoveryError(null);
    setRecoveryNotice(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Please sign in again to recover this meal plan.");
      const profile = await fetchProfile(user.id);
      if (!profile) throw new Error("Your cooking profile could not be loaded. Complete onboarding first.");
      const [pantry, spices] = await Promise.all([fetchPantry(), fetchSpices()]);
      const settings = { budget: payload.settings?.budget ?? "mid", cook_time: payload.settings?.cook_time ?? "standard", dietary: payload.settings?.dietary ?? [] };
      const durationByDays: Record<number, string> = { 1: "1day", 3: "3day", 7: "1week", 14: "2week", 30: "1month" };
      const duration = payload.duration ?? durationByDays[payload.plan.length] ?? "1day";
      const generated = await generateMealPlan({
        profile,
        pantry,
        spices,
        duration,
        settings,
        language: profile.language || "en",
      });
      const updated = await updateSavedMealPlanRecipe(recipe.id, duration, settings, generated.plan);
      onRecovered(updated as SavedRecipe);
      setRecoveryNotice("Meal details regenerated and saved. Review the updated dishes before cooking.");
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : "Could not regenerate this meal plan. Please try again.");
    } finally {
      setIsRecovering(false);
    }
  };

  if (!payload?.plan.length) {
    return <p className="text-sm muted">This saved meal plan could not be read. You can keep this saved item, but its original structure is unavailable.</p>;
  }

  const slots: { key: MealSlotName; label: string; Icon: typeof Sunrise; tint: string }[] = [
    { key: "breakfast", label: "Breakfast", Icon: Sunrise, tint: "from-amber-50 to-orange-50 border-amber-100" },
    { key: "lunch", label: "Lunch", Icon: Sun, tint: "from-lime-50 to-emerald-50 border-lime-100" },
    { key: "dinner", label: "Dinner", Icon: Moon, tint: "from-indigo-50 to-violet-50 border-indigo-100" },
    { key: "snacks", label: "Snacks", Icon: Coffee, tint: "from-rose-50 to-pink-50 border-rose-100" },
  ];
  const totalMeals = payload.plan.reduce((total, day) => total + slots.filter(({ key }) => Boolean(day[key]?.title)).length, 0);

  return (
    <div className="space-y-6">
      {(isLegacy || hasMissingDetails) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><AlertCircle className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-amber-950">Some meal details are missing</h3>
              <p className="text-sm text-amber-900/80 mt-1">This older save doesn't contain the full ingredients and cooking steps. Regenerate the plan to create complete details and save them for next time. This will replace the current menu with a newly generated plan.</p>
              {recoveryError && <p role="alert" className="text-sm text-red-700 mt-2">{recoveryError}</p>}
              {recoveryNotice && <p role="status" className="text-sm text-emerald-800 mt-2">{recoveryNotice}</p>}
              <button type="button" onClick={recoverLegacyPlan} disabled={isRecovering} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sage-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-900 disabled:opacity-60 transition">
                {isRecovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Utensils className="h-4 w-4" />}
                {isRecovering ? "Regenerating plan…" : "Regenerate missing details"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sage-800 via-sage-700 to-emerald-900 text-white p-5 sm:p-6">
        <div className="absolute -right-7 -top-10 h-36 w-36 rounded-full border-[20px] border-white/10" />
        <div className="absolute right-14 -bottom-12 h-32 w-32 rounded-full bg-lime-300/10 blur-sm" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
            <CalendarDays className="h-3.5 w-3.5" /> YOUR MEAL BLUEPRINT
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl mt-3 leading-tight">{payload.plan.length}-day meal plan</h2>
          <p className="text-sm text-white/75 mt-1 max-w-lg">Everything planned out, one day and one delicious meal at a time.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5">
            <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-3">
              <div className="text-2xl font-semibold">{payload.plan.length}</div>
              <div className="text-xs text-white/70 mt-0.5">Days planned</div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/10 px-3 py-3">
              <div className="text-2xl font-semibold">{totalMeals}</div>
              <div className="text-xs text-white/70 mt-0.5">Meals included</div>
            </div>
            <div className="hidden sm:block rounded-xl bg-white/10 border border-white/10 px-3 py-3">
              <div className="text-2xl font-semibold">{payload.settings?.dietary?.filter((tag) => !tag.toLowerCase().startsWith("no ")).length || "—"}</div>
              <div className="text-xs text-white/70 mt-0.5">Food preferences</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {payload.settings?.dietary?.filter((tag) => !tag.toLowerCase().startsWith("no ")).map((tag) => (
              <span key={tag} className="rounded-full bg-white/15 border border-white/10 text-white/90 text-xs px-2.5 py-1">{tag}</span>
            ))}
            {payload.settings?.budget && <span className="rounded-full bg-white/15 border border-white/10 text-white/90 text-xs px-2.5 py-1">Budget · {payload.settings.budget}</span>}
            {payload.settings?.cook_time && <span className="rounded-full bg-white/15 border border-white/10 text-white/90 text-xs px-2.5 py-1">Cook time · {payload.settings.cook_time}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl text-charcoal-900">Your daily menu</h3>
          <p className="text-xs muted mt-1">Open any meal to see its ingredients and cooking instructions.</p>
        </div>
        <span className="shrink-0 rounded-full bg-sage-100 text-sage-800 px-3 py-1.5 text-xs font-semibold">{totalMeals} meals</span>
      </div>

      <div className="space-y-5">
        {payload.plan.map((day, dayIndex) => {
          const dayMeals = slots.filter(({ key }) => Boolean(day[key]?.title)).length;
          return (
            <section key={dayIndex} className="relative overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4 bg-gradient-to-r from-cream-100 via-white to-sage-50 border-b border-cream-200">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-sage-700 text-white shadow-sm">
                  <span className="text-[9px] uppercase tracking-widest text-white/70">Day</span>
                  <span className="text-lg font-bold leading-4">{dayIndex + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif text-lg text-charcoal-900">Day {dayIndex + 1}</h4>
                  <p className="text-xs muted mt-0.5">{day.date || "Your menu for the day"}</p>
                </div>
                <span className="rounded-full border border-sage-200 bg-white px-2.5 py-1 text-xs font-medium text-sage-800">{dayMeals} {dayMeals === 1 ? "meal" : "meals"}</span>
              </div>
              <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-3">
                {slots.map(({ key, label, Icon, tint }) => {
                  const meal = day[key];
                  if (!meal?.title) return (
                    <div key={key} className="flex items-center gap-3 rounded-xl border border-dashed border-cream-200 px-3 py-3 opacity-60">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-100 text-charcoal-700/60"><Icon className="h-4 w-4" /></span>
                      <div><div className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-700/60">{label}</div><div className="text-xs muted mt-0.5">Not planned</div></div>
                    </div>
                  );
                  return (
                    <details key={key} className="group min-w-0 rounded-xl border border-cream-200 bg-white hover:border-sage-300 hover:shadow-md transition-all duration-200 overflow-hidden">
                      <summary className={`flex items-start gap-3 cursor-pointer list-none bg-gradient-to-br ${tint} px-3 py-3.5`}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm text-sage-800"><Icon className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal-700/70">{label}</div>
                          <div className="font-semibold text-charcoal-900 mt-1 leading-snug">{meal.title}</div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-charcoal-700/70 mt-2">
                            {meal.time_minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{meal.time_minutes} min</span>}
                            {meal.servings > 0 && <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{meal.servings} servings</span>}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-charcoal-700/50 mt-1 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      {meal.description && <p className="px-4 pt-3 text-sm text-charcoal-700 leading-relaxed">{meal.description}</p>}
                      <div className="p-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <h5 className="flex items-center gap-2 font-semibold text-sm text-charcoal-900 mb-2"><span className="h-1.5 w-1.5 rounded-full bg-sage-500" />Ingredients</h5>
                          {meal.ingredients?.length ? (
                            <ul className="space-y-2">{meal.ingredients.map((ingredient, i) => <li key={i} className="text-sm text-charcoal-700 flex items-start gap-2"><span className="text-sage-600 mt-0.5">✓</span><span>{ingredient}</span></li>)}</ul>
                          ) : <p className="text-xs muted">Per-meal ingredients were not retained in this older saved plan.</p>}
                        </div>
                        <div>
                          <h5 className="flex items-center gap-2 font-semibold text-sm text-charcoal-900 mb-2"><span className="h-1.5 w-1.5 rounded-full bg-clay-500" />Cooking instructions</h5>
                          {meal.steps?.length ? (
                            <ol className="space-y-2.5">{meal.steps.map((step, i) => <li key={i} className="flex gap-2.5 text-sm text-charcoal-700"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cream-100 border border-cream-200 text-charcoal-700 text-xs font-semibold">{i + 1}</span><span className="leading-relaxed pt-0.5">{step}</span></li>)}</ol>
                          ) : <p className="text-xs muted">Detailed cooking steps were not retained in this older saved plan.</p>}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
