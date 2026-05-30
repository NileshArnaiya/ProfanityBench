"use client";

import { useState, useRef, useEffect, useMemo } from "react";

/**
 * Searchable combobox for long filter lists (languages, countries, categories).
 */
export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Type to search…",
  emptyLabel = "All",
  formatOption = (opt) => opt,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selectedLabel = value
    ? formatOption(
        options.find((o) => o === value || o.value === value) ?? value
      )
    : emptyLabel;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = options.map((o) =>
      typeof o === "string" ? { value: o, label: formatOption(o) } : o
    );
    if (!q) return list.slice(0, 80);
    return list
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [options, query, formatOption]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (val) => {
    onChange(val);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-medium text-gaali-muted mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={open ? query : selectedLabel === emptyLabel ? "" : selectedLabel}
          placeholder={value ? selectedLabel : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          className="filter-select searchable-select-input pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => pick("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gaali-dim hover:text-gaali-red text-xs"
            aria-label="Clear selection"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <ul className="searchable-select-dropdown" role="listbox">
          <li>
            <button
              type="button"
              className="searchable-select-option"
              onClick={() => pick("")}
            >
              {emptyLabel}
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gaali-dim">No matches</li>
          ) : (
            filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  className={`searchable-select-option ${
                    o.value === value ? "selected" : ""
                  }`}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
          {options.length > 80 && !query && (
            <li className="px-3 py-1.5 text-[10px] text-gaali-dim border-t border-gaali-border">
              Type to search {options.length} options…
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
