import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type OptionCategory = "allergy" | "lifestyle" | "cuisine" | "goal" | "cuisine_theme" | "comfort_style" | "adventure_level" | "cooking_skill" | "meal_occasion" | "flavor_profile" | "meal_type";

export interface CustomOption {
  id: string;
  category: OptionCategory;
  value: string;
  created_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  allergies: string[];
  lifestyle: string[];
  cuisines: string[];
  adults: number;
  children: number;
  goals: string[];
  cuisine_theme: string[];
  comfort_style: string[];
  adventure_level: string[];
  cooking_skill: string[];
  meal_occasion: string[];
  flavor_profile: string[];
  onboarded: boolean;
  language: string;
  quantity_tracking_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  logged_at: string;
  created_at?: string;
}

export interface SpiceItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  created_at: string;
}

export interface IngredientDetail {
  name: string;
  quantity: number;
  unit: string;
}

export interface FlexSession {
  id: string;
  user_id: string;
  stock_level: string;
  cook_capacity: string;
  meal_type: string;
  comfort_score: number;
  pantry_snapshot: string[];
  created_at: string;
}

export interface Nutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface Recipe {
  title: string;
  description: string;
  time_minutes: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
  nutrition?: Nutrition;
  ingredient_details?: IngredientDetail[];
  missing_ingredients?: IngredientDetail[];
}

export type Tier = "standard" | "plus" | "pro";

export interface SavedRecipe extends Recipe {
  id: string;
  user_id: string;
  created_at: string;
  nutrition?: Nutrition;
  ingredient_details?: IngredientDetail[] | null;
}

export interface NutritionHistoryEntry {
  id: string;
  user_id: string;
  recipe_title: string;
  meal_type: string;
  recipe_data: Recipe;
  nutrition: Nutrition | null;
  generated_at: string;
}

export interface PantryFlag {
  name: string;
  logged_at: string;
  use_soon: boolean;
  days_left: number | null;
  shelf_life_days: number | null;
}

export interface MealPlanDay {
  date: string;
  breakfast: Recipe;
  lunch: Recipe;
  dinner: Recipe;
  snacks: Recipe;
}

export interface MealPlan {
  id: string;
  user_id: string;
  duration: string;
  settings: MealPlanSettings;
  plan_data: MealPlanDay[];
  created_at: string;
}

export interface MealPlanSettings {
  budget: string;
  cook_time: string;
  dietary: string[];
}
