import { useEffect, useMemo, useState } from "react";
import type { Nutrition } from "../lib/supabase";
import { useI18n } from "../lib/i18n";
import { Edit3, RotateCcw, Check, X, Flame, Beef, Wheat, Droplet, Wheat as Fiber } from "lucide-react";

interface Props {
  nutrition: Nutrition;
  servings: number;
}

const FIELDS: { key: keyof Nutrition; labelKey: string; icon: React.ReactNode; color: string; unit: string }[] = [
  { key: "calories", labelKey: "calories", icon: <Flame className="h-4 w-4" />, color: "bg-clay-500", unit: "kcal" },
  { key: "protein_g", labelKey: "protein", icon: <Beef className="h-4 w-4" />, color: "bg-sage-600", unit: "g" },
  { key: "carbs_g", labelKey: "carbs", icon: <Wheat className="h-4 w-4" />, color: "bg-amber-500", unit: "g" },
  { key: "fat_g", labelKey: "fat", icon: <Droplet className="h-4 w-4" />, color: "bg-rose-400", unit: "g" },
  { key: "fiber_g", labelKey: "fiber", icon: <Fiber className="h-4 w-4" />, color: "bg-emerald-500", unit: "g" },
];

export function NutritionChart({ nutrition, servings }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [servingSize, setServingSize] = useState(servings);
  const [userValues, setUserValues] = useState<Nutrition | null>(null);
  const [draft, setDraft] = useState<Nutrition>(nutrition);

  useEffect(() => {
    setServingSize(servings);
    setUserValues(null);
    setDraft(nutrition);
  }, [nutrition, servings]);

  // Scale AI values proportionally when serving size changes
  const scaledAi = useMemo<Nutrition>(() => {
    if (servingSize === servings) return nutrition;
    const ratio = servings > 0 ? servingSize / servings : 1;
    return {
      calories: Math.round(nutrition.calories * ratio),
      protein_g: Math.round(nutrition.protein_g * ratio * 10) / 10,
      carbs_g: Math.round(nutrition.carbs_g * ratio * 10) / 10,
      fat_g: Math.round(nutrition.fat_g * ratio * 10) / 10,
      fiber_g: Math.round(nutrition.fiber_g * ratio * 10) / 10,
    };
  }, [nutrition, servings, servingSize]);

  // Scale user values too when serving size changes
  const scaledUser = useMemo<Nutrition | null>(() => {
    if (!userValues) return null;
    if (servingSize === servings) return userValues;
    const ratio = servings > 0 ? servingSize / servings : 1;
    return {
      calories: Math.round(userValues.calories * ratio),
      protein_g: Math.round(userValues.protein_g * ratio * 10) / 10,
      carbs_g: Math.round(userValues.carbs_g * ratio * 10) / 10,
      fat_g: Math.round(userValues.fat_g * ratio * 10) / 10,
      fiber_g: Math.round(userValues.fiber_g * ratio * 10) / 10,
    };
  }, [userValues, servings, servingSize]);

  const display = scaledUser ?? scaledAi;
  const hasUserValues = userValues !== null;

  const startEdit = () => {
    setDraft(scaledUser ?? scaledAi);
    setEditing(true);
  };

  const saveEdit = () => {
    setUserValues(draft);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const reset = () => {
    setUserValues(null);
    setServingSize(servings);
  };

  const maxVal = Math.max(...FIELDS.map((f) => display[f.key]), 1);

  return (
    <div className="rounded-2xl bg-cream-100/60 border border-cream-200/70 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-serif text-base text-charcoal-900">{t("nutrition")}</h4>
        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <button type="button" onClick={saveEdit} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-sage-600 text-cream-50 hover:bg-sage-700 transition active:scale-95" aria-label="Save">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={cancelEdit} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-cream-200 text-charcoal-700 hover:bg-cream-300 transition active:scale-95" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={startEdit} className="btn-ghost text-xs px-2.5 py-1.5" aria-label={t("editNutrition")}>
                <Edit3 className="h-3.5 w-3.5" /> {t("editNutrition")}
              </button>
              {hasUserValues && (
                <button type="button" onClick={reset} className="btn-ghost text-xs px-2.5 py-1.5" aria-label={t("resetNutrition")}>
                  <RotateCcw className="h-3.5 w-3.5" /> {t("resetNutrition")}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Serving size control */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs muted shrink-0">{t("servingSize")}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setServingSize((s) => Math.max(1, s - 1))}
            disabled={editing}
            className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-cream-200 text-charcoal-700 hover:bg-cream-300 disabled:opacity-40 transition active:scale-95"
          >−</button>
          <span className="font-mono text-sm font-medium w-8 text-center tabular-nums">{servingSize}</span>
          <button
            type="button"
            onClick={() => setServingSize((s) => s + 1)}
            disabled={editing}
            className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-cream-200 text-charcoal-700 hover:bg-cream-300 disabled:opacity-40 transition active:scale-95"
          >+</button>
        </div>
        {servingSize !== servings && (
          <span className="text-xs text-clay-600">×{(servingSize / servings).toFixed(2)}</span>
        )}
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {FIELDS.map((f) => {
          const val = display[f.key];
          const aiVal = scaledAi[f.key];
          const isUser = hasUserValues;
          const pct = Math.min(100, (val / maxVal) * 100);
          return (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-700">
                  <span className="text-charcoal-700/60">{f.icon}</span>
                  {t(f.labelKey)}
                </span>
                {editing ? (
                  <input
                    type="number"
                    step={f.key === "calories" ? 1 : 0.1}
                    min={0}
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) || 0 })}
                    className="w-20 text-right rounded-md bg-cream-50 border border-cream-300 px-2 py-1 text-xs font-mono tabular-nums focus:outline-none focus:border-sage-400"
                  />
                ) : (
                  <span className="text-xs font-mono tabular-nums text-charcoal-900">
                    {val}{f.unit === "kcal" ? " kcal" : "g"}
                    {isUser && (
                      <span className="ml-1.5 text-charcoal-700/50 line-through tabular-nums">{aiVal}{f.unit === "kcal" ? "" : "g"}</span>
                    )}
                  </span>
                )}
              </div>
              {!editing && (
                <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                  <div
                    className={`h-full ${f.color} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-cream-200">
        <span className="inline-flex items-center gap-1.5 text-xs muted">
          <span className="h-2.5 w-2.5 rounded-full bg-sage-500" /> {t("aiEstimate")}
        </span>
        {hasUserValues && (
          <span className="inline-flex items-center gap-1.5 text-xs muted">
            <span className="h-2.5 w-2.5 rounded-full bg-clay-500" /> {t("yourValues")}
          </span>
        )}
      </div>
    </div>
  );
}
