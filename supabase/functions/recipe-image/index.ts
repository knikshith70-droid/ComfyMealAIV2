import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImageRequest {
  title: string;
  cuisine?: string;
  mealType?: string;
  ingredients?: string[];
}

interface ImageResponse {
  imageUrl: string;
  source: "themealdb" | "pexels" | "fallback";
  matchedDish?: string;
}

/**
 * Curated Pexels CDN photo IDs, verified to return HTTP 200.
 * Organized by food category for fallback matching.
 */
const PEXELS_FALLBACK: { match: string[]; photos: number[] }[] = [
  { match: ["dosa", "idli", "sambar", "vada", "uttapam", "upma", "pongal", "appam", "pesarattu"], photos: [4518843, 1640774, 376461, 3026805, 5848482] },
  { match: ["curry", "paneer", "tikka", "masala", "butter chicken", "dal", "chole", "rajma", "kadhi", "korma", "rogan", "keema", "gravy"], photos: [1279330, 1410235, 533325, 1413423, 461198, 248412, 958546, 958547, 958548] },
  { match: ["biryani", "pulao", "pilaf", "fried rice", "jeera rice", "lemon rice", "curd rice", "rice"], photos: [3338497, 2664216, 4198015, 1640777] },
  { match: ["naan", "roti", "chapati", "paratha", "phulka", "kulcha", "puri", "bhatura", "bread", "loaf", "bun", "bagel", "baguette", "focaccia"], photos: [1583884, 4518843, 1640774, 376461] },
  { match: ["samosa", "pakora", "bhaji", "vada pav", "pani puri", "chaat", "kachori", "dhokla", "khaman", "fritter"], photos: [533325, 1413423, 461198, 958549, 958550] },
  { match: ["halwa", "kheer", "payasam", "laddu", "barfi", "gulab jamun", "jalebi", "rasmalai", "sheera", "cake", "cookie", "brownie", "pudding", "mousse", "tart", "pie", "cheesecake", "ice cream", "sorbet", "dessert", "sweet"], photos: [1437267, 3026805, 70497, 1640771, 847289] },
  { match: ["pasta", "spaghetti", "penne", "fusilli", "lasagna", "ravioli", "gnocchi", "risotto", "noodles", "chow mein", "hakka", "schezwan"], photos: [1437267, 1279330, 1410235, 4518843, 958551, 958552] },
  { match: ["pizza", "flatbread", "calzone"], photos: [70497, 1640777, 4198015] },
  { match: ["salad", "quinoa", "tabbouleh", "caesar", "coleslaw", "greek salad", "caprese", "leaf", "spinach", "fresh"], photos: [1213710, 1059900, 2664216, 3338497, 958558] },
  { match: ["soup", "broth", "stew", "ramen", "pho", "minestrone", "rasam"], photos: [539451, 793785, 1393382, 699953, 958566, 958567] },
  { match: ["sandwich", "burger", "wrap", "taco", "burrito", "quesadilla", "panini", "sub", "roll"], photos: [1640777, 533325, 1413423, 958568, 958569, 958570] },
  { match: ["omelette", "omelet", "scrambled", "egg", "frittata", "shakshuka", "avocado toast", "french toast", "pancake", "waffle", "breakfast", "brunch"], photos: [4518843, 1640774, 376461, 3026805] },
  { match: ["dumpling", "momos", "bao", "spring roll", "dim sum"], photos: [3214285, 539451, 699953] },
  { match: ["sushi", "onigiri", "tempura", "teriyaki", "donburi", "bento"], photos: [1279330, 1410235, 2098085] },
  { match: ["enchilada", "tostada", "nachos", "fajita", "tortilla", "guacamole", "salsa", "mexican"], photos: [1413423, 461198, 533325] },
  { match: ["hummus", "falafel", "shawarma", "kebab", "mezze", "baba ganoush", "middle eastern"], photos: [4518843, 1640774, 376461] },
  { match: ["smoothie", "juice", "shake", "lassi", "buttermilk", "tea", "coffee", "chai", "drinks", "smoothies", "drink"], photos: [539451, 793785, 1393382] },
  { match: ["vegetable", "veggie", "sabzi", "bhindi", "gobi", "aloo", "baingan", "palak", "mushroom", "stir fry", "stir-fry"], photos: [2664216, 3338497, 4198015, 1640777] },
  { match: ["lentil", "bean", "chickpea", "chana", "mung", "moong", "sprout", "legume"], photos: [1279330, 533325, 1410235] },
  { match: ["chicken", "mutton", "lamb", "beef", "pork", "meat", "steak", "grill", "roast"], photos: [1413423, 461198, 248412, 533325, 958546, 958547] },
  { match: ["fish", "prawn", "shrimp", "salmon", "tuna", "crab", "lobster", "seafood"], photos: [1279330, 1410235, 4198015] },
];

const GENERIC_PHOTOS = [
  4518843, 1640777, 1279330, 1410235, 533325, 1413423, 461198,
  5848482, 1640774, 376461, 1437267, 3026805, 70497, 3338497,
  2664216, 248412, 1583884, 4198015, 539451, 793785, 1393382,
  699953, 3214285, 1640771, 847289,
];

/**
 * Known specific dish names — these are the most distinctive food terms
 * that should be searched first on TheMealDB. Ordered by specificity.
 * Multi-word entries are searched as phrases.
 */
const SPECIFIC_DISH_TERMS = [
  // Indian breads
  "naan", "roti", "chapati", "paratha", "puri", "bhatura", "kulcha", "phulka",
  // Indian rice
  "biryani", "pulao", "pilaf", "khichdi", "pongal", "curd rice", "lemon rice", "jeera rice", "fried rice",
  // Indian curries/gravies
  "butter chicken", "paneer tikka", "paneer butter", "matar paneer", "palak paneer", "dal makhani", "dal fry",
  "chole", "rajma", "kadhi", "korma", "rogan josh", "keema", "vindaloo",
  "chicken tikka", "chicken curry", "fish curry", "mutton curry",
  // South Indian
  "masala dosa", "plain dosa", "idli", "sambar", "vada", "uttapam", "upma", "appam",
  // Indian snacks
  "samosa", "pakora", "bhaji", "vada pav", "pani puri", "kachori", "dhokla",
  // Indian desserts
  "gulab jamun", "jalebi", "kheer", "halwa", "rasmalai", "laddu", "barfi",
  // Italian
  "pasta", "spaghetti", "penne", "lasagna", "ravioli", "gnocchi", "risotto", "pizza", "carbonara",
  // Asian
  "ramen", "pho", "sushi", "tempura", "dumpling", "momos", "spring roll", "stir fry",
  "chow mein", "hakka noodles", "fried rice", "kung pao", "sweet and sour",
  // Mexican
  "taco", "burrito", "quesadilla", "enchilada", "nachos", "fajita", "guacamole", "salsa",
  // Middle Eastern
  "hummus", "falafel", "shawarma", "kebab", "baba ganoush", "tabbouleh",
  // Western
  "burger", "sandwich", "wrap", "panini", "steak", "roast", "grilled chicken",
  "pancake", "waffle", "omelette", "frittata", "shakshuka", "french toast", "avocado toast",
  // Soups & salads
  "soup", "stew", "minestrone", "salad", "caesar salad", "greek salad", "caprese",
  // Desserts
  "cheesecake", "brownie", "pudding", "mousse", "tart", "sorbet", "ice cream",
  // Proteins
  "grilled fish", "roast chicken", "beef steak", "lamb chops", "grilled prawns",
  // Drinks
  "smoothie", "lassi", "milkshake",
];

/**
 * Generic words that should NOT be used as primary search terms.
 * These are too broad and return irrelevant results.
 */
const GENERIC_WORDS = new Set([
  "the", "a", "an", "with", "and", "or", "in", "on", "of", "for", "to",
  "homemade", "easy", "simple", "quick", "best", "delicious", "tasty",
  "recipe", "style", "spiced", "flavored", "fresh", "healthy",
  "my", "aunt", "mom", "grandma", "special", "restaurant", "authentic",
  "vegetable", "veg", "chicken", "mutton", "lamb", "beef", "fish", "prawn",
  "masala", "curry", "gravy", "dry", "wet", "fried", "roasted", "baked",
  "steamed", "boiled", "spicy", "mild", "hot", "cold", "sweet", "sour",
  "south", "north", "indian", "chinese", "italian", "mexican", "thai",
  "continental", "asian", "american", "breakfast", "lunch", "dinner",
  "snack", "dessert", "drink", "main", "side", "starter",
]);

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickPexelsPhoto(title: string, cuisine?: string, mealType?: string, ingredients?: string[]): number {
  const searchText = [
    title.toLowerCase(),
    (cuisine ?? "").toLowerCase(),
    (mealType ?? "").toLowerCase(),
    (ingredients ?? []).join(" ").toLowerCase(),
  ].join(" ");

  for (const cat of PEXELS_FALLBACK) {
    for (const keyword of cat.match) {
      if (searchText.includes(keyword)) {
        return cat.photos[hashString(title + keyword) % cat.photos.length];
      }
    }
  }
  return GENERIC_PHOTOS[hashString(title) % GENERIC_PHOTOS.length];
}

function buildPexelsUrl(photoId: number): string {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=800&h=533&fit=crop`;
}

/**
 * Extract search terms from recipe title, ordered by specificity.
 * 1. Check for known specific dish phrases (e.g., "butter chicken", "masala dosa")
 * 2. Check for known single-word dish terms (e.g., "biryani", "pasta")
 * 3. Fall back to non-generic words from the title
 */
function extractSearchTerms(title: string): string[] {
  const lowerTitle = title.toLowerCase();
  const found: string[] = [];

  // Check for specific multi-word dish phrases first
  for (const term of SPECIFIC_DISH_TERMS) {
    if (term.includes(" ") && lowerTitle.includes(term)) {
      found.push(term);
    }
  }

  // Check for specific single-word dish terms
  for (const term of SPECIFIC_DISH_TERMS) {
    if (!term.includes(" ")) {
      const regex = new RegExp(`\\b${term}\\b`, "i");
      if (regex.test(lowerTitle)) {
        found.push(term);
      }
    }
  }

  // Fall back to non-generic words
  const words = lowerTitle
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !GENERIC_WORDS.has(w));
  found.push(...words);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return found.filter((term) => {
    const key = term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchTheMealDB(query: string, originalTitle: string): Promise<{ url: string; dish: string } | null> {
  try {
    const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const meals = data?.meals;
    if (!Array.isArray(meals) || meals.length === 0) return null;

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
    const titleWords = new Set(originalTitle.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));
    let bestMeal = null as null | { strMeal: string; strMealThumb: string };
    let bestScore = -Infinity;

    for (const meal of meals) {
      const mealName = (meal.strMeal ?? "").toLowerCase();
      const mealWords = new Set(mealName.replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));

      // REQUIRE: every word in the query must appear in the meal name.
      // This prevents "dosa" search from matching "Rice and Beans".
      const allQueryWordsPresent = queryWords.every((qw) => mealWords.has(qw));
      if (!allQueryWordsPresent) continue;

      let score = 0;
      // +3 for each shared word between title and meal name
      for (const w of titleWords) {
        if (mealWords.has(w)) score += 3;
      }
      // -1 for each word in meal name not in title (penalize unrelated words)
      for (const w of mealWords) {
        if (!titleWords.has(w)) score -= 1;
      }
      // Bonus for shorter meal names (more likely canonical dish)
      score -= mealName.length / 50;
      // Big bonus if the meal name starts with the query
      if (mealName.startsWith(queryLower)) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestMeal = meal;
      }
    }

    // Only accept if score is positive (at least some real overlap)
    if (bestMeal && bestMeal.strMealThumb && bestScore > 0) {
      return { url: bestMeal.strMealThumb, dish: bestMeal.strMeal };
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { title, cuisine, mealType, ingredients } = (await req.json()) as ImageRequest;
    const safeTitle = (title ?? "").trim();
    if (!safeTitle) {
      return new Response(JSON.stringify({ imageUrl: "", source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Search TheMealDB by extracted keywords (most specific first)
    const searchTerms = extractSearchTerms(safeTitle);
    for (const term of searchTerms.slice(0, 6)) {
      const result = await searchTheMealDB(term, safeTitle);
      if (result) {
        return new Response(JSON.stringify({
          imageUrl: result.url,
          source: "themealdb",
          matchedDish: result.dish,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Step 2: Search by main protein ingredient if no dish match.
    // Only search by specific proteins — not vegetables or carbs, which return
    // irrelevant dishes (e.g., "potato" → "Breakfast Potatoes" for a samosa).
    const PROTEIN_INGREDIENTS = new Set([
      "chicken", "fish", "prawn", "shrimp", "lamb", "beef", "mutton", "pork",
      "paneer", "salmon", "tuna", "crab", "lobster", "bacon", "ham", "turkey",
      "duck", "goat", "egg", "eggs", "tofu", "soy chunks", "mushroom",
    ]);
    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        const cleaned = ing.toLowerCase()
          .replace(/^[\d./\s]*(?:cups?|cup|tbsp|tsp|oz|g|kg|ml|l|lbs?|lb|cloves?|slices?|pieces?|medium|small|large|bunch|handful|pinch|dash|cans?|jars?|packs?|packets?|sticks?)?\s*/i, "")
          .trim();
        if (cleaned && cleaned.length > 2 && PROTEIN_INGREDIENTS.has(cleaned)) {
          const result = await searchTheMealDB(cleaned, safeTitle);
          if (result) {
            return new Response(JSON.stringify({
              imageUrl: result.url,
              source: "themealdb",
              matchedDish: result.dish,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // Step 3: Fall back to curated Pexels CDN photo
    const photoId = pickPexelsPhoto(safeTitle, cuisine, mealType, ingredients);
    return new Response(JSON.stringify({
      imageUrl: buildPexelsUrl(photoId),
      source: "pexels",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ imageUrl: "", source: "fallback" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
