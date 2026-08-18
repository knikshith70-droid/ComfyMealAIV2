import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { Loader2, UtensilsCrossed } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  cuisine?: string;
  mealType?: string;
  ingredients?: string[];
}

/**
 * Recipe image component.
 *
 * Strategy:
 * 1. Call the recipe-image edge function, which searches TheMealDB by dish name
 *    and returns a real photo of the actual dish (or a close match).
 * 2. If TheMealDB doesn't have the dish, the edge function falls back to a
 *    curated Pexels CDN photo matched by food category.
 * 3. If the image URL fails to load, show a clean gradient fallback (no emojis).
 *
 * The edge function uses strict matching: every word in the search query must
 * appear in the meal name, preventing irrelevant matches.
 */

/** Simple deterministic hash for fallback selection. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Curated Pexels CDN photos for client-side fallback (when edge function is unavailable). */
const PEXELS_FALLBACK: { match: string[]; photos: number[] }[] = [
  { match: ["dosa", "idli", "sambar", "vada", "uttapam", "upma", "pongal", "appam"], photos: [4518843, 1640774, 376461, 3026805, 5848482] },
  { match: ["curry", "paneer", "tikka", "masala", "butter chicken", "dal", "chole", "rajma", "kadhi", "korma", "rogan", "keema"], photos: [1279330, 1410235, 533325, 1413423, 461198, 248412, 958546, 958547, 958548] },
  { match: ["biryani", "pulao", "pilaf", "fried rice", "jeera rice", "lemon rice", "curd rice", "rice"], photos: [3338497, 2664216, 4198015, 1640777] },
  { match: ["naan", "roti", "chapati", "paratha", "phulka", "kulcha", "puri", "bhatura", "bread", "loaf", "bun", "bagel", "baguette"], photos: [1583884, 4518843, 1640774, 376461] },
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

function pickPexelsPhoto(title: string, cuisine?: string, mealType?: string, ingredients?: string[]): string {
  const searchText = [
    title.toLowerCase(),
    (cuisine ?? "").toLowerCase(),
    (mealType ?? "").toLowerCase(),
    (ingredients ?? []).join(" ").toLowerCase(),
  ].join(" ");

  for (const cat of PEXELS_FALLBACK) {
    for (const keyword of cat.match) {
      if (searchText.includes(keyword)) {
        const id = cat.photos[hashString(title + keyword) % cat.photos.length];
        return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=533&fit=crop`;
      }
    }
  }
  const id = GENERIC_PHOTOS[hashString(title) % GENERIC_PHOTOS.length];
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=533&fit=crop`;
}

/** Clean fallback — gradient + recipe title, no emojis. */
function FallbackImage({ title, compact = false }: { title: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cream-100 via-sage-50 to-cream-200">
        <UtensilsCrossed className="h-8 w-8 text-sage-400" />
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden border border-cream-200 bg-gradient-to-br from-cream-100 via-sage-50 to-cream-200 flex items-center justify-center">
      <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-sage-200/30 blur-sm" />
      <div className="absolute bottom-6 left-6 h-16 w-16 rounded-full bg-cream-300/20 blur-sm" />
      <div className="relative text-center px-6 z-10">
        <UtensilsCrossed className="h-8 w-8 text-sage-400 mx-auto mb-3" />
        <p className="font-serif text-lg text-charcoal-700 leading-snug line-clamp-2 max-w-xs mx-auto">{title}</p>
      </div>
    </div>
  );
}

/** Image loading hook with timeout. */
function useImageLoader(url: string | null, timeoutMs = 8000) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    if (!url) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    const img = new Image();
    img.src = url;
    img.onload = () => setStatus("loaded");
    img.onerror = () => setStatus("error");
    const timeout = setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "error" : prev));
    }, timeoutMs);
    return () => {
      img.onload = null;
      img.onerror = null;
      clearTimeout(timeout);
    };
  }, [url, timeoutMs]);

  return status;
}

/** Fetch image URL from the recipe-image edge function. Returns null if no good match. */
async function fetchRecipeImage(title: string, cuisine?: string, mealType?: string, ingredients?: string[]): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("recipe-image", {
      body: JSON.stringify({ title, cuisine, mealType, ingredients }),
      headers: { "Content-Type": "application/json" },
    });
    if (error || !data?.imageUrl) return null;

    // Client-side validation: if the edge function matched a dish on TheMealDB,
    // check that the matched dish name shares at least one significant word with
    // the recipe title. If not, the match is likely irrelevant — use Pexels fallback.
    if (data.source === "themealdb" && data.matchedDish) {
      const titleWords = new Set(
        title.toLowerCase()
          .replace(/[^a-z\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 3)
      );
      const dishWords = new Set(
        (data.matchedDish as string).toLowerCase()
          .replace(/[^a-z\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 3)
      );
      // Common words that shouldn't count as overlap
      const commonWords = new Set(["with", "and", "the", "for", "from", "style", "recipe"]);
      let hasOverlap = false;
      for (const w of titleWords) {
        if (commonWords.has(w)) continue;
        if (dishWords.has(w)) { hasOverlap = true; break; }
      }
      if (!hasOverlap) return null; // Reject irrelevant match, use Pexels fallback
    }

    return data.imageUrl as string;
  } catch {
    return null;
  }
}

/** Hook that resolves the image URL for a recipe. */
function useRecipeImageUrl(title: string, cuisine?: string, mealType?: string, ingredients?: string[]) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchRecipeImage(title, cuisine, mealType, ingredients)
      .then((imageUrl) => {
        if (cancelled) return;
        if (imageUrl) {
          setUrl(imageUrl);
        } else {
          // Client-side fallback to curated Pexels photo
          setUrl(pickPexelsPhoto(title, cuisine, mealType, ingredients));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setUrl(pickPexelsPhoto(title, cuisine, mealType, ingredients));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [title, cuisine, mealType, ingredients]);

  return { url, loading };
}

/** Compact image for modal headers — fills its container. */
export function CompactRecipeImage({ title, cuisine, mealType, ingredients }: Omit<Props, "description">) {
  const safeTitle = title?.trim() || "Homemade Dish";
  const { url, loading: urlLoading } = useRecipeImageUrl(safeTitle, cuisine, mealType, ingredients);
  const imgStatus = useImageLoader(url);

  if (urlLoading || imgStatus === "loading") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cream-100 to-sage-50 animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-sage-600" />
      </div>
    );
  }

  if (imgStatus === "error" || !url) {
    return <FallbackImage title={safeTitle} compact />;
  }

  return (
    <img
      src={url}
      alt={safeTitle}
      className="w-full h-full object-cover transition-opacity duration-500"
      loading="lazy"
    />
  );
}

export function RecipeImage({ title, description: _description, cuisine, mealType, ingredients }: Props) {
  const { t } = useI18n();
  const safeTitle = title?.trim() || "Homemade Dish";
  const { url, loading: urlLoading } = useRecipeImageUrl(safeTitle, cuisine, mealType, ingredients);
  const imgStatus = useImageLoader(url);

  if (urlLoading || imgStatus === "loading") {
    return (
      <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden bg-cream-100 border border-cream-200">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-cream-100 to-sage-50 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
          <p className="text-xs muted">{t("loadingImage")}</p>
        </div>
      </div>
    );
  }

  if (imgStatus === "error" || !url) {
    return <FallbackImage title={safeTitle} />;
  }

  return (
    <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden bg-cream-100 border border-cream-200">
      <img
        src={url}
        alt={safeTitle}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
