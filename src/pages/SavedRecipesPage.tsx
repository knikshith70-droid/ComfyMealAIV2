import { useEffect, useState } from "react";
import { fetchSavedRecipes, deleteSavedRecipe } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { SavedRecipe } from "../lib/supabase";
import { Bookmark, Clock, Utensils, Trash2, Loader2, AlertCircle, ChevronDown, ChevronUp, Leaf } from "lucide-react";
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
