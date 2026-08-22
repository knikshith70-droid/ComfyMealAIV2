import type { PantryItem, SpiceItem, IngredientDetail } from "./supabase";

const QUALIFIERS = new Set([
  "chopped", "diced", "sliced", "minced", "grated", "fresh", "dried", "ground",
  "whole", "halved", "peeled", "seeded", "finely", "roughly", "thinly", "coarsely",
  "organic", "raw", "cooked", "boiled", "steamed", "roasted", "fried", "crushed",
  "mashed", "shredded", "julienned", "cubed", "quartered", "trimmed",
  "boneless", "skinless", "lean", "firm", "ripe", "frozen", "thawed",
  "large", "small", "medium", "extra",
]);

/** Strip leading quantity/unit and qualifier words, returning just the food name. */
export function extractIngredientName(s: string): string {
  let cleaned = s.toLowerCase().trim();
  cleaned = cleaned.replace(
    /^\d+(?:[./]\d+)?\s*(?:cups?|tbsp|tsp|oz|g|kg|ml|l|lbs?|lb|cloves?|slices?|pieces?|medium|small|large|bunch|handful|pinch|dash|cans?|jars?|packs?|packets?|sticks?)?\s*/i,
    "",
  );
  cleaned = cleaned.replace(/\b\d+\b/g, "").trim();
  const words = cleaned.split(/[\s,]+/).filter((w) => w.length > 0 && !QUALIFIERS.has(w));
  return words.join(" ").trim();
}

/** Normalize for fuzzy comparison: singularize + collapse double letters. */
function compareKey(s: string): string {
  let k = s.toLowerCase().trim();
  k = k.replace(/ies$/i, "y").replace(/es$/i, "").replace(/s$/i, "");
  k = k.replace(/(.)\1+/g, "$1");
  return k;
}

/** Check if an ingredient name matches an inventory item name (case-insensitive, fuzzy). */
function namesMatch(ingredientName: string, inventoryName: string): boolean {
  const ing = extractIngredientName(ingredientName);
  const inv = inventoryName.toLowerCase().trim();
  if (!ing || !inv) return false;

  if (ing === inv) return true;

  const ingKey = compareKey(ing);
  const invKey = compareKey(inv);
  if (ingKey === invKey) return true;

  if (ingKey.includes(invKey) || invKey.includes(ingKey)) return true;

  const ingWords = ing.split(/\s+/).filter((w) => w.length > 3);
  const invWords = inv.split(/\s+/).filter((w) => w.length > 3);
  for (const iw of ingWords) {
    const iwKey = compareKey(iw);
    for (const vw of invWords) {
      if (iwKey === compareKey(vw)) return true;
    }
  }

  return false;
}

/** Check if an ingredient string is available in the pantry or spices. */
export function isIngredientAvailable(
  ingredientName: string,
  pantry: PantryItem[],
  spices: SpiceItem[],
): boolean {
  return (
    pantry.some((p) => namesMatch(ingredientName, p.name)) ||
    spices.some((s) => namesMatch(ingredientName, s.name))
  );
}

/** Filter out missing_ingredients that actually exist in pantry or spices. */
export function filterGenuinelyMissing(
  items: IngredientDetail[],
  pantry: PantryItem[],
  spices: SpiceItem[],
): IngredientDetail[] {
  return items.filter((item) => !isIngredientAvailable(item.name, pantry, spices));
}
