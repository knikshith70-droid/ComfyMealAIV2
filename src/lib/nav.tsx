import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Page =
  | "dashboard"
  | "generate"
  | "saved"
  | "recent"
  | "meal-plan"
  | "language"
  | "account";

export type PendingAction = "same-as-yesterday" | null;

interface NavState {
  page: Page;
  navigate: (page: Page, action?: PendingAction) => void;
  pendingAction: PendingAction;
  consumePendingAction: () => void;
}

const NavContext = createContext<NavState | undefined>(undefined);

export function NavProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>("dashboard");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const navigate = (next: Page, action: PendingAction = null) => {
    setPendingAction(action);
    setPage(next);
  };

  const consumePendingAction = () => setPendingAction(null);

  const value = useMemo<NavState>(
    () => ({ page, navigate, pendingAction, consumePendingAction }),
    [page, pendingAction],
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
