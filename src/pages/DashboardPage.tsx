import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { fetchPantry, fetchRecentHistory, fetchLatestSession } from "../lib/api";
import type { NutritionHistoryEntry, PantryItem } from "../lib/supabase";
import { type Page, type PendingAction } from "../lib/nav";
import {
  Flame, Sparkles, Clock, Utensils, History, ChevronRight, CalendarRange,
  Loader2, AlertCircle, Bookmark,
} from "lucide-react";

interface Props {
  onNavigate: (page: Page, action?: PendingAction) => void;
}

function getGreeting(t: (k: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("greetingMorning");
  if (h < 17) return t("greetingAfternoon");
  return t("greetingEvening");
}

export function DashboardPage({ onNavigate }: Props) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recent, setRecent] = useState<NutritionHistoryEntry[]>([]);
  const [hasYesterday, setHasYesterday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [items, history, last] = await Promise.all([
          fetchPantry(),
          fetchRecentHistory(5),
          fetchLatestSession(),
        ]);
        if (!mounted) return;
        setPantry(items);
        setRecent(history);
        setHasYesterday(!!last);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const useSoon = pantry.filter((item) => {
    const ageDays = (Date.now() - new Date(item.logged_at).getTime()) / 86400000;
    return ageDays > 3;
  });

  const displayName = user?.email?.split("@")[0] ?? t("chef");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 py-6 max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="font-serif text-3xl sm:text-4xl text-charcoal-900 text-balance">
          {getGreeting(t)}, {displayName}! 👋
        </h1>
        <p className="muted mt-2">{t("whatCook")}</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <QuickCard
          icon={<Sparkles className="h-8 w-8 text-clay-500" />}
          label={t("generateRecipe")}
          sub={t("generateRecipeSub")}
          color="bg-clay-50 border-clay-200"
          onClick={() => onNavigate("generate")}
          highlight
        />
        <QuickCard
          icon={<CalendarRange className="h-8 w-8 text-sage-600" />}
          label={t("mealPlan")}
          sub={t("mealPlanSub")}
          color="bg-sage-50 border-sage-200"
          onClick={() => onNavigate("meal-plan")}
        />
        <QuickCard
          icon={<Bookmark className="h-8 w-8 text-charcoal-700" />}
          label={t("savedRecipes")}
          sub={t("savedRecipesCardSub")}
          color="bg-cream-100 border-cream-300"
          onClick={() => onNavigate("saved")}
        />
        <QuickCard
          icon={<History className="h-8 w-8 text-emerald-600" />}
          label={t("recentRecipes")}
          sub={t("recentRecipesSub")}
          color="bg-emerald-50 border-emerald-200"
          onClick={() => onNavigate("recent")}
        />
      </div>

      <div className="space-y-5">
        {useSoon.length > 0 && (
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-5 w-5 text-clay-500" />
              <h2 className="font-serif text-xl">{t("useTheseSoon")}</h2>
            </div>
            <p className="muted text-sm mb-4">{t("useTheseSoonDesc")}</p>
            <ul className="space-y-2">
              {useSoon.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-clay-50/60 border border-clay-100 px-3.5 py-2.5">
                  <div>
                    <div className="font-medium text-charcoal-900 capitalize">{item.name}</div>
                    <div className="text-xs text-clay-600">{t("added")} {timeAgo(item.logged_at)}</div>
                  </div>
                  <Flame className="h-4 w-4 text-clay-500 shrink-0" />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onNavigate("generate")}
              className="mt-4 btn-clay w-full"
            >
              <Sparkles className="h-4 w-4" /> {t("generateUsingThese")}
            </button>
          </section>
        )}

        {hasYesterday && (
          <section className="card p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <History className="h-5 w-5 text-sage-700" />
              <h2 className="font-serif text-xl">{t("quickStart")}</h2>
            </div>
            <p className="muted text-sm mb-4">{t("quickStartDesc")}</p>
            <button
              type="button"
              onClick={() => onNavigate("generate", "same-as-yesterday")}
              className="btn-secondary w-full"
            >
              <History className="h-4 w-4" /> {t("sameAsYesterday")}
            </button>
          </section>
        )}
      </div>

      {recent.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl">{t("recentRecipesTitle")}</h2>
            <button type="button" onClick={() => onNavigate("recent")} className="btn-ghost text-sm px-3 py-1.5">
              {t("seeAll")} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recent.map((entry) => (
              <div key={entry.id} className="card p-4 hover:border-sage-300 transition cursor-pointer" onClick={() => onNavigate("recent")}>
                <div className="font-medium text-charcoal-900 text-sm mb-1 line-clamp-1">{entry.recipe_title}</div>
                <div className="flex items-center gap-3 text-xs muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {entry.recipe_data?.time_minutes ?? "—"}m
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Utensils className="h-3 w-3" /> {entry.recipe_data?.servings ?? "—"} srv
                  </span>
                  {entry.nutrition?.calories != null && (
                    <span>{entry.nutrition.calories} kcal</span>
                  )}
                </div>
                <div className="text-xs muted mt-1.5">{timeAgo(entry.generated_at)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {recent.length === 0 && !loading && (
        <div className="mt-10 text-center py-14 rounded-2xl border border-dashed border-cream-300">
          <Sparkles className="h-10 w-10 text-sage-400 mx-auto mb-3" />
          <h3 className="font-serif text-xl mb-1">{t("noRecipesYet")}</h3>
          <p className="muted text-sm mb-5">{t("noRecipesYetDesc")}</p>
          <button type="button" onClick={() => onNavigate("generate")} className="btn-primary">
            <Sparkles className="h-4 w-4" /> {t("generateFirst")}
          </button>
        </div>
      )}
    </div>
  );
}

interface QuickCardProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
  highlight?: boolean;
}

function QuickCard({ icon, label, sub, color, onClick, highlight }: QuickCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card p-4 sm:p-5 text-left flex flex-col gap-3 hover:shadow-md transition-all duration-200 active:scale-[0.98] ${color} ${highlight ? "ring-2 ring-clay-300" : ""}`}
    >
      <div className="p-2 rounded-xl bg-white/60 w-fit">{icon}</div>
      <div>
        <div className="font-semibold text-charcoal-900 text-sm">{label}</div>
        <div className="text-xs muted mt-0.5">{sub}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-charcoal-700/40 self-end" />
    </button>
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
