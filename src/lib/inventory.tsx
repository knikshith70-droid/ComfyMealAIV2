import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import type { PantryItem, SpiceItem, IngredientDetail } from "./supabase";
import {
  fetchPantry, addPantryItem, updatePantryItem, deletePantryItem,
  fetchSpices, addSpice, updateSpice, deleteSpice,
  cookRecipe as cookRecipeApi,
} from "./api";
import { useAuth } from "./auth";

interface InventoryState {
  pantry: PantryItem[];
  spices: SpiceItem[];
  loading: boolean;
  quantityTracking: boolean;
  setQuantityTracking: (v: boolean) => void;
  addPantry: (name: string, quantity?: number, unit?: string) => Promise<PantryItem>;
  updatePantry: (id: string, patch: Partial<Pick<PantryItem, "name" | "quantity" | "unit" | "low_stock_threshold">>) => Promise<void>;
  removePantry: (id: string) => Promise<void>;
  addSpiceItem: (name: string, quantity?: number, unit?: string) => Promise<SpiceItem>;
  updateSpiceItem: (id: string, patch: Partial<Pick<SpiceItem, "name" | "quantity" | "unit" | "low_stock_threshold">>) => Promise<void>;
  removeSpiceItem: (id: string) => Promise<void>;
  removeAllPantry: () => Promise<void>;
  removeAllSpices: () => Promise<void>;
  cookRecipe: (ingredientDetails: IngredientDetail[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const InventoryContext = createContext<InventoryState | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [spices, setSpices] = useState<SpiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const quantityTracking = profile?.quantity_tracking_enabled ?? true;
  const setQuantityTracking = (_v: boolean) => {
    // Saved via upsertProfile in AccountSettingsPage; profile refresh updates this.
  };

  const refresh = useCallback(async () => {
    const [items, spicesList] = await Promise.all([fetchPantry(), fetchSpices()]);
    setPantry(items);
    setSpices(spicesList);
  }, []);

  useEffect(() => {
    if (!user) {
      setPantry([]);
      setSpices([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    refresh()
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [user, refresh]);

  const addPantryFn = useCallback(async (name: string, quantity = 1, unit = "pieces"): Promise<PantryItem> => {
    const qty = quantityTracking ? quantity : 1;
    const item = await addPantryItem(name, qty, unit);
    setPantry((prev) => [item, ...prev]);
    return item;
  }, [quantityTracking]);

  const updatePantryFn = useCallback(async (id: string, patch: Partial<Pick<PantryItem, "name" | "quantity" | "unit" | "low_stock_threshold">>) => {
    const updated = await updatePantryItem(id, patch);
    setPantry((prev) => prev.map((p) => p.id === id ? updated : p));
  }, []);

  const removePantryFn = useCallback(async (id: string) => {
    await deletePantryItem(id);
    setPantry((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addSpiceFn = useCallback(async (name: string, quantity = 1, unit = "tsp"): Promise<SpiceItem> => {
    const qty = quantityTracking ? quantity : 1;
    const item = await addSpice(name, qty, unit);
    setSpices((prev) => [item, ...prev]);
    return item;
  }, [quantityTracking]);

  const updateSpiceFn = useCallback(async (id: string, patch: Partial<Pick<SpiceItem, "name" | "quantity" | "unit" | "low_stock_threshold">>) => {
    const updated = await updateSpice(id, patch);
    setSpices((prev) => prev.map((s) => s.id === id ? updated : s));
  }, []);

  const removeSpiceFn = useCallback(async (id: string) => {
    await deleteSpice(id);
    setSpices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const removeAllPantryFn = useCallback(async () => {
    await Promise.all(pantry.map((p) => deletePantryItem(p.id)));
    setPantry([]);
  }, [pantry]);

  const removeAllSpicesFn = useCallback(async () => {
    await Promise.all(spices.map((s) => deleteSpice(s.id)));
    setSpices([]);
  }, [spices]);

  const cookRecipeFn = useCallback(async (ingredientDetails: IngredientDetail[]) => {
    if (!quantityTracking) return;
    const { pantry: newPantry, spices: newSpices } = await cookRecipeApi(ingredientDetails);
    setPantry(newPantry);
    setSpices(newSpices);
  }, [quantityTracking]);

  const value: InventoryState = {
    pantry, spices, loading, quantityTracking, setQuantityTracking,
    addPantry: addPantryFn,
    updatePantry: updatePantryFn,
    removePantry: removePantryFn,
    addSpiceItem: addSpiceFn,
    updateSpiceItem: updateSpiceFn,
    removeSpiceItem: removeSpiceFn,
    removeAllPantry: removeAllPantryFn,
    removeAllSpices: removeAllSpicesFn,
    cookRecipe: cookRecipeFn,
    refresh,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
