import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Shelf-life reference table (in days). Keys are lowercased ingredient names.
const SHELF_LIFE_DAYS: Record<string, number> = {
  chicken: 2, turkey: 2, beef: 3, pork: 3, fish: 2, salmon: 2, tuna: 2, shrimp: 2, bacon: 7, sausage: 7, tofu: 5, tempeh: 5, eggs: 21,
  milk: 5, yogurt: 7, cheese: 14, feta: 7, mozzarella: 7, parmesan: 30, cream: 7, butter: 14, sourcream: 10, cottagecheese: 7,
  spinach: 5, lettuce: 5, arugula: 5, kale: 7, salad: 5, mixedgreens: 5, swisschard: 5, collardgreens: 5,
  tomato: 7, tomatoes: 7, cucumber: 7, zucchini: 7, bellpepper: 7, pepper: 7, mushrooms: 5, mushroom: 5, avocado: 5, broccoli: 7, cauliflower: 7, asparagus: 5, greenbeans: 7, beans: 7, corn: 5, eggplant: 7, okra: 4, basil: 5, cilantro: 7, parsley: 7, mint: 7, scallions: 7, greenonion: 7, springonion: 7,
  carrot: 30, carrots: 30, potato: 30, potatoes: 30, onion: 30, onions: 30, garlic: 60, ginger: 21, sweetpotato: 30, beets: 21, beet: 21, radish: 14, radishes: 14, turnip: 21, parsnip: 21, leek: 14, leeks: 14, shallot: 30, celery: 14,
  banana: 5, bananas: 5, apple: 14, apples: 14, pear: 7, pears: 7, strawberry: 3, strawberries: 3, blueberry: 7, blueberries: 7, raspberry: 3, raspberries: 3, blackberry: 3, blackberries: 3, grape: 7, grapes: 7, orange: 14, lemon: 21, lime: 21, mango: 5, pineapple: 5, peach: 4, peaches: 4, plum: 5, plums: 5, watermelon: 7, melon: 7, kiwi: 7,
  bread: 5, baguette: 3, tortilla: 7, pita: 5, naan: 5, buns: 5, bagel: 5, croissant: 3,
  scallion: 7, chili: 7, jalapeno: 7, habanero: 7,
  "chili pepper": 7, "green onion": 7, "spring onion": 7, "bell pepper": 7, "sweet potato": 30, "cottage cheese": 7, "sour cream": 10, "mixed greens": 5, "swiss chard": 5, "collard greens": 5, "green beans": 7, "tree nuts": 180,
};

const SHELF_LIFE_WARNING_DAYS = 2;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-3.6-flash";

const TIER_COUNTS: Record<string, number> = { standard: 2, plus: 3, pro: 5 };

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  te: "Telugu (తెలుగు)",
  hi: "Hindi (हिन्दी)",
  es: "Spanish (Español)",
  fr: "French (Français)",
  ar: "Arabic (العربية)",
};

interface PantryItem { name: string; logged_at: string; quantity?: number; unit?: string; }
interface SpiceItem { name: string; quantity?: number; unit?: string; }
interface Profile {
  allergies: string[]; lifestyle: string[]; cuisines: string[];
  adults: number; children: number; goals: string[];
  cuisine_theme: string[]; comfort_style: string[]; adventure_level: string[];
  cooking_skill: string[]; meal_occasion: string[]; flavor_profile: string[];
}
interface FlexContext {
  stock_level: string; cook_capacity: string; meal_type: string; comfort_score: number;
}
interface RequestBody {
  action: "generate" | "adjust";
  profile: Profile;
  pantry: PantryItem[];
  spices?: SpiceItem[];
  flex: FlexContext;
  tier?: "standard" | "plus" | "pro";
  language?: string;
  adjustment?: string;
  previousRecipe?: RecipeShape;
  recentRecipes?: RecentRecipeHint[];
}

interface RecentRecipeHint {
  title: string;
  tags: string[];
  generated_at: string;
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

const NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    calories: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    fiber_g: { type: "number" },
  },
  required: ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"],
} as const;

const INGREDIENT_DETAIL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    quantity: { type: "number" },
    unit: { type: "string" },
  },
  required: ["name", "quantity", "unit"],
} as const;

const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    time_minutes: { type: "number" },
    servings: { type: "number" },
    ingredients: { type: "array", items: { type: "string" } },
    ingredient_details: { type: "array", items: INGREDIENT_DETAIL_SCHEMA },
    missing_ingredients: { type: "array", items: INGREDIENT_DETAIL_SCHEMA },
    steps: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    nutrition: NUTRITION_SCHEMA,
  },
  required: ["title", "description", "time_minutes", "servings", "ingredients", "ingredient_details", "missing_ingredients", "steps", "tags", "nutrition"],
} as const;

const RECIPE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    recipes: { type: "array", items: RECIPE_SCHEMA },
  },
  required: ["recipes"],
} as const;

function lookupShelfLife(name: string): number | null {
  const n = name.trim().toLowerCase();
  if (SHELF_LIFE_DAYS[n] != null) return SHELF_LIFE_DAYS[n];
  const singular = n.replace(/s$/, "");
  if (SHELF_LIFE_DAYS[singular] != null) return SHELF_LIFE_DAYS[singular];
  for (const key of Object.keys(SHELF_LIFE_DAYS)) {
    if (n.includes(key) || key.includes(n)) return SHELF_LIFE_DAYS[key];
  }
  return null;
}

function flagUseSoon(pantry: PantryItem[]) {
  const now = Date.now();
  return pantry.map((item) => {
    const logged = new Date(item.logged_at).getTime();
    const ageDays = Math.max(0, (now - logged) / (1000 * 60 * 60 * 24));
    const shelfLife = lookupShelfLife(item.name);
    if (shelfLife == null) {
      return { ...item, use_soon: false, days_left: null, shelf_life_days: null };
    }
    const daysLeft = Math.round(shelfLife - ageDays);
    return {
      ...item,
      use_soon: daysLeft <= SHELF_LIFE_WARNING_DAYS,
      days_left: daysLeft,
      shelf_life_days: shelfLife,
    };
  });
}

function buildPrompt(body: RequestBody, flaggedPantry: ReturnType<typeof flagUseSoon>) {
  const { profile, flex, adjustment, previousRecipe, action, tier = "standard", language = "en", spices = [] } = body;
  const count = TIER_COUNTS[tier] ?? 2;
  const langName = LANGUAGE_NAMES[language] ?? "English";

  const useSoonItems = flaggedPantry.filter((p) => p.use_soon).map((p) => p.name);
  const pantryNames = body.pantry.map((p) => p.name);
  const spiceNames = spices.map((s) => s.name);
  const spiceList = spices.map((s) => `${s.name} (${s.quantity ?? 1} ${s.unit ?? "tsp"})`);

  const capacityLabel =
    flex.cook_capacity === "quick" ? "Quick & Easy (under 25 minutes, minimal cleanup)" :
    flex.cook_capacity === "proper" ? "Cook properly today (no time limit, from-scratch techniques welcome)" :
    "Standard (30-45 minutes, balanced effort)";

  const comfortLabel =
    flex.comfort_score <= 33 ? "comfort food / familiar flavors" :
    flex.comfort_score >= 67 ? "adventurous / try something new and bold" :
    "balanced between comfort and adventure";

  const stockLabel =
    flex.stock_level === "empty" ? "pantry is mostly empty — only the listed pantry items plus basic staples are available" :
    flex.stock_level === "full" ? "kitchen is fully stocked — the listed pantry items plus all common pantry staples are available" :
    "kitchen is averagely stocked — the listed pantry items plus basic staples are available";

  const servings = Math.max(1, (profile.adults || 1) + Math.max(0, Math.round((profile.children || 0) * 0.6)));

  const allergiesLine = profile.allergies.length ? profile.allergies.join(", ") : "none";
  const lifestyleLine = profile.lifestyle.length ? profile.lifestyle.join(", ") : "none specified";
  const cuisinesLine = profile.cuisines.length ? profile.cuisines.join(", ") : "no preference";
  const goalsLine = profile.goals.length ? profile.goals.join(", ") : "none specified";
  const themeLine = profile.cuisine_theme?.length ? profile.cuisine_theme.join(", ") : "no preference";
  const comfortStyleLine = profile.comfort_style?.length ? profile.comfort_style.join(", ") : "no preference";
  const adventureLine = profile.adventure_level?.length ? profile.adventure_level.join(", ") : "no preference";
  const skillLine = profile.cooking_skill?.length ? profile.cooking_skill.join(", ") : "not specified";
  const occasionLine = profile.meal_occasion?.length ? profile.meal_occasion.join(", ") : "not specified";
  const flavorLine = profile.flavor_profile?.length ? profile.flavor_profile.join(", ") : "no preference";

  // Build a learning signal from the user's recent recipe history.
  // Weight more recent recipes higher (exponential decay), then surface the
  // most common tags so the model leans toward cuisines/dish styles the user
  // has actually generated or revisited before.
  const recent = (body.recentRecipes ?? []).slice(0, 30);
  const tagWeights: Record<string, number> = {};
  const titleList: string[] = [];
  const now = Date.now();
  for (const r of recent) {
    const ageDays = Math.max(0, (now - new Date(r.generated_at).getTime()) / 86400000);
    const weight = Math.exp(-ageDays / 14); // half-life ~10 days
    for (const tag of (r.tags ?? [])) {
      const key = tag.trim().toLowerCase();
      if (!key) continue;
      tagWeights[key] = (tagWeights[key] ?? 0) + weight;
    }
    if (r.title) titleList.push(r.title);
  }
  const topTags = Object.entries(tagWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  const learningLine = topTags.length
    ? `LEARNING SIGNAL — based on the user's recent history, they tend to enjoy recipes tagged with: ${topTags.join(", ")}. Lean toward similar cuisines, ingredients, or dish styles where it fits the pantry and constraints, while still keeping the new suggestions distinct from these recent ones: ${titleList.slice(0, 8).join(", ")}.`
    : "";

  const tierNote =
    tier === "pro" ? "This is the Pro tier — provide advanced personalization: creative flavor pairings, technique-driven steps, and varied global inspiration across the recipes. Make each recipe distinctly different from the others." :
    tier === "plus" ? "This is the Plus tier — provide a good variety across the recipes with thoughtful personalization." :
    "This is the Standard tier — provide solid, reliable recipes.";

  let system = `You are ComfyMeal AI, a practical meal-planning sous-chef. You design recipes that use what the user actually has in their pantry and spice rack. You ALWAYS respond with ONLY raw JSON — no markdown, no code fences, no \`\`\`json wrappers, no <think> tags, no explanations, no introductory text, no trailing commentary.

CORE RULES (never violate):
- The pantry is an INVENTORY of available ingredients — NOT a checklist of items that must all be used. Select ONLY the ingredients that are appropriate for the requested meal type and cuisine. Leave unsuitable ingredients unused for future recipes.
- MEAL TYPE HAS THE HIGHEST PRIORITY. Only use ingredients that naturally belong in the requested meal type:
  * Breakfast: eggs, bread, oats, milk, fruits, vegetables, cheese, yogurt, pancakes, granola, etc.
  * Lunch/Dinner: chicken, rice, pasta, vegetables, lentils, beans, fish, meat, grains, etc.
  * Snacks: fruits, yogurt, nuts, sandwiches, smoothies, dips, crackers, etc.
  * Dessert: fruits, chocolate, cream, milk, butter, sugar, flour, etc.
- Do NOT force an ingredient into a recipe simply because it exists in the pantry. For example, never add chicken to breakfast or rice to a smoothie.
- Use ONLY ingredients that naturally belong together in the selected cuisine and meal type. A realistic, balanced dish is more important than using more pantry items.
- You may ONLY use spices and condiments from the user's SPICE & CONDIMENT LIST. Do NOT assume the user has any spice, oil, sauce, or condiment that is NOT in that list. If a recipe needs a spice the user doesn't have, either omit it, substitute with an available one, or list it under "missing_ingredients".
- If the spice list is empty, assume ONLY salt, black pepper, and water are available. Do NOT assume cooking oil, butter, or any other condiment unless it appears in the spice list.
- Allergies and exclusions are HARD CONSTRAINTS — never include any ingredient that contains or is derived from a listed allergen. When in doubt, leave it out.
- Honor the dietary lifestyle strictly (vegan = no animal products, vegetarian = no meat/fish, keto = very low carb, etc.).
- If use-soon items are listed, consider featuring one of them IF AND ONLY IF it logically fits the requested meal type. Do not force a use-soon item into a meal where it does not belong.
- ${tierNote}

DISH DIVERSITY (CRITICAL):
- When generating multiple recipes, each MUST be fundamentally different: different cooking techniques (stir-fry, roast, simmer, grill, raw/assembly), different flavor directions (tangy, savory, spicy, fresh/herby, rich/creamy), and different primary ingredients.
- Consider: soups vs salads vs grain bowls vs stir-fries vs roasted dishes vs sandwiches vs wraps vs one-pot meals.
- Draw from global cuisines: Italian, Mexican, Indian, Thai, Chinese, Mediterranean, Japanese, Middle Eastern, American comfort, French, Vietnamese, Korean, etc.
- NO two recipes should share the same primary cooking technique or flavor profile.
- Each recipe title must be unique and descriptive.

LANGUAGE (CRITICAL — MUST FOLLOW): Generate this entire recipe in ${langName}. ALL text — including recipe title, description, every ingredient name (with quantity), every step instruction, and all tags — MUST be written in ${langName} ONLY. Do NOT mix languages. Do NOT use English unless ${langName} IS English. Use natural, fluent ${langName} appropriate for a home cook.`;

  let user = `Generate ${count} ${flex.meal_type} recipe${count > 1 ? "s" : ""}. CRITICAL: Each recipe must be FUNDAMENTALLY DIFFERENT from the others - different cooking technique (roast, stir-fry, simmer, grill, assemble raw), different flavor direction (savory/umami, tangy/citrus, spicy, fresh/herby, rich/creamy), and different primary pantry ingredient focus.

USER PROFILE:
- Allergies / exclusions (HARD CONSTRAINT — never include): ${allergiesLine}
- Dietary lifestyle (HARD CONSTRAINT — never violate): ${lifestyleLine}
- Preferred cuisines (lean toward when possible): ${cuisinesLine}
- Cuisine theme preference: ${themeLine}
- Comfort style preference: ${comfortStyleLine}
- Adventure level: ${adventureLine}
- Cooking skill level: ${skillLine}
- Typical meal occasions: ${occasionLine}
- Flavor preferences: ${flavorLine}
- Household: ${profile.adults} adults, ${profile.children} children
- Servings to target: ${servings}
- Goals that matter to them: ${goalsLine}

CURRENT CONTEXT:
- Kitchen stock level: ${stockLabel}
- Cook capacity today: ${capacityLabel}
- Comfort-to-adventurous slider: ${flex.comfort_score}/100 → ${comfortLabel}

PANTRY INVENTORY (choose from these — do NOT use all of them; select only what fits the meal type):
${pantryNames.length ? pantryNames.join(", ") : "(pantry is empty — suggest very simple recipes using only the spices/condiments listed, salt, pepper, and water, and note in the description that the pantry is empty)"}

SPICES & CONDIMENTS AVAILABLE (use ONLY these — do NOT assume any spice/condiment not listed here):
${spiceList.length ? spiceList.join(", ") : "(none listed — assume ONLY salt, black pepper, and water; do NOT assume oil, butter, or any other condiment)"}

${useSoonItems.length ? `USE-SOON ITEMS (at least one recipe MUST feature one of these prominently — they are near spoilage): ${useSoonItems.join(", ")}\n` : ""}${learningLine ? `${learningLine}\n\n` : ""}ALLOWED ADDITIONS (only if not covered above): salt, black pepper, water. Any other spice, oil, sauce, or condiment MUST come from the SPICES & CONDIMENTS list. Do NOT invent other ingredients.

OUTPUT REQUIREMENTS:
1. Select only pantry ingredients that fit the meal type. List each ingredient with a SPECIFIC QUANTITY (e.g. "2 medium tomatoes", "200g paneer", "1 cup rice", "3 cloves garlic", "2 tbsp olive oil"). NEVER list an ingredient without a quantity. Do NOT include pantry items that are unsuitable for the meal type.
2. Steps must be concrete and cookable with the listed ingredients only.
3. Match the cook capacity and meal type realistically.
4. Target the servings count above.
5. For each recipe, provide a realistic per-serving nutrition estimate (calories, protein_g, carbs_g, fat_g, fiber_g).
6. Keep ingredients realistic and commonly available.
7. For each recipe, provide "ingredient_details" — an array of { name, quantity, unit } for EVERY ingredient used. The name should match the pantry/spice item name when possible. Use standard units (g, kg, ml, L, tsp, tbsp, cups, pieces, cloves, slices, cans).
8. If a recipe requires a spice or condiment that is NOT in the user's SPICES & CONDIMENTS list, add it to "missing_ingredients" as { name, quantity, unit } and note it as optional in the recipe description.

Respond with STRICT JSON in this exact shape (no markdown, no commentary):
{
  "recipes": [
    {
      "title": "string — recipe name in ${langName}",
      "description": "string — 1-2 sentence appetizing summary in ${langName}",
      "time_minutes": number,
      "servings": number,
      "ingredients": ["string with quantity in ${langName}", ...],
      "ingredient_details": [{"name": "string", "quantity": number, "unit": "string"}, ...],
      "missing_ingredients": [{"name": "string", "quantity": number, "unit": "string"}, ...],
      "steps": ["string in ${langName}", ...],
      "tags": ["string in ${langName}", ...],
      "nutrition": {
        "calories": number,
        "protein_g": number,
        "carbs_g": number,
        "fat_g": number,
        "fiber_g": number
      }
    }
  ]
}`;

  if (action === "adjust" && adjustment && previousRecipe) {
    system += ` When adjusting, keep the same JSON shape but return a "recipes" array with a single adjusted recipe. Apply the requested change while staying within the user's dietary constraints and the pantry-first rule.`;
    user = `Here is a recipe the user just received:
${JSON.stringify(previousRecipe, null, 2)}

Apply this micro-adjustment: "${adjustment}"

HARD CONSTRAINTS (still apply):
- Allergies (never include): ${allergiesLine}
- Lifestyle (never violate): ${lifestyleLine}
- Pantry inventory (choose from, do NOT use all): ${pantryNames.join(", ") || "(empty)"}
- Spices & condiments available: ${spiceNames.join(", ") || "(none — only salt, pepper, water)"}
- Allowed additions: salt, black pepper, water. Any other spice/condiment MUST come from the spices list.

Return the FULL adjusted recipe as STRICT JSON with this shape (no markdown, no commentary):
{
  "recipes": [
    {
      "title": "string in ${langName}",
      "description": "string in ${langName}",
      "time_minutes": number,
      "servings": number,
      "ingredients": ["string in ${langName}", ...],
      "ingredient_details": [{"name": "string", "quantity": number, "unit": "string"}, ...],
      "missing_ingredients": [{"name": "string", "quantity": number, "unit": "string"}, ...],
      "steps": ["string in ${langName}", ...],
      "tags": ["string in ${langName}", ...],
      "nutrition": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number }
    }
  ]
}`;
  }

  return { system, user };
}

async function callLLM(system: string, user: string, maxTokens: number) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const MAX_ATTEMPTS = 5;
  const TOKEN_CAP = 65536;
  let currentMaxTokens = maxTokens;
  let res: Response | undefined;
  let lastErrorText = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        max_tokens: currentMaxTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recipe_response",
            strict: true,
            schema: RECIPE_RESPONSE_SCHEMA,
          },
        },
      }),
    });

    if (!res.ok) {
      lastErrorText = await res.text().catch(() => "");
      const isRetryable = lastErrorText.includes("json_validate_failed") || res.status === 429;
      const isLastAttempt = attempt === MAX_ATTEMPTS;

      if (!isRetryable || isLastAttempt) {
        throw new Error(`LLM API error ${res.status}: ${lastErrorText.slice(0, 300)}`);
      }

      if (res.status === 429) {
        const retryMatch = lastErrorText.match(/try again in ([0-9.]+)s/i);
        const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500 : 5000;
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 30000)));
      }
      continue;
    }

    // Success — inspect the response metadata
    const data = await res.json();
    const choice = data?.choices?.[0];
    const content: string | undefined = choice?.message?.content;
    const finishReason: string | undefined = choice?.finish_reason;
    const usage = data?.usage;

    if (!content) {
      throw new Error(
        `LLM returned an empty response. finish_reason=${finishReason}, usage=${JSON.stringify(usage)}`,
      );
    }

    // If the response was truncated due to max_tokens, retry with more capacity
    if (finishReason === "length" && currentMaxTokens < TOKEN_CAP) {
      currentMaxTokens = Math.min(currentMaxTokens * 2, TOKEN_CAP);
      continue;
    }

    const parsed = extractJSON(content);
    return parsed;
  }

  throw new Error(`LLM call failed after ${MAX_ATTEMPTS} attempts. Last error: ${lastErrorText.slice(0, 300)}`);
}

function extractJSON(content: string): unknown {
  let cleaned = content.trim();

  // Gemini often wraps JSON in ```json ... ``` fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Strip <think>...</think> tags that some Gemini models emit
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to extraction
  }

  // Extract the outermost JSON object or array
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  const candidate = objMatch
    ? cleaned.slice(objMatch.index!, objMatch.index! + objMatch[0].length)
    : arrMatch
    ? cleaned.slice(arrMatch.index!, arrMatch.index! + arrMatch[0].length)
    : null;

  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try fixing common issues: trailing commas before } or ]
      const fixed = candidate.replace(/,\s*([}\]])/g, "$1");
      try {
        return JSON.parse(fixed);
      } catch {
        // Fall through to error
      }
    }
  }

  throw new Error(
    `Could not parse JSON from LLM response. Response preview: ${content.slice(0, 500)}`,
  );
}

function normalizeRecipes(parsed: unknown): RecipeShape[] {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM response was not a valid object.");
  }
  const obj = parsed as Record<string, unknown>;
  // Accept either { recipes: [...] } or a single recipe object
  let arr: unknown;
  if (Array.isArray(obj.recipes)) {
    arr = obj.recipes;
  } else if (obj.title) {
    arr = [obj];
  } else {
    throw new Error("LLM response did not contain a recipes array.");
  }
  const recipes: RecipeShape[] = [];
  for (const r of arr as Record<string, unknown>[]) {
    if (typeof r.title !== "string" || !Array.isArray(r.ingredients)) continue;
    recipes.push({
      title: r.title,
      description: typeof r.description === "string" ? r.description : "",
      time_minutes: Number(r.time_minutes) || 30,
      servings: Number(r.servings) || 1,
      ingredients: r.ingredients as string[],
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
    });
  }
  if (recipes.length === 0) {
    throw new Error("LLM response did not contain any valid recipes.");
  }
  return recipes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (!body || !body.profile || !body.flex || !Array.isArray(body.pantry)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: profile, flex, pantry." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tier = body.tier ?? "standard";
    const count = TIER_COUNTS[tier] ?? 2;
    const flaggedPantry = flagUseSoon(body.pantry);
    const { system, user } = buildPrompt(body, flaggedPantry);
    // Each full recipe with ingredient_details, steps, nutrition needs ~1500+ tokens
    const maxTokens = count >= 4 ? 18000 : count >= 3 ? 12000 : 8000;
    const parsed = await callLLM(system, user, maxTokens);
    const recipes = normalizeRecipes(parsed);

    return new Response(
      JSON.stringify({ recipes, pantry_flags: flaggedPantry }),
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
