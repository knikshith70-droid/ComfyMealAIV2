import { supabase } from "./supabase";
import type { FlexSession, MealPlan, MealPlanDay, MealPlanSettings, NutritionHistoryEntry, PantryItem, PantryFlag, Profile, Recipe, Tier, SpiceItem, IngredientDetail } from "./supabase";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(profile: Profile): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function fetchOptions(category: string, userId?: string) {
  let query = supabase
    .from("custom_options")
    .select("id, category, value, created_by, created_at")
    .eq("category", category);

  query = userId
    ? query.or(`created_by.is.null,created_by.eq.${userId}`)
    : query.is("created_by", null);

  const { data, error } = await query.order("value", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addCustomOption(category: string, value: string, userId?: string) {
  const v = value.trim().toLowerCase();
  if (!userId) throw new Error("You must be signed in to add a custom option.");

  // First check for an option already owned by this user. This makes the
  // operation idempotent and avoids generating a duplicate-key error for
  // normal repeated submissions.
  const { data: existingBeforeInsert, error: lookupError } = await supabase
    .from("custom_options")
    .select("id, category, value, created_by, created_at")
    .eq("category", category)
    .eq("value", v)
    .eq("created_by", userId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingBeforeInsert) return existingBeforeInsert;

  const { data, error } = await supabase
    .from("custom_options")
    .insert({ category, value: v, created_by: userId })
    .select("id, category, value, created_by, created_at")
    .single();

  if (!error) return data;

  // A concurrent request (or an option created immediately before this
  // request) can still win the unique constraint between the lookup and
  // insert. Treat 23505 as a successful/idempotent outcome and retrieve the
  // existing row rather than surfacing a misleading duplicate error.
  if (error.code !== "23505") throw error;

  const { data: existingAfterDuplicate, error: duplicateLookupError } = await supabase
    .from("custom_options")
    .select("id, category, value, created_by, created_at")
    .eq("category", category)
    .eq("value", v)
    .eq("created_by", userId)
    .maybeSingle();

  if (duplicateLookupError) throw duplicateLookupError;
  return existingAfterDuplicate;
}

export async function deleteCustomOption(id: string) {
  const { error } = await supabase.from("custom_options").delete().eq("id", id);
  if (error) throw error;
}
export async function fetchPantry(): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from("pantry_items")
    .select("*")
    .order("logged_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PantryItem[];
}

export async function addPantryItem(name: string, quantity = 1, unit = "pieces"): Promise<PantryItem> {
  const { data, error } = await supabase
    .from("pantry_items")
    .insert({ name: name.trim(), quantity, unit })
    .select()
    .single();
  if (error) throw error;
  return data as PantryItem;
}

export async function addPantryItemsWithDate(names: string[], loggedAt: string): Promise<PantryItem[]> {
  if (names.length === 0) return [];
  const rows = names.map((name) => ({ name: name.trim(), logged_at: loggedAt }));
  const { data, error } = await supabase
    .from("pantry_items")
    .insert(rows)
    .select();
  if (error) throw error;
  return (data ?? []) as PantryItem[];
}

export async function updatePantryItem(id: string, patch: Partial<Pick<PantryItem, "name" | "quantity" | "unit" | "low_stock_threshold">>): Promise<PantryItem> {
  const { data, error } = await supabase
    .from("pantry_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as PantryItem;
}

export async function deletePantryItem(id: string) {
  const { error } = await supabase.from("pantry_items").delete().eq("id", id);
  if (error) throw error;
}

// --- Spices & Condiments ---

export async function fetchSpices(): Promise<SpiceItem[]> {
  const { data, error } = await supabase
    .from("spice_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SpiceItem[];
}

export async function addSpice(name: string, quantity = 1, unit = "tsp"): Promise<SpiceItem> {
  const { data, error } = await supabase
    .from("spice_items")
    .insert({ name: name.trim(), quantity, unit })
    .select()
    .single();
  if (error) throw error;
  return data as SpiceItem;
}

export async function updateSpice(id: string, patch: Partial<Pick<SpiceItem, "name" | "quantity" | "unit" | "low_stock_threshold">>): Promise<SpiceItem> {
  const { data, error } = await supabase
    .from("spice_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SpiceItem;
}

export async function deleteSpice(id: string) {
  const { error } = await supabase.from("spice_items").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Deduct used ingredient quantities from the pantry after cooking.
 * For each ingredient detail, match by normalized name against pantry items
 * (and spice items), subtract the quantity, delete items that reach 0, and
 * return the updated pantry + spices lists.
 */
export async function cookRecipe(
  ingredientDetails: IngredientDetail[],
): Promise<{ pantry: PantryItem[]; spices: SpiceItem[] }> {
  if (!ingredientDetails.length) {
    const [pantry, spices] = await Promise.all([fetchPantry(), fetchSpices()]);
    return { pantry, spices };
  }

  const norm = (s: string) => s.trim().toLowerCase();

  const [pantryItems, spiceItems] = await Promise.all([fetchPantry(), fetchSpices()]);

  const pantryByNorm = new Map(pantryItems.map((p) => [norm(p.name), p]));
  const spiceByNorm = new Map(spiceItems.map((s) => [norm(s.name), s]));

  const pantryUpdates: { id: string; quantity: number }[] = [];
  const pantryDeletes: string[] = [];
  const spiceUpdates: { id: string; quantity: number }[] = [];
  const spiceDeletes: string[] = [];

  for (const ing of ingredientDetails) {
    const key = norm(ing.name);
    if (!key) continue;
    const pMatch = pantryByNorm.get(key);
    if (pMatch) {
      const newQty = Math.max(0, Number((pMatch.quantity - ing.quantity).toFixed(2)));
      if (newQty <= 0) pantryDeletes.push(pMatch.id);
      else pantryUpdates.push({ id: pMatch.id, quantity: newQty });
      continue;
    }
    const sMatch = spiceByNorm.get(key);
    if (sMatch) {
      const newQty = Math.max(0, Number((sMatch.quantity - ing.quantity).toFixed(2)));
      if (newQty <= 0) spiceDeletes.push(sMatch.id);
      else spiceUpdates.push({ id: sMatch.id, quantity: newQty });
    }
  }

  if (pantryUpdates.length) {
    await Promise.all(pantryUpdates.map((u) => supabase.from("pantry_items").update({ quantity: u.quantity }).eq("id", u.id)));
  }
  if (pantryDeletes.length) {
    await supabase.from("pantry_items").delete().in("id", pantryDeletes);
  }
  if (spiceUpdates.length) {
    await Promise.all(spiceUpdates.map((u) => supabase.from("spice_items").update({ quantity: u.quantity }).eq("id", u.id)));
  }
  if (spiceDeletes.length) {
    await supabase.from("spice_items").delete().in("id", spiceDeletes);
  }

  const [pantry, spices] = await Promise.all([fetchPantry(), fetchSpices()]);
  return { pantry, spices };
}

export async function fetchLatestSession(): Promise<FlexSession | null> {
  const { data, error } = await supabase
    .from("flex_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as FlexSession | null;
}

export async function saveSession(session: Omit<FlexSession, "id" | "user_id" | "created_at">) {
  const { error } = await supabase.from("flex_sessions").insert(session);
  if (error) throw error;
}

export async function saveRecipe(recipe: Recipe) {
  const { error } = await supabase.from("saved_recipes").insert({
    title: recipe.title,
    description: recipe.description,
    time_minutes: recipe.time_minutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    tags: recipe.tags,
    nutrition: recipe.nutrition ?? null,
    ingredient_details: recipe.ingredient_details ?? null,
  });
  if (error) throw error;
}

export async function deleteSavedRecipe(id: string) {
  const { error } = await supabase.from("saved_recipes").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSavedRecipes() {
  const { data, error } = await supabase
    .from("saved_recipes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Nutrition history

export async function addNutritionHistory(recipe: Recipe, mealType: string): Promise<void> {
  const { error } = await supabase.from("nutrition_history").insert({
    recipe_title: recipe.title,
    meal_type: mealType,
    recipe_data: recipe,
    nutrition: recipe.nutrition ?? null,
  });
  if (error) throw error;
}

export async function fetchNutritionHistory(limit = 50): Promise<NutritionHistoryEntry[]> {
  const { data, error } = await supabase
    .from("nutrition_history")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NutritionHistoryEntry[];
}

export async function fetchRecentHistory(count = 5): Promise<NutritionHistoryEntry[]> {
  const { data, error } = await supabase
    .from("nutrition_history")
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(count);
  if (error) throw error;
  return (data ?? []) as NutritionHistoryEntry[];
}

export interface GenerateResponse {
  recipes: Recipe[];
  pantry_flags: PantryFlag[];
}

export async function generateRecipe(payload: {
  profile: Profile;
  pantry: PantryItem[];
  spices?: SpiceItem[];
  flex: {
    stock_level: string;
    cook_capacity: string;
    meal_type: string;
    comfort_score: number;
  };
  tier: Tier;
  language: string;
  recentRecipes?: { title: string; tags: string[]; generated_at: string }[];
}): Promise<GenerateResponse> {
  return callEdgeFunction<GenerateResponse>("generate-recipe", payload);
}

export async function adjustRecipe(payload: {
  profile: Profile;
  pantry: PantryItem[];
  spices?: SpiceItem[];
  flex: {
    stock_level: string;
    cook_capacity: string;
    meal_type: string;
    comfort_score: number;
  };
  tier: Tier;
  language: string;
  adjustment: string;
  previousRecipe: Recipe;
}): Promise<GenerateResponse> {
  return callEdgeFunction<GenerateResponse>("generate-recipe", {
    ...payload,
    action: "adjust",
  });
}

// Meal Plan Generator

export interface MealPlanResponse {
  plan: MealPlanDay[];
}

export async function generateMealPlan(payload: {
  profile: Profile;
  pantry: PantryItem[];
  spices?: SpiceItem[];
  duration: string;
  settings: MealPlanSettings;
  language: string;
  regenerate?: { dayIndex: number; mealSlot: string };
  existingPlan?: MealPlanDay[];
}): Promise<MealPlanResponse> {
  return callEdgeFunction<MealPlanResponse>("generate-meal-plan", payload);
}

export async function saveMealPlan(duration: string, settings: MealPlanSettings, planData: MealPlanDay[]): Promise<MealPlan> {
  const { data, error } = await supabase
    .from("meal_plans")
    .insert({ duration, settings, plan_data: planData })
    .select()
    .single();
  if (error) throw error;
  return data as MealPlan;
}

export async function fetchMealPlans(): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MealPlan[];
}

async function callEdgeFunction<T>(name: string, body: unknown): Promise<T> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  let json: unknown = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Server returned a non-JSON response (status ${res.status}).`);
  }

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Request failed (${res.status}).`);
    throw new Error(message);
  }

  return json as T;
}
