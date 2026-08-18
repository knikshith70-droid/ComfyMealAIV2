import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  te: "Telugu (తెలుగు)",
  hi: "Hindi (हिन्दी)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  ar: "Arabic (العربية)",
};

const DURATION_DAYS: Record<string, number> = {
  "1day": 1,
  "3day": 3,
  "1week": 7,
  "2week": 14,
  "1month": 30,
};

interface PantryItem { name: string; logged_at: string; quantity?: number; unit?: string; }
interface SpiceItem { name: string; quantity?: number; unit?: string; }
interface Profile {
  allergies: string[]; lifestyle: string[]; cuisines: string[];
  adults: number; children: number; goals: string[];
  cuisine_theme: string[]; comfort_style: string[]; adventure_level: string[];
  cooking_skill: string[]; meal_occasion: string[]; flavor_profile: string[];
}
interface PlanSettings {
  budget: string;
  cook_time: string;
  dietary: string[];
}
interface RequestBody {
  profile: Profile;
  pantry: PantryItem[];
  spices?: SpiceItem[];
  duration: string;
  settings: PlanSettings;
  language?: string;
  regenerate?: { dayIndex: number; mealSlot: string };
  existingPlan?: DayPlan[];
}

interface Nutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface IngredientDetail {
  name: string;
  quantity: number;
  unit: string;
}

interface RecipeShape {
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

interface DayPlan {
  date: string;
  breakfast: RecipeShape;
  lunch: RecipeShape;
  dinner: RecipeShape;
  snacks: RecipeShape;
}

function buildPrompt(body: RequestBody, days: number) {
  const { profile, pantry, settings, language = "en", spices = [] } = body;
  const langName = LANGUAGE_NAMES[language] ?? "English";
  const pantryNames = pantry.map((p) => p.name);
  const spiceList = spices.map((s) => `${s.name} (${s.quantity ?? 1} ${s.unit ?? "tsp"})`);

  const servings = Math.max(1, (profile.adults || 1) + Math.max(0, Math.round((profile.children || 0) * 0.6)));

  const allergiesLine = profile.allergies.length ? profile.allergies.join(", ") : "none";
  const lifestyleLine = profile.lifestyle.length ? profile.lifestyle.join(", ") : "none specified";
  const cuisinesLine = profile.cuisines.length ? profile.cuisines.join(", ") : "no preference";
  const goalsLine = profile.goals.length ? profile.goals.join(", ") : "none specified";
  const themeLine = profile.cuisine_theme?.length ? profile.cuisine_theme.join(", ") : "no preference";
  const comfortLine = profile.comfort_style?.length ? profile.comfort_style.join(", ") : "no preference";
  const adventureLine = profile.adventure_level?.length ? profile.adventure_level.join(", ") : "no preference";
  const skillLine = profile.cooking_skill?.length ? profile.cooking_skill.join(", ") : "not specified";
  const occasionLine = profile.meal_occasion?.length ? profile.meal_occasion.join(", ") : "not specified";
  const flavorLine = profile.flavor_profile?.length ? profile.flavor_profile.join(", ") : "no preference";

  const budgetLabel =
    settings.budget === "low" ? "budget-friendly (low cost ingredients, minimal waste)" :
    settings.budget === "mid" ? "mid-range (balanced cost and quality)" :
    settings.budget === "high" ? "premium (quality ingredients, cost is not a concern)" :
    "any budget";

  const cookTimeLabel =
    settings.cook_time === "quick" ? "quick meals (under 30 minutes each)" :
    settings.cook_time === "standard" ? "standard meals (30-60 minutes each)" :
    settings.cook_time === "leisurely" ? "leisurely meals (60+ minutes, from-scratch)" :
    "any cook time";

  const dietaryLine = settings.dietary?.length ? settings.dietary.join(", ") : "from onboarding profile";

  const isRegen = body.regenerate != null && body.existingPlan != null;

  const system = `You are ComfyMeal AI, a practical meal-planning sous-chef. You design multi-day meal plans that use what the user actually has in their pantry and spice rack. You ALWAYS respond with strict JSON and nothing else.

CORE RULES (never violate):
- The pantry is an INVENTORY of available ingredients — NOT a checklist of items that must all be used in every meal. Select ONLY the ingredients that are appropriate for each specific meal slot.
- MEAL TYPE HAS THE HIGHEST PRIORITY. Only use ingredients that naturally belong in each meal slot:
  * Breakfast: eggs, bread, oats, milk, fruits, vegetables, cheese, yogurt, pancakes, granola, etc.
  * Lunch/Dinner: chicken, rice, pasta, vegetables, lentils, beans, fish, meat, grains, etc.
  * Snacks: fruits, yogurt, nuts, sandwiches, smoothies, dips, crackers, etc.
- Do NOT force an ingredient into a meal simply because it exists in the pantry. For example, never add chicken to breakfast or rice to a smoothie. Different meals should use different subsets of the pantry — not all items in every meal.
- Use ONLY ingredients that naturally belong together in the selected cuisine and meal type. A realistic, balanced dish is more important than using more pantry items.
- You may ONLY use spices and condiments from the user's SPICE & CONDIMENT LIST. Do NOT assume the user has any spice, oil, sauce, or condiment that is NOT in that list. If a recipe needs a spice the user doesn't have, either omit it, substitute with an available one, or list it under "missing_ingredients".
- If the spice list is empty, assume ONLY salt, black pepper, and water are available. Do NOT assume cooking oil, butter, or any other condiment unless it appears in the spice list.
- Allergies and exclusions are HARD CONSTRAINTS — never include any allergen.
- Honor the dietary lifestyle strictly.
- VARIETY IS CRITICAL: across the ${days} day${days > 1 ? "s" : ""}, avoid repeating the same dish. Vary proteins, techniques, and flavor profiles. Do not serve the same meal twice.
- NUTRITIONAL BALANCE: aim for balanced daily totals (calories, protein, carbs, fat) appropriate for the household size.
- Each day has exactly 4 slots: breakfast, lunch, dinner, snacks.

DISH DIVERSITY (CRITICAL):
- Each meal across ALL days must be UNIQUE - no repeated dishes, no similar flavor profiles on consecutive days.
- VARY cooking techniques: stir-fry, roast, simmer/soup, grill, steam, raw/assembly, bake, saute.
- VARY flavor directions: savory/umami, tangy/citrusy, spicy, fresh/herby, rich/creamy, smoky.
- VARY global inspiration: Italian, Mexican, Indian, Thai, Chinese, Mediterranean, Japanese, Middle Eastern, American comfort, French, Vietnamese, Korean.
- Breakfasts: think beyond just eggs - consider porridges, smoothie bowls, pancakes, savory breakfasts, breakfast wraps, baked goods, yogurt parfaits.
- Lunches: salads, grain bowls, sandwiches, wraps, soups, leftovers-reimagined, poke bowls.
- Dinners: one-pot meals, stir-fries, roasted dishes, pasta, curries, stews, sheet-pan meals.
- Snacks: energy bites, roasted nuts, fruit combinations, dip and chips, mini wraps, savory bites.

LANGUAGE (CRITICAL — MUST FOLLOW): Generate this entire meal plan in ${langName}. ALL text — including every recipe title, description, every ingredient name (with quantity), every step instruction, and all tags — MUST be written in ${langName} ONLY. Do NOT mix languages. Do NOT use English unless ${langName} IS English. Use natural, fluent ${langName} appropriate for a home cook.`;

  let user = `Generate a ${days}-day meal plan. Each day needs breakfast, lunch, dinner, and snacks. CRITICAL DIVERSITY: Every single meal must be FUNDAMENTALLY DIFFERENT - different cooking technique, different flavor profile, different global inspiration. No two meals should feel similar.

USER PROFILE:
- Allergies / exclusions (HARD CONSTRAINT): ${allergiesLine}
- Dietary lifestyle (HARD CONSTRAINT): ${lifestyleLine}
- Preferred cuisines: ${cuisinesLine}
- Cuisine theme preference: ${themeLine}
- Comfort style preference: ${comfortLine}
- Adventure level: ${adventureLine}
- Cooking skill level: ${skillLine}
- Typical meal occasions: ${occasionLine}
- Flavor preferences: ${flavorLine}
- Household: ${profile.adults} adults, ${profile.children} children
- Servings to target per meal: ${servings}
- Goals: ${goalsLine}

PLAN SETTINGS:
- Budget: ${budgetLabel}
- Cook time: ${cookTimeLabel}
- Dietary preferences: ${dietaryLine}

PANTRY INVENTORY (choose from these for each meal — do NOT use all items in every meal; select only what fits each meal slot):
${pantryNames.length ? pantryNames.join(", ") : "(pantry is empty — suggest very simple meals using only the spices/condiments listed, salt, pepper, water)"}

SPICES & CONDIMENTS AVAILABLE (use ONLY these — do NOT assume any spice/condiment not listed here):
${spiceList.length ? spiceList.join(", ") : "(none listed — assume ONLY salt, black pepper, and water; do NOT assume oil, butter, or any other condiment)"}

ALLOWED ADDITIONS (only if not covered above): salt, black pepper, water. Any other spice, oil, sauce, or condiment MUST come from the SPICES & CONDIMENTS list.

OUTPUT REQUIREMENTS:
1. CRITICAL: Return a "days" array with EXACTLY ${days} day object${days > 1 ? "s" : ""}. If you generate fewer than ${days} days, the plan will be REJECTED. Count the days before responding and ensure there are exactly ${days}.
2. Each day object has: "date" (ISO date string starting tomorrow), "breakfast", "lunch", "dinner", "snacks" — each a full recipe object. Every day MUST have all 4 slots. Never omit a slot.
3. Each recipe has: title, description, time_minutes, servings, ingredients (ALWAYS with specific quantities like "200g rice", "2 medium onions", "1 cup lentils" — never list an ingredient without a quantity), ingredient_details ([{"name": "...", "quantity": number, "unit": "..."}]), missing_ingredients (same shape, for items not in pantry/spices), steps, tags, nutrition (calories, protein_g, carbs_g, fat_g, fiber_g).
4. No repeated dishes across the whole plan.
5. Select only pantry ingredients that fit each meal slot. Do NOT include pantry items that are unsuitable for that meal type.

Respond with STRICT JSON (no markdown, no commentary):
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "breakfast": { "title": "...", "description": "...", "time_minutes": 0, "servings": 0, "ingredients": ["..."], "steps": ["..."], "tags": ["..."], "nutrition": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0 } },
      "lunch": { ... },
      "dinner": { ... },
      "snacks": { ... }
    }
  ]
}`;

  if (isRegen) {
    const { dayIndex, mealSlot } = body.regenerate!;
    user = `Here is the user's current meal plan:
${JSON.stringify(body.existingPlan, null, 2)}

Regenerate ONLY the "${mealSlot}" for day index ${dayIndex} (Day ${dayIndex + 1}). Keep all other meals exactly the same. The new ${mealSlot} must be distinct from every other meal in the plan and follow the same constraints.

HARD CONSTRAINTS (still apply):
- Allergies (never include): ${allergiesLine}
- Lifestyle (never violate): ${lifestyleLine}
- Pantry inventory (choose from, do NOT use all): ${pantryNames.join(", ") || "(empty)"}
- Spices & condiments available: ${spices.map((s) => s.name).join(", ") || "(none — only salt, pepper, water)"}
- Allowed additions: salt, black pepper, water. Any other spice/condiment MUST come from the spices list.

Return the FULL plan as STRICT JSON with the same "days" shape (all days, all 4 slots), with only the requested ${mealSlot} changed:
{
  "days": [ { "date": "...", "breakfast": {...}, "lunch": {...}, "dinner": {...}, "snacks": {...} }, ... ]
}`;
  }

  return { system, user };
}

async function callGroq(system: string, user: string, maxTokens: number) {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

async function callGroq(system: string, user: string, maxTokens: number) {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const MAX_ATTEMPTS = 3;
  let res: Response | undefined;
  let lastErrorText = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok) break;

    lastErrorText = await res.text().catch(() => "");
    const isJsonValidationFailure = lastErrorText.includes("json_validate_failed");
    const isLastAttempt = attempt === MAX_ATTEMPTS;

    // Only retry on the known gpt-oss JSON-validation flake - any other error fails immediately.
    if (!isJsonValidationFailure || isLastAttempt) {
      throw new Error(`Groq API error ${res.status}: ${lastErrorText.slice(0, 300)}`);
    }
  }

  if (!res || !res.ok) {
    throw new Error(`Groq API error: ${lastErrorText.slice(0, 300)}`);
  }

function normalizeRecipe(r: Record<string, unknown>): RecipeShape {
  return {
    title: typeof r.title === "string" ? r.title : "Untitled",
    description: typeof r.description === "string" ? r.description : "",
    time_minutes: Number(r.time_minutes) || 30,
    servings: Number(r.servings) || 1,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients as string[] : [],
    ingredient_details: Array.isArray(r.ingredient_details)
      ? (r.ingredient_details as Record<string, unknown>[]).map((d) => ({
          name: String(d.name ?? ""),
          quantity: Number(d.quantity) || 0,
          unit: String(d.unit ?? "pieces"),
        })).filter((d) => d.name)
      : [],
    missing_ingredients: Array.isArray(r.missing_ingredients)
      ? (r.missing_ingredients as Record<string, unknown>[]).map((d) => ({
          name: String(d.name ?? ""),
          quantity: Number(d.quantity) || 0,
          unit: String(d.unit ?? "pieces"),
        })).filter((d) => d.name)
      : [],
    steps: Array.isArray(r.steps) ? r.steps as string[] : [],
    tags: Array.isArray(r.tags) ? r.tags as string[] : [],
    nutrition: typeof r.nutrition === "object" && r.nutrition !== null
      ? {
          calories: Number((r.nutrition as Record<string, unknown>).calories) || 0,
          protein_g: Number((r.nutrition as Record<string, unknown>).protein_g) || 0,
          carbs_g: Number((r.nutrition as Record<string, unknown>).carbs_g) || 0,
          fat_g: Number((r.nutrition as Record<string, unknown>).fat_g) || 0,
          fiber_g: Number((r.nutrition as Record<string, unknown>).fiber_g) || 0,
        }
      : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  };
}

function normalizePlan(parsed: unknown): DayPlan[] {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Groq response was not a valid object.");
  }
  const obj = parsed as Record<string, unknown>;
  let arr: unknown;
  if (Array.isArray(obj.days)) {
    arr = obj.days;
  } else {
    throw new Error("Groq response did not contain a days array.");
  }
  const days: DayPlan[] = [];
  for (const d of arr as Record<string, unknown>[]) {
    if (typeof d !== "object" || d === null) continue;
    const day = d as Record<string, unknown>;
    days.push({
      date: typeof day.date === "string" ? day.date : new Date().toISOString().slice(0, 10),
      breakfast: normalizeRecipe(day.breakfast as Record<string, unknown>),
      lunch: normalizeRecipe(day.lunch as Record<string, unknown>),
      dinner: normalizeRecipe(day.dinner as Record<string, unknown>),
      snacks: normalizeRecipe(day.snacks as Record<string, unknown>),
    });
  }
  if (days.length === 0) {
    throw new Error("Groq response did not contain any valid days.");
  }
  return days;
}

const PLACEHOLDER_RECIPE: RecipeShape = {
  title: "Meal to be regenerated",
  description: "This meal slot was not generated correctly. Please use the regenerate button.",
  time_minutes: 30,
  servings: 1,
  ingredients: [],
  ingredient_details: [],
  missing_ingredients: [],
  steps: [],
  tags: [],
  nutrition: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
};

function repairPlan(days: DayPlan[], requestedCount: number): DayPlan[] {
  const SLOTS: (keyof DayPlan)[] = ["breakfast", "lunch", "dinner", "snacks"];

  const repaired = days.map((d) => {
    const fixed: DayPlan = { ...d };
    for (const slot of SLOTS) {
      if (!fixed[slot] || !fixed[slot].title) {
        fixed[slot] = { ...PLACEHOLDER_RECIPE };
      }
    }
    return fixed;
  });

  while (repaired.length < requestedCount) {
    const lastDate = repaired.length > 0 ? repaired[repaired.length - 1].date : new Date().toISOString().slice(0, 10);
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    repaired.push({
      date: next.toISOString().slice(0, 10),
      breakfast: { ...PLACEHOLDER_RECIPE },
      lunch: { ...PLACEHOLDER_RECIPE },
      dinner: { ...PLACEHOLDER_RECIPE },
      snacks: { ...PLACEHOLDER_RECIPE },
    });
  }

  return repaired.slice(0, requestedCount);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (!body || !body.profile || !body.duration || !Array.isArray(body.pantry)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: profile, duration, pantry." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const days = DURATION_DAYS[body.duration] ?? 1;
    const { system, user } = buildPrompt(body, days);
    const maxTokens = Math.min(32000, 2500 + days * 800);
    const parsed = await callGroq(system, user, maxTokens);
    const plan = repairPlan(normalizePlan(parsed), days);

    return new Response(
      JSON.stringify({ plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
