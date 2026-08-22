import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { useNav, type Page } from "../lib/nav";
import {
  LayoutDashboard, Bookmark, History, CalendarRange, Globe, Settings, LogOut, X,
} from "lucide-react";

const NAV_ITEMS: { page: Page; labelKey: string; icon: React.ReactNode }[] = [
  { page: "dashboard", labelKey: "dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { page: "saved", labelKey: "savedRecipes", icon: <Bookmark className="h-5 w-5" /> },
  { page: "recent", labelKey: "recentRecipes", icon: <History className="h-5 w-5" /> },
  { page: "meal-plan", labelKey: "mealPlan", icon: <CalendarRange className="h-5 w-5" /> },
  { page: "language", labelKey: "languageSettings", icon: <Globe className="h-5 w-5" /> },
  { page: "account", labelKey: "accountSettings", icon: <Settings className="h-5 w-5" /> },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const { page, navigate } = useNav();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const go = (p: Page) => { navigate(p); onClose(); };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  const displayName = user?.email?.split("@")[0] ?? "User";

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-charcoal-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      <aside
        className={`fixed top-0 right-0 z-40 h-dvh w-[300px] sm:w-[320px] bg-cream-50 border-l border-cream-200 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-modal="true"
        role="dialog"
        aria-label="Navigation"
      >
        <div className="flex items-start justify-between p-5 pb-4 border-b border-cream-200">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-sage-600 flex items-center justify-center text-cream-50 font-semibold text-base shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-charcoal-900 truncate">{displayName}</div>
              <div className="text-xs text-charcoal-700/60 truncate mt-0.5">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full text-charcoal-700/50 hover:text-charcoal-900 hover:bg-cream-100 transition mt-0.5 shrink-0"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2">
          {NAV_ITEMS.map((item) => {
            const active = page === item.page;
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => go(item.page)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left mb-0.5 ${
                  active
                    ? "bg-sage-100 text-sage-800"
                    : "text-charcoal-700 hover:bg-cream-100 hover:text-charcoal-900"
                }`}
              >
                <span className={active ? "text-sage-700" : "text-charcoal-700/60"}>
                  {item.icon}
                </span>
                {t(item.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-cream-200">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-charcoal-700 hover:bg-clay-50 hover:text-clay-700 transition-all duration-150"
          >
            <LogOut className="h-5 w-5 text-charcoal-700/60" />
            {t("logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
