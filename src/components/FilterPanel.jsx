"use client";

import SearchableSelect from "./SearchableSelect";
import { DEFAULT_FILTERS, DEFAULT_MIN_SEVERITY } from "@/lib/filterDefaults";

const SEVERITY_LABELS = ["", "Mild", "Light", "Moderate", "Strong", "Extreme"];
const SEVERITY_ICONS = ["", "😌", "😏", "😤", "🔥", "💀"];

export function countActiveFilters(filters) {
  let n = 0;
  if (filters.language) n++;
  if (filters.country) n++;
  if (filters.category) n++;
  if (filters.tone) n++;
  if (filters.sfwOnly) n++;
  if (filters.nsfwOnly) n++;
  if (
    filters.minSeverity &&
    filters.minSeverity > 1 &&
    filters.minSeverity !== DEFAULT_MIN_SEVERITY
  ) {
    n++;
  }
  return n;
}

function buildLanguageOptions(languages = []) {
  const bases = new Set();
  languages.forEach((l) => {
    const base = l.split(/\s*[-–]/)[0].trim();
    if (base) bases.add(base);
  });
  const baseList = [...bases].sort();
  const rest = languages.filter((l) => !baseList.includes(l));
  return [...baseList, ...rest];
}

export default function FilterPanel({
  meta,
  filters,
  setFilters,
  isOpen,
  onClose,
}) {
  if (!meta) return null;

  const languageOptions = buildLanguageOptions(meta.languages);

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
  };

  const activeCount = countActiveFilters(filters);
  const hasFilters = activeCount > 0;

  const handleSfwToggle = () => {
    setFilters((f) => ({
      ...f,
      sfwOnly: !f.sfwOnly,
      nsfwOnly: !f.sfwOnly ? false : f.nsfwOnly,
    }));
  };

  const handleNsfwToggle = () => {
    setFilters((f) => ({
      ...f,
      nsfwOnly: !f.nsfwOnly,
      sfwOnly: !f.nsfwOnly ? false : f.sfwOnly,
    }));
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:relative top-0 left-0 z-40 h-full
          w-72 bg-gaali-surface border-r border-gaali-border
          flex flex-col overflow-hidden
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gaali-muted uppercase tracking-wider">
              Filters
            </h2>
            {hasFilters && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gaali-red text-white text-[10px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-gaali-red hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="lg:hidden text-gaali-muted hover:text-white p-1"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gaali-muted mb-2">
              Min severity{" "}
              <span className="text-gaali-dim font-mono">
                {SEVERITY_ICONS[filters.minSeverity]}{" "}
                {filters.minSeverity}/5 — {SEVERITY_LABELS[filters.minSeverity]}
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={filters.minSeverity || 1}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  minSeverity: parseInt(e.target.value, 10),
                }))
              }
              className="severity-slider w-full"
            />
            <div className="flex justify-between text-[10px] text-gaali-dim mt-1 px-0.5">
              <span>😌 1</span>
              <span>😏 2</span>
              <span>😤 3</span>
              <span>🔥 4</span>
              <span>💀 5</span>
            </div>
          </div>

          <SearchableSelect
            label="Language"
            value={filters.language}
            onChange={(language) => setFilters((f) => ({ ...f, language }))}
            options={languageOptions}
            placeholder="Type a language…"
            emptyLabel="All languages"
          />

          <SearchableSelect
            label="Country"
            value={filters.country}
            onChange={(country) => setFilters((f) => ({ ...f, country }))}
            options={meta.countries || []}
            placeholder="Type a country…"
            emptyLabel="All countries"
          />

          <SearchableSelect
            label="Category"
            value={filters.category}
            onChange={(category) => setFilters((f) => ({ ...f, category }))}
            options={meta.categories || []}
            placeholder="Type a category…"
            emptyLabel="All categories"
            formatOption={(cat) => cat.replace(/_/g, " ")}
          />

          <div>
            <label className="block text-xs font-medium text-gaali-muted mb-2">
              Tone
            </label>
            <select
              value={filters.tone}
              onChange={(e) =>
                setFilters((f) => ({ ...f, tone: e.target.value }))
              }
              className="filter-select"
            >
              <option value="">All Tones</option>
              {meta.tones?.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gaali-muted">
                Safe for work only
              </label>
              <button
                onClick={handleSfwToggle}
                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200
                  ${filters.sfwOnly ? "bg-green-600" : "bg-gaali-border"}
                `}
                aria-pressed={filters.sfwOnly}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
                    transition-transform duration-200
                    ${filters.sfwOnly ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gaali-muted">
                NSFW only 🔞
              </label>
              <button
                onClick={handleNsfwToggle}
                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200
                  ${filters.nsfwOnly ? "bg-gaali-red" : "bg-gaali-border"}
                `}
                aria-pressed={filters.nsfwOnly}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
                    transition-transform duration-200
                    ${filters.nsfwOnly ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-gaali-border" />

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gaali-muted uppercase tracking-wider">
              Database Stats
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gaali-card rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gaali-red font-mono">
                  {meta.totalEntries?.toLocaleString()}
                </p>
                <p className="text-[10px] text-gaali-dim mt-0.5">entries</p>
              </div>
              <div className="bg-gaali-card rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-gaali-orange font-mono">
                  {meta.totalLanguages}
                </p>
                <p className="text-[10px] text-gaali-dim mt-0.5">languages</p>
              </div>
            </div>
            <div className="bg-gaali-card rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-gaali-gold font-mono">
                {meta.totalCountries}
              </p>
              <p className="text-[10px] text-gaali-dim mt-0.5">countries</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                meta.ollamaEnabled && meta.ollamaAvailable
                  ? "bg-green-500"
                  : "bg-gaali-orange"
              }`}
            />
            <span className="text-xs text-gaali-dim">
              {meta.ollamaEnabled
                ? meta.ollamaAvailable
                  ? "Ollama connected"
                  : "Ollama enabled but offline (templates)"
                : "Standalone mode — no Ollama needed"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
