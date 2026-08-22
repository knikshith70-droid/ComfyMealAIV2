import { useEffect, useState } from "react";
import { fetchNutritionHistory } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { NutritionHistoryEntry } from "../lib/supabase";
import {
  History, Clock, Utensils, Loader2, AlertCircle, ChevronDown, ChevronUp, Flame,
} from "lucide-react";
import { RecipeImage } from "../components/RecipeImage";

export function RecentRecipesPage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<NutritionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchNutritionHistory(200)
      .then((data) => { if (mounted) setEntries(data); })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : "Failed to load recent recipes."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-sage-600" /></div>;
  }

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <History className="h-6 w-6 text-sage-700" />
        <h1 className="font-serif text-3xl text-charcoal-900">{t("recentRecipesPageTitle")}</h1>
      </div>
      <p className="muted mb-7">{t("recentRecipesPageSub")}</p>

      {error && (
        <div className="mb-5 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {entries.length === 0 && !loading && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-cream-300">
          <History className="h-10 w-10 text-charcoal-700/20 mx-auto mb-3" />
          <p className="muted">{t("noRecipesYetDesc")}</p>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry) => {
          const recipe = entry.recipe_data;
          const open = expanded === entry.id;
          return (
            <div key={entry.id} className="card overflow-hidden">
              <div
                className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-cream-100/50 transition"
                onClick={() => setExpanded(open ? null : entry.id)}
              >
                <div className="min-w-0">
                  <div className="font-medium text-charcoal-900 truncate">{entry.recipe_title}</div>
                  <div className="flex items-center gap-3 text-xs muted mt-1">
                    <span className="capitalize">{entry.meal_type}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{recipe?.time_minutes ?? "—"}m</span>
                    <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{t("serves")} {recipe?.servings ?? "—"}</span>
                    <span>{new Date(entry.generated_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {entry.nutrition?.calories != null && (
                    <span className="text-xs text-clay-700 font-medium">{entry.nutrition.calories} kcal</span>
                  )}
                  {open ? <ChevronUp className="h-4 w-4 text-charcoal-700/40" /> : <ChevronDown className="h-4 w-4 text-charcoal-700/40" />}
                </div>
              </div>

              {open && recipe && (
                <div className="px-5 pb-5 border-t border-cream-200 pt-4 animate-fade-up">
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
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sage-400 shrink-0" />{ing}
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
                  {entry.nutrition && (
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-700">
                      <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-clay-500" />{entry.nutrition.calories} kcal</span>
                      <span>{t("protein")} {entry.nutrition.protein_g}g</span>
                      <span>{t("carbs")} {entry.nutrition.carbs_g}g</span>
                      <span>{t("fat")} {entry.nutrition.fat_g}g</span>
                      <span className="muted">{t("aiEstimate")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
