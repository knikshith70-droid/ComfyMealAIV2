import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Check, X, Plus } from "lucide-react";

interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

const UNIT_MAP: Record<string, string> = {
  grams: "g", gram: "g", g: "g",
  kilograms: "kg", kilogram: "kg", kg: "kg",
  milliliters: "ml", milliliter: "ml", ml: "ml",
  liters: "L", liter: "L", l: "L",
  cups: "cups", cup: "cups",
  tablespoons: "tbsp", tablespoon: "tbsp", tbsp: "tbsp",
  teaspoons: "tsp", teaspoon: "tsp", tsp: "tsp",
  ounces: "oz", ounce: "oz", oz: "oz",
  pounds: "lbs", pound: "lbs", lbs: "lbs", lb: "lbs",
  cloves: "cloves", clove: "cloves",
  slices: "slices", slice: "slices",
  pieces: "pieces", piece: "pieces",
  cans: "cans", can: "cans",
  packs: "packs", pack: "packs",
  bunch: "bunch", bunches: "bunch",
  handful: "handful", handfuls: "handful",
  pinch: "tsp", pinches: "tsp",
  sticks: "sticks", stick: "sticks",
};

const STOPWORDS = new Set([
  "a", "an", "the", "of", "some", "and", "with", "add", "get", "need",
  "i", "we", "please", "me", "my", "got", "have", "put", "into",
]);

function parseSpokenText(text: string): ParsedIngredient[] {
  const lower = text.toLowerCase().trim();
  // Split on commas, "and", "plus", semicolons, and "also"
  const segments = lower.split(/,| and | plus |;| also /).map((s) => s.trim()).filter(Boolean);
  const results: ParsedIngredient[] = [];

  for (const seg of segments) {
    // Pattern: <number> <unit> <name>  OR  <number> <name>  OR  <name>
    const match = seg.match(/^(\d+(?:[./]\d+)?)\s*([a-z]+)?\s+(.+)$/);
    if (match) {
      const qty = parseFloat(match[1].replace("/", "/"));
      const unitWord = match[2]?.toLowerCase();
      const unit = unitWord && UNIT_MAP[unitWord] ? UNIT_MAP[unitWord] : "";
      const nameRaw = unit ? match[3] : `${match[2] ?? ""} ${match[3]}`.trim();
      const name = nameRaw.split(/\s+/).filter((w) => !STOPWORDS.has(w)).join(" ").trim();
      if (name) results.push({ name, quantity: isNaN(qty) ? 1 : qty, unit: unit || "pieces" });
    } else {
      // No number — just an ingredient name
      const name = seg.split(/\s+/).filter((w) => !STOPWORDS.has(w)).join(" ").trim();
      if (name && name.length > 1) results.push({ name, quantity: 1, unit: "pieces" });
    }
  }
  return results;
}

interface Props {
  onAdd: (ingredients: ParsedIngredient[]) => void;
  disabled?: boolean;
}

type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoicePantryInput({ onAdd, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedIngredient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setSupported(false);
      setError("Voice input is not supported in this browser.");
      return;
    }
    setError(null);
    setTranscript("");
    setParsed([]);

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      const items = parseSpokenText(text);
      setParsed(items);
      if (items.length === 0) {
        setError("Could not parse any ingredients. Try saying: \"Add 2 tomatoes, 500 grams of chicken, and milk.\"");
      }
    };
    rec.onerror = () => {
      setError("Voice input failed. Please check microphone permissions.");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const handleConfirm = () => {
    if (parsed.length > 0) {
      onAdd(parsed);
      setTranscript("");
      setParsed([]);
    }
  };

  const handleCancel = () => {
    setTranscript("");
    setParsed([]);
    setError(null);
  };

  const updateItem = (i: number, patch: Partial<ParsedIngredient>) => {
    setParsed((prev) => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  };

  const removeItem = (i: number) => {
    setParsed((prev) => prev.filter((_, idx) => idx !== i));
  };

  if (!supported && !listening && !transcript) {
    return (
      <button type="button" disabled className="btn-ghost text-sm px-3 py-2 opacity-50 cursor-not-allowed" title="Voice input not supported">
        <MicOff className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={disabled || listening}
        className={`btn-ghost text-sm px-3 py-2 transition ${listening ? "text-clay-700 animate-pulse" : ""}`}
        title="Voice input"
        aria-label="Voice input"
      >
        {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </button>

      {transcript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in" onClick={handleCancel}>
          <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Mic className="h-5 w-5 text-sage-700" />
              <h3 className="font-serif text-lg text-charcoal-900">Review Ingredients</h3>
            </div>

            <p className="text-sm muted mb-3 italic">"{transcript}"</p>

            {error && (
              <p className="text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-lg px-3 py-2 mb-3">{error}</p>
            )}

            {parsed.length > 0 && (
              <ul className="space-y-2 mb-4 max-h-60 overflow-y-auto no-scrollbar">
                {parsed.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl bg-cream-100/70 border border-cream-200/70 px-3 py-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      className="flex-1 rounded-md border border-cream-300 bg-cream-50/50 px-2 py-1 text-sm text-charcoal-900 focus:outline-none focus:border-sage-400"
                    />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-16 rounded-md border border-cream-300 bg-cream-50/50 px-2 py-1 text-sm text-charcoal-900 focus:outline-none focus:border-sage-400"
                    />
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                      className="w-20 rounded-md border border-cream-300 bg-cream-50/50 px-2 py-1 text-sm text-charcoal-900 focus:outline-none focus:border-sage-400"
                    />
                    <button type="button" onClick={() => removeItem(i)} className="h-7 w-7 inline-flex items-center justify-center rounded-full text-charcoal-700/50 hover:text-clay-700 hover:bg-clay-50 transition shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2 justify-end">
              <button type="button" onClick={handleCancel} className="btn-ghost">
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button type="button" onClick={handleConfirm} disabled={parsed.length === 0} className="btn-primary">
                <Plus className="h-4 w-4" />
                Add {parsed.length || ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { parseSpokenText };
export type { ParsedIngredient };
