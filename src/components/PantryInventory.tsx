import { useState } from "react";
import { useInventory } from "../lib/inventory";
import { useI18n } from "../lib/i18n";
import { VoicePantryInput, type ParsedIngredient } from "./VoicePantryInput";
import {
  AlertCircle, Loader2, Plus, Refrigerator, Trash2, ChefHat,
  Copy, Check, X,
} from "lucide-react";

const UNITS = ["g", "kg", "ml", "L", "tsp", "tbsp", "cups", "pieces", "cloves", "slices", "cans", "packs", "sticks", "bunch", "handful"];

const COMMON_SPICES = [
  "Salt", "Black Pepper", "Turmeric", "Chilli Powder", "Garam Masala", "Cumin", "Coriander Powder",
  "Oil", "Butter", "Ghee", "Soy Sauce", "Vinegar", "Oregano", "Paprika", "Garlic Powder",
  "Ginger", "Cinnamon", "Bay Leaves", "Curry Powder", "Red Chilli Flakes", "Tomato Sauce",
  "Hot Sauce", "Olive Oil", "Sesame Oil", "Mustard", "Honey", "Lemon Juice",
];

interface Props {
  compact?: boolean;
}

export function PantryInventory({ compact }: Props) {
  const { t } = useI18n();
  const {
    pantry, spices, quantityTracking,
    addPantry, updatePantry, removePantry,
    addSpiceItem, updateSpiceItem, removeSpiceItem,
    removeAllPantry, removeAllSpices,
  } = useInventory();

  const [pantryDraft, setPantryDraft] = useState("");
  const [pantryQty, setPantryQty] = useState("1");
  const [pantryUnit, setPantryUnit] = useState("pieces");
  const [spiceDraft, setSpiceDraft] = useState("");
  const [spiceQty, setSpiceQty] = useState("1");
  const [spiceUnit, setSpiceUnit] = useState("tsp");
  const [spiceSearch, setSpiceSearch] = useState("");
  const [addingPantry, setAddingPantry] = useState(false);
  const [addingSpice, setAddingSpice] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<"pantry" | "spices" | null>(null);
  const [copied, setCopied] = useState<"pantry" | "spices" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddPantry = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = pantryDraft.trim();
    if (!v) return;
    setAddingPantry(true);
    setError(null);
    try {
      await addPantry(v, parseFloat(pantryQty) || 1, pantryUnit);
      setPantryDraft("");
      setPantryQty("1");
      setPantryUnit("pieces");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add pantry item.");
    } finally {
      setAddingPantry(false);
    }
  };

  const handleVoiceAddPantry = async (items: ParsedIngredient[]) => {
    setAddingPantry(true);
    setError(null);
    try {
      for (const item of items) {
        await addPantry(item.name, item.quantity, item.unit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add voice items.");
    } finally {
      setAddingPantry(false);
    }
  };

  const handleVoiceAddSpice = async (items: ParsedIngredient[]) => {
    setAddingSpice(true);
    setError(null);
    try {
      for (const item of items) {
        await addSpiceItem(item.name, item.quantity, item.unit);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add voice items.");
    } finally {
      setAddingSpice(false);
    }
  };

  const startEdit = (item: { id: string; quantity: number; unit: string }) => {
    setEditingId(item.id);
    setEditQty(String(item.quantity));
    setEditUnit(item.unit);
  };

  const savePantryEdit = async (id: string) => {
    try {
      await updatePantry(id, { quantity: parseFloat(editQty) || 0, unit: editUnit });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update pantry item.");
    }
  };

  const saveSpiceEdit = async (id: string) => {
    try {
      await updateSpiceItem(id, { quantity: parseFloat(editQty) || 0, unit: editUnit });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update spice.");
    }
  };

  const handleAddSpice = async (name: string) => {
    const v = name.trim();
    if (!v) return;
    setAddingSpice(true);
    setError(null);
    try {
      await addSpiceItem(v, parseFloat(spiceQty) || 1, spiceUnit);
      setSpiceDraft("");
      setSpiceSearch("");
      setSpiceQty("1");
      setSpiceUnit("tsp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add spice.");
    } finally {
      setAddingSpice(false);
    }
  };

  const copyAll = (type: "pantry" | "spices") => {
    const items = type === "pantry" ? pantry : spices;
    const text = items
      .map((item) => {
        if (quantityTracking) {
          return `${item.name} — ${item.quantity} ${item.unit}`;
        }
        return item.name;
      })
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleRemoveAll = async (type: "pantry" | "spices") => {
    setError(null);
    try {
      if (type === "pantry") await removeAllPantry();
      else await removeAllSpices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove all items.");
    }
    setConfirmRemove(null);
  };

  const filteredSpiceSuggestions = COMMON_SPICES.filter(
    (s) => spiceSearch && s.toLowerCase().includes(spiceSearch.toLowerCase()) && !spices.some((sp) => sp.name.toLowerCase() === s.toLowerCase()),
  ).slice(0, 5);

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-xl px-3.5 py-3 animate-fade-in">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto shrink-0"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Pantry Ingredients */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Refrigerator className="h-5 w-5 text-sage-700" />
            <h2 className="font-serif text-xl">{t("pantryTitle")}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => copyAll("pantry")}
              disabled={pantry.length === 0}
              className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-40"
              title={t("copyAll")}
            >
              {copied === "pantry" ? <Check className="h-3.5 w-3.5 text-sage-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "pantry" ? t("copied") : t("copyAll")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove("pantry")}
              disabled={pantry.length === 0}
              className="btn-ghost text-xs px-2.5 py-1.5 text-clay-700 disabled:opacity-40"
              title={t("removeAll")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("removeAll")}
            </button>
          </div>
        </div>
        <p className="muted text-sm mb-4">{t("pantrySubtitle")}</p>

        <form onSubmit={handleAddPantry} className="flex flex-wrap gap-2 mb-4">
          <input
            value={pantryDraft}
            onChange={(e) => setPantryDraft(e.target.value)}
            placeholder={t("pantryPlaceholder")}
            className="input flex-1 min-w-[120px]"
          />
          {quantityTracking && (
            <>
              <input
                type="number"
                step="any"
                min="0"
                value={pantryQty}
                onChange={(e) => setPantryQty(e.target.value)}
                className="input w-20"
                aria-label="Quantity"
              />
              <select value={pantryUnit} onChange={(e) => setPantryUnit(e.target.value)} className="input w-24" aria-label="Unit">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </>
          )}
          <VoicePantryInput onAdd={handleVoiceAddPantry} disabled={addingPantry} />
          <button type="submit" disabled={!pantryDraft.trim() || addingPantry} className="btn-primary shrink-0">
            {addingPantry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </form>

        {pantry.length === 0 ? (
          <p className="muted text-sm italic">{t("pantryEmpty")}</p>
        ) : (
          <ul className={`space-y-2 ${compact ? "max-h-48" : "max-h-64"} overflow-y-auto no-scrollbar pr-1`}>
            {pantry.map((item) => {
              const isLow = item.quantity <= item.low_stock_threshold;
              const isEditing = editingId === item.id;
              return (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-cream-100/70 border border-cream-200/70 px-3.5 py-2.5 animate-fade-in">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-charcoal-900 capitalize truncate">{item.name}</div>
                    {quantityTracking && (isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number" step="any" min="0" value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          className="w-16 rounded-md border border-cream-300 bg-cream-50/50 px-2 py-0.5 text-xs"
                        />
                        <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="rounded-md border border-cream-300 bg-cream-50/50 px-1.5 py-0.5 text-xs">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button type="button" onClick={() => savePantryEdit(item.id)} className="text-xs font-medium text-sage-700 hover:text-sage-800">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-charcoal-700/50">Cancel</button>
                      </div>
                    ) : (
                      <div className="text-xs muted flex items-center gap-2 mt-0.5">
                        <button type="button" onClick={() => startEdit(item)} className="hover:text-sage-700 transition">
                          {item.quantity} {item.unit}
                        </button>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-clay-700 bg-clay-50 border border-clay-200 rounded-full px-2 py-0.5">
                            <AlertCircle className="h-2.5 w-2.5" /> Low Stock
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => removePantry(item.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-full text-charcoal-700/50 hover:text-clay-700 hover:bg-clay-50 transition shrink-0" aria-label={`Remove ${item.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Spices & Condiments */}
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-sage-700" />
            <h2 className="font-serif text-xl">Spices &amp; Condiments</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => copyAll("spices")}
              disabled={spices.length === 0}
              className="btn-ghost text-xs px-2.5 py-1.5 disabled:opacity-40"
              title={t("copyAll")}
            >
              {copied === "spices" ? <Check className="h-3.5 w-3.5 text-sage-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "spices" ? t("copied") : t("copyAll")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove("spices")}
              disabled={spices.length === 0}
              className="btn-ghost text-xs px-2.5 py-1.5 text-clay-700 disabled:opacity-40"
              title={t("removeAll")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("removeAll")}
            </button>
          </div>
        </div>
        <p className="muted text-sm mb-4">The AI will only use these spices. Add what you actually have.</p>

        <form onSubmit={(e) => { e.preventDefault(); handleAddSpice(spiceDraft); }} className="flex flex-wrap gap-2 mb-2">
          <input
            value={spiceDraft}
            onChange={(e) => { setSpiceDraft(e.target.value); setSpiceSearch(e.target.value); }}
            placeholder="e.g. Turmeric, Olive Oil, Garam Masala"
            className="input flex-1 min-w-[120px]"
          />
          {quantityTracking && (
            <>
              <input type="number" step="any" min="0" value={spiceQty} onChange={(e) => setSpiceQty(e.target.value)} className="input w-20" aria-label="Quantity" />
              <select value={spiceUnit} onChange={(e) => setSpiceUnit(e.target.value)} className="input w-24" aria-label="Unit">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </>
          )}
          <VoicePantryInput onAdd={handleVoiceAddSpice} disabled={addingSpice} />
          <button type="submit" disabled={!spiceDraft.trim() || addingSpice} className="btn-primary shrink-0">
            {addingSpice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </form>

        {filteredSpiceSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {filteredSpiceSuggestions.map((s) => (
              <button key={s} type="button" onClick={() => handleAddSpice(s)} className="chip chip-off text-xs">
                <Plus className="h-3 w-3" /> {s}
              </button>
            ))}
          </div>
        )}

        {spices.length === 0 ? (
          <p className="muted text-sm italic">No spices added yet. The AI will only assume salt, pepper, and water.</p>
        ) : (
          <ul className={`space-y-2 ${compact ? "max-h-40" : "max-h-56"} overflow-y-auto no-scrollbar pr-1`}>
            {spices.map((item) => {
              const isLow = item.quantity <= item.low_stock_threshold;
              const isEditing = editingId === `spice-${item.id}`;
              return (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-sage-50/50 border border-sage-100 px-3.5 py-2.5 animate-fade-in">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-charcoal-900 capitalize truncate">{item.name}</div>
                    {quantityTracking && (isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input type="number" step="any" min="0" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-16 rounded-md border border-cream-300 bg-cream-50/50 px-2 py-0.5 text-xs" />
                        <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className="rounded-md border border-cream-300 bg-cream-50/50 px-1.5 py-0.5 text-xs">
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button type="button" onClick={() => saveSpiceEdit(item.id)} className="text-xs font-medium text-sage-700 hover:text-sage-800">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-charcoal-700/50">Cancel</button>
                      </div>
                    ) : (
                      <div className="text-xs muted flex items-center gap-2 mt-0.5">
                        <button type="button" onClick={() => startEdit(item)} className="hover:text-sage-700 transition">
                          {item.quantity} {item.unit}
                        </button>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-clay-700 bg-clay-50 border border-clay-200 rounded-full px-2 py-0.5">
                            <AlertCircle className="h-2.5 w-2.5" /> Low Stock
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => removeSpiceItem(item.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-full text-charcoal-700/50 hover:text-clay-700 hover:bg-clay-50 transition shrink-0" aria-label={`Remove ${item.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Confirmation dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmRemove(null)}>
          <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-clay-600" />
              <h3 className="font-serif text-lg text-charcoal-900">{confirmRemove === "pantry" ? t("removeAllPantryTitle") : t("removeAllSpicesTitle")}</h3>
            </div>
            <p className="text-sm text-charcoal-700 mb-5">{confirmRemove === "pantry" ? t("removeAllPantryConfirm") : t("removeAllSpicesConfirm")}</p>
            <div className="flex items-center gap-2 justify-end">
              <button type="button" onClick={() => setConfirmRemove(null)} className="btn-ghost">{t("cancel")}</button>
              <button type="button" onClick={() => handleRemoveAll(confirmRemove)} className="btn-clay">
                <Trash2 className="h-4 w-4" />
                {t("removeAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
