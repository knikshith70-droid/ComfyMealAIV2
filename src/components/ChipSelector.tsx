import { useEffect, useState } from "react";
import { addCustomOption, deleteCustomOption, fetchOptions } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import type { CustomOption, OptionCategory } from "../lib/supabase";
import { Plus, Loader2, Check, X } from "lucide-react";

interface Props {
  category: OptionCategory;
  selected: string[];
  onChange: (next: string[]) => void;
  color?: "sage" | "clay";
  placeholder?: string;
}
export function ChipSelector({ category, selected, onChange, color = "sage", placeholder = "Add your own" }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [options, setOptions] = useState<CustomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const opts = await fetchOptions(category, user?.id);
        if (mounted) setOptions(opts);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load options");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [category, user?.id]);

  const removeOption = async (opt: CustomOption, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCustomOption(opt.id);
      setOptions((prev) => prev.filter((o) => o.id !== opt.id));
      onChange(selected.filter((s) => s !== opt.value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove option");
    }
  };

  const toggle = (value: string) => {
    const v = value.toLowerCase();
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

   const submitAdd = async () => {
    const v = draft.trim().toLowerCase();
    if (!v) return;

    // Already visible to you (a preset or your own earlier addition)? Just select it, no network call.
    const existingLocal = options.find((o) => o.value === v);
    if (existingLocal) {
      if (!selected.includes(v)) onChange([...selected, v]);
      setDraft("");
      setAdding(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await addCustomOption(category, v, user?.id);
      if (created) {
        setOptions((prev) => {
          if (prev.some((p) => p.value === (created as CustomOption).value)) return prev;
          return [...prev, created as CustomOption];
        });
        if (!selected.includes(v)) onChange([...selected, v]);
        setDraft("");
        setAdding(false);
      } else {
        setError("Someone already added this word — try a different one.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add option");
    } finally {
      setSaving(false);
    }
  };

  const onCls = color === "clay" ? "chip-clay" : "chip-on";

  return (
    <div>
      {loading ? (
        <div className="flex items-center gap-2 muted text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading options…
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const on = selected.includes(opt.value);
            const ownedByMe = opt.created_by === user?.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`chip ${on ? onCls : "chip-off"} group relative`}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {capitalize(opt.value)}
                {ownedByMe && (
                  <span
                    role="button"
                    onClick={(e) => removeOption(opt, e)}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}

          {adding ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sage-300 bg-cream-50 pl-3 pr-1 py-1 animate-pop">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); submitAdd(); }
                  if (e.key === "Escape") { setDraft(""); setAdding(false); }
                }}
                placeholder={placeholder}
                className="bg-transparent outline-none text-sm w-32 placeholder:text-charcoal-700/40"
              />
              <button
                type="button"
                onClick={submitAdd}
                disabled={saving || !draft.trim()}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-sage-600 text-cream-50 hover:bg-sage-700 disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => { setDraft(""); setAdding(false); }}
                className="h-7 w-7 inline-flex items-center justify-center rounded-full text-charcoal-700/60 hover:bg-cream-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="chip chip-off border-dashed">
              <Plus className="h-3.5 w-3.5" /> {t("addYourOwn")}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-clay-700 mt-2">{error}</p>}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
