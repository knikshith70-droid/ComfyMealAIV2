import { useRef, useState } from "react";
import {
  Camera, Loader2, X, Check, Trash2, AlertCircle, ScanLine, Calendar,
} from "lucide-react";

interface Props {
  onConfirm: (items: string[], loggedAt: string) => Promise<void>;
}

interface ParsedItem {
  id: string;
  text: string;
  quantity: string;
  selected: boolean;
}

const STOPWORDS = new Set([
  // totals / financial
  "total", "subtotal", "tax", "cash", "change", "balance", "due", "vat", "gst",
  "discount", "save", "coupon", "points", "loyalty", "visa", "mastercard",
  "debit", "credit", "card", "approved", "signature", "auth", "ref", "transaction",
  "payment", "tender", "tip", "gratuity", "rounding", "round", "cashier",
  // receipt meta
  "receipt", "invoice", "order", "store", "location", "tel", "phone", "www",
  "http", "thank", "welcome", "please", "return", "policy", "warranty",
  "customer", "copy", "merchant", "terminal", "aid", "aip", "tvr", "iad",
  "emv", "chip", "pin", "enter", "insert", "tap", "swipe",
  // common non-ingredient words
  "each", "qty", "ea", "lb", "kg", "gm", "ml", "l", "oz", "pk", "pack",
  "btl", "box", "bag", "ctn", "doz",
]);

const DATE_REGEX_LIST = [
  // 2024-01-15, 2024/01/15
  /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
  // 15-01-2024, 15/01/2024
  /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
  // Jan 15 2024, January 15, 2024
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  // 15 Jan 2024, 15 January 2024
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})\b/i,
];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseDate(text: string): string | null {
  for (const re of DATE_REGEX_LIST) {
    const m = text.match(re);
    if (!m) continue;
    try {
      let year: number, month: number, day: number;
      if (m[1].length === 4) {
        // YYYY-MM-DD or YYYY/MM/DD
        year = Number(m[1]);
        month = Number(m[2]);
        day = Number(m[3]);
      } else if (MONTHS[(m[2] ?? m[1]).toLowerCase().slice(0, 3)]) {
        // Month-name formats
        if (/^\d+$/.test(m[1])) {
          // 15 Jan 2024
          day = Number(m[1]);
          month = MONTHS[m[2].toLowerCase().slice(0, 3)];
          year = Number(m[3]);
        } else {
          // Jan 15 2024
          month = MONTHS[m[1].toLowerCase().slice(0, 3)];
          day = Number(m[2]);
          year = Number(m[3]);
        }
      } else {
        // DD-MM-YYYY or DD/MM/YYYY (ambiguous — assume DD/MM)
        day = Number(m[1]);
        month = Number(m[2]);
        year = Number(m[3]);
      }
      if (month < 1 || month > 12 || day < 1 || day > 31) continue;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const d = new Date(iso);
      if (isNaN(d.getTime())) continue;
      return d.toISOString();
    } catch {
      continue;
    }
  }
  return null;
}

function looksLikeLineItem(line: string): boolean {
  const cleaned = line.trim();
  if (cleaned.length < 2 || cleaned.length > 60) return false;
  // strip trailing price (e.g. "Milk 2.99" or "Milk   $2.99 A")
  const noPrice = cleaned.replace(/[\d.,$£€¥]+\s*[a-zA-Z]?$/i, "").trim();
  if (!noPrice) return false;
  // skip lines that are mostly digits / symbols
  const alpha = noPrice.replace(/[^a-zA-Z]/g, "");
  if (alpha.length < 2) return false;
  // skip if first word is a stopword
  const firstWord = noPrice.toLowerCase().split(/\s+/)[0];
  if (STOPWORDS.has(firstWord)) return false;
  // skip lines with receipt meta keywords
  const lower = noPrice.toLowerCase();
  for (const sw of STOPWORDS) {
    if (lower.includes(sw) && lower.length < sw.length + 8) return false;
  }
  return true;
}

function extractQuantity(line: string): string {
  // Look for patterns like "500g", "2kg", "1.5L", "250ml", "3x", "2 pcs", "1 bunch"
  const patterns = [
    /\b(\d+(?:[.,]\d+)?)\s*(kg|g|gm|gr|gram|grams|l|ltr|ml|oz|lbs?|lb|pcs?|pieces?|cloves?|cups?|tbsp|tsp|bunch|handful|packs?|packets?|cans?|jars?|slices?|medium|small|large)\b/i,
    /\b(\d+)\s*[xX]\s*/,
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m) {
      const qty = m[0].trim();
      // Normalize common abbreviations
      return qty.replace(/\bgr\b/i, "g").replace(/\bgrams?\b/i, "g").replace(/\bltr\b/i, "l").replace(/\bpieces?\b/i, "pcs").replace(/\blbs?\b/i, "lb");
    }
  }
  return "";
}

function cleanItemName(line: string): string {
  let s = line.trim();
  // remove leading quantities like "2x " or "3 "
  s = s.replace(/^\d+\s*[xX]?\s+/, "");
  // remove trailing price + unit codes
  s = s.replace(/[\d.,$£€¥]+\s*[a-zA-Z]?\s*$/i, "");
  // remove trailing unit codes like "EA", "PK"
  s = s.replace(/\b(EA|PK|BTL|BOX|BAG|CTN|DOZ|LB|KG|GM|ML|OZ)\b\.?$/i, "");
  // remove embedded quantity patterns like "500g", "2kg", "1.5L"
  s = s.replace(/\s+\d+(?:[.,]\d+)?\s*(kg|g|gm|gr|gram|grams|l|ltr|ml|oz|lbs?|lb|pcs?|pieces?|cloves?|cups?|tbsp|tsp|bunch|handful|packs?|packets?|cans?|jars?|slices?|medium|small|large)\b/gi, "");
  s = s.replace(/\s+\d+\s*[xX]\s*/g, "");
  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  // title-case
  s = s.replace(/\b\w/g, (c) => c.toUpperCase());
  return s;
}

export function ReceiptOCR({ onConfirm }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "scanning" | "review">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [dateOverride, setDateOverride] = useState<string>("");
  const [confirming, setConfirming] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const reset = () => {
    setStage("idle");
    setProgress(0);
    setError(null);
    setItems([]);
    setDetectedDate(null);
    setDateOverride("");
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    setStage("scanning");
    setProgress(0);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      // Dynamic import keeps the heavy Tesseract worker out of the initial bundle.
      const { default: Tesseract } = await import("tesseract.js");
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const rawText: string = result?.data?.text ?? "";

      const detected = parseDate(rawText);
      setDetectedDate(detected);
      setDateOverride(detected ? detected.slice(0, 10) : new Date().toISOString().slice(0, 10));

      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const parsed: ParsedItem[] = [];
      const seen = new Set<string>();
      for (const line of lines) {
        if (!looksLikeLineItem(line)) continue;
        const name = cleanItemName(line);
        if (!name || name.length < 2) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const quantity = extractQuantity(line);
        parsed.push({ id: crypto.randomUUID(), text: name, quantity, selected: true });
      }

      if (parsed.length === 0) {
        setError("Couldn't read any ingredient names from this receipt. Try a clearer photo or add items manually.");
        setStage("idle");
        return;
      }

      setItems(parsed);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed. Try a clearer photo or add items manually.");
      setStage("idle");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, selected: !it.selected } : it));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const editItem = (id: string, text: string) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, text } : it));
  };

  const editQuantity = (id: string, quantity: string) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, quantity } : it));
  };

  const confirm = async () => {
    const selected = items.filter((it) => it.selected && it.text.trim());
    if (selected.length === 0) {
      setError("Select at least one item to add, or cancel.");
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      // Use the receipt date if one was detected and the user hasn't cleared the override.
      // If dateOverride is empty, fall back to today — but only when no date was detected.
      let loggedAt: string;
      if (detectedDate && !dateOverride) {
        loggedAt = detectedDate;
      } else if (dateOverride) {
        loggedAt = new Date(dateOverride + "T12:00:00").toISOString();
      } else {
        loggedAt = new Date().toISOString();
      }
      // Include quantity in the name so it carries through to AI recipe suggestions
      const namesWithQty = selected.map((it) => {
        const qty = it.quantity.trim();
        return qty ? `${it.text.trim()} (${qty})` : it.text.trim();
      });
      await onConfirm(namesWithQty, loggedAt);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add items.");
    } finally {
      setConfirming(false);
    }
  };

  if (stage === "idle") {
    return (
      <div className="rounded-xl bg-cream-100/60 border border-cream-200/70 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ScanLine className="h-4 w-4 text-sage-700" />
          <h4 className="font-medium text-charcoal-900 text-sm">Scan a grocery receipt</h4>
        </div>
        <p className="text-xs muted mb-3">
          Upload or take a photo of your receipt. We'll read it with on-device OCR and let you review the items before adding.
        </p>
        {error && (
          <div className="flex items-start gap-2 text-xs text-clay-700 bg-clay-50 border border-clay-200 rounded-lg px-3 py-2 mb-3">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="btn-secondary w-full text-sm"
        >
          <Camera className="h-4 w-4" /> Take or upload a photo
        </button>
      </div>
    );
  }

  if (stage === "scanning") {
    return (
      <div className="rounded-xl bg-cream-100/60 border border-cream-200/70 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 animate-spin text-sage-700" />
          <h4 className="font-medium text-charcoal-900 text-sm">Reading receipt…</h4>
        </div>
        {previewUrl && (
          <img src={previewUrl} alt="Receipt preview" className="w-full max-h-40 object-contain rounded-lg mb-3 border border-cream-200" />
        )}
        <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
          <div className="h-full bg-sage-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs muted mt-2">{progress}%</p>
      </div>
    );
  }

  // review stage
  const selectedCount = items.filter((it) => it.selected).length;
  return (
    <div className="rounded-xl bg-cream-100/60 border border-cream-200/70 p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-sage-700" />
          <h4 className="font-medium text-charcoal-900 text-sm">Review scanned items</h4>
        </div>
        <button type="button" onClick={reset} className="h-7 w-7 inline-flex items-center justify-center rounded-full text-charcoal-700/50 hover:text-charcoal-900 hover:bg-cream-200 transition" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-clay-700 bg-clay-50 border border-clay-200 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs muted mb-3">
        OCR can misread small receipt print. Tap an item to deselect it, edit the name inline, or remove it. {selectedCount} selected.
      </p>

      <ul className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar pr-1 mb-3">
        {items.map((it) => (
          <li key={it.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${it.selected ? "bg-cream-50 border-sage-300" : "bg-cream-100/50 border-cream-200 opacity-60"}`}>
            <button
              type="button"
              onClick={() => toggleItem(it.id)}
              className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition ${it.selected ? "bg-sage-600 border-sage-600 text-cream-50" : "border-cream-300 bg-cream-50"}`}
              aria-label={it.selected ? "Deselect" : "Select"}
            >
              {it.selected && <Check className="h-3 w-3" />}
            </button>
            <input
              value={it.text}
              onChange={(e) => editItem(it.id, e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-sm text-charcoal-900"
            />
            <input
              value={it.quantity}
              onChange={(e) => editQuantity(it.id, e.target.value)}
              placeholder="qty"
              aria-label="Quantity"
              className="w-16 shrink-0 rounded-md border border-cream-300 bg-cream-50/50 px-1.5 py-0.5 text-xs text-charcoal-900 focus:outline-none focus:border-sage-400 focus:bg-cream-50 transition"
            />
            <button
              type="button"
              onClick={() => removeItem(it.id)}
              className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded-full text-charcoal-700/40 hover:text-clay-700 hover:bg-clay-50 transition"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Date picker */}
      <div className="flex items-center gap-2 mb-3 rounded-lg bg-cream-50 border border-cream-200 px-3 py-2">
        <Calendar className="h-4 w-4 text-sage-700 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs muted">Purchase date</div>
          {detectedDate ? (
            <div className="text-xs text-sage-700">Detected: {new Date(detectedDate).toLocaleDateString()}</div>
          ) : (
            <div className="text-xs text-clay-600">No date found on receipt — defaults to today.</div>
          )}
        </div>
        <input
          type="date"
          value={dateOverride}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDateOverride(e.target.value)}
          className="text-sm rounded-md bg-cream-50 border border-cream-300 px-2 py-1 focus:outline-none focus:border-sage-400"
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn-ghost flex-1 text-sm" disabled={confirming}>
          Cancel
        </button>
        <button type="button" onClick={confirm} disabled={confirming || selectedCount === 0} className="btn-primary flex-1 text-sm">
          {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Add {selectedCount} item{selectedCount !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
