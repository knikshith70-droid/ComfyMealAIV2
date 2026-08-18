import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useI18n, LANGUAGES, type Lang } from "../lib/i18n";
import { useNav } from "../lib/nav";
import { Logo, Wordmark } from "./Logo";
import { Sidebar } from "./Sidebar";
import { DashboardPage } from "../pages/DashboardPage";
import { GeneratePage } from "../pages/GeneratePage";
import { SavedRecipesPage } from "../pages/SavedRecipesPage";
import { RecentRecipesPage } from "../pages/RecentRecipesPage";
import { MealPlanPage } from "../pages/MealPlanPage";
import { LanguageSettingsPage } from "../pages/LanguageSettingsPage";
import { AccountSettingsPage } from "../pages/AccountSettingsPage";
import type { Profile } from "../lib/supabase";
import { Globe, Menu, Check } from "lucide-react";

interface Props {
  profile: Profile;
}

export function AppShell({ profile }: Props) {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { page, navigate, pendingAction, consumePendingAction } = useNav();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U";
  const displayName = user?.email?.split("@")[0] ?? "chef";

  function PageContent() {
    switch (page) {
      case "dashboard": return <DashboardPage onNavigate={navigate} />;
      case "generate": return <GeneratePage profile={profile} pendingAction={pendingAction} onConsumeAction={consumePendingAction} />;
      case "saved": return <SavedRecipesPage />;
      case "recent": return <RecentRecipesPage />;
      case "meal-plan": return <MealPlanPage profile={profile} />;
      case "language": return <LanguageSettingsPage />;
      case "account": return <AccountSettingsPage profile={profile} />;
      default: return <DashboardPage onNavigate={navigate} />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 bg-cream-50/90 backdrop-blur-md border-b border-cream-200/60">
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className="flex items-center gap-2.5 hover:opacity-80 transition"
        >
          <Logo className="h-8 w-8" />
          <Wordmark className="text-lg" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm muted hidden md:block">
            {t("hi")}, {displayName} 👋
          </span>

          {/* Language selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((o) => !o)}
              className="btn-ghost text-sm px-2.5 py-2"
              aria-label={t("language")}
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">{LANGUAGES.find((l) => l.code === lang)?.flag}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-cream-50 border border-cream-300 shadow-card py-1 z-30 max-h-72 overflow-y-auto no-scrollbar">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-sm hover:bg-cream-100 transition ${l.code === lang ? "text-sage-700 font-medium" : "text-charcoal-700"}`}
                    >
                      <span>{l.label}</span>
                      {l.code === lang && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* User avatar (opens sidebar) */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 rounded-full bg-sage-600 text-cream-50 font-semibold text-sm inline-flex items-center justify-center hover:bg-sage-700 transition active:scale-95"
            aria-label="Open menu"
          >
            {initials}
          </button>

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="btn-ghost px-2.5 py-2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <PageContent />
      </main>

      {/* Sidebar drawer */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}
