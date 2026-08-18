import { AuthProvider, useAuth } from "./lib/auth";
import { I18nProvider } from "./lib/i18n";
import { NavProvider } from "./lib/nav";
import { InventoryProvider } from "./lib/inventory";
import { AuthScreen } from "./components/AuthScreen";
import { Onboarding } from "./components/Onboarding";
import { AppShell } from "./components/AppShell";
import { Logo } from "./components/Logo";
import { Loader2 } from "lucide-react";

function Shell() {
  const { user, profile, loading, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Logo className="h-12 w-12 animate-pulse" />
        <div className="flex items-center gap-2 muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ComfyMeal AI…
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
 const [draft, setDraft] = useState<Profile>(base);
  return <AppShell profile={profile} />;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <InventoryProvider>
          <NavProvider>
            <Shell />
          </NavProvider>
        </InventoryProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
