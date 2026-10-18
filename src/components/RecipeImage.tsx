import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Loader2, UtensilsCrossed } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  cuisine?: string;
  mealType?: string;
  ingredients?: string[];
}

function FallbackImage({ title, compact = false }: { title: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cream-100 via-sage-50 to-cream-200">
        <div className="text-center px-4">
          <UtensilsCrossed className="h-7 w-7 text-sage-400 mx-auto mb-2" />
          <p className="font-serif text-sm text-charcoal-700 line-clamp-2">{title}</p>
        </div>
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
        <p className="text-xs text-charcoal-700/60 mt-2">Meal artwork unavailable</p>
      </div>
    </div>
  );
}

async function fetchRecipeImage(
  title: string,
  cuisine?: string,
  mealType?: string,
  ingredients?: string[],
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("recipe-image", {
      body: { title, cuisine, mealType, ingredients },
    });
    if (error || !data?.imageUrl || typeof data.imageUrl !== "string") return null;
    return data.imageUrl;
  } catch {
    return null;
  }
}

function useRecipeImageUrl(title: string, cuisine?: string, mealType?: string, ingredients?: string[]) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setLoading(true);

    fetchRecipeImage(title, cuisine, mealType, ingredients)
      .then((imageUrl) => {
        if (!cancelled) setUrl(imageUrl);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [title, cuisine, mealType, ingredients]);

  return { url, loading };
}

function useImageLoader(url: string | null) {
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
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return status;
}

export function CompactRecipeImage({ title, cuisine, mealType, ingredients }: Omit<Props, "description">) {
  const safeTitle = title?.trim() || "Homemade Dish";
  const { url, loading } = useRecipeImageUrl(safeTitle, cuisine, mealType, ingredients);
  const imageStatus = useImageLoader(url);

  if (loading || (url && imageStatus === "loading")) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cream-100 to-sage-50 animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-sage-600" />
      </div>
    );
  }

  if (!url || imageStatus === "error") return <FallbackImage title={safeTitle} compact />;

  return <img src={url} alt={safeTitle} className="w-full h-full object-cover transition-opacity duration-500" loading="lazy" />;
}

export function RecipeImage({ title, cuisine, mealType, ingredients }: Props) {
  const safeTitle = title?.trim() || "Homemade Dish";
  const { url, loading } = useRecipeImageUrl(safeTitle, cuisine, mealType, ingredients);
  const imageStatus = useImageLoader(url);

  if (loading || (url && imageStatus === "loading")) {
    return (
      <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden bg-cream-100 border border-cream-200">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-cream-100 to-sage-50 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-sage-600" />
          <p className="text-xs muted">Creating meal artwork…</p>
        </div>
      </div>
    );
  }

  if (!url || imageStatus === "error") return <FallbackImage title={safeTitle} />;

  return (
    <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden bg-cream-100 border border-cream-200">
      <img src={url} alt={safeTitle} className="w-full h-full object-cover" loading="lazy" />
    </div>
  );
}
