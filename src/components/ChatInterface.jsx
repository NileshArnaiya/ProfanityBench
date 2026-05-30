"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import FilterPanel, { countActiveFilters } from "./FilterPanel";
import ResultCard from "./ResultCard";
import { DEFAULT_FILTERS, DEFAULT_MIN_SEVERITY } from "@/lib/filterDefaults";

const SUGGESTED_PROMPTS = [
  "Give me the highest severity 5/5 Hindi insults, not safe for work",
  "What are the spiciest Korean curse words?",
  "Show me mild safe-for-work Australian slang",
  "Random gaali from anywhere in the world",
  "How many sister insults exist in Tamil?",
  "Harshest Bhojpuri expressions severity 5",
  "Religious profanity in Catalan",
  "Most offensive Spanish insults from Andalusia",
];

const TAGLINES = [
  "Speak gaalis. Understand gaalis. Survive dinner parties.",
  "100k+ insults from every corner of the planet 🌍",
  "From mild 😌 to nuclear 💀 — filter your spice level",
  "Tap 🔊 on any card to hear how it's pronounced",
];

function buildFilterChips(filters) {
  const chips = [];
  if (filters.minSeverity > 1 && filters.minSeverity !== DEFAULT_MIN_SEVERITY)
    chips.push({ key: "sev", label: `Min ${filters.minSeverity}/5 🔥` });
  if (filters.language) chips.push({ key: "lang", label: filters.language });
  if (filters.country) chips.push({ key: "country", label: filters.country });
  if (filters.category)
    chips.push({
      key: "cat",
      label: filters.category.replace(/_/g, " "),
    });
  if (filters.tone) chips.push({ key: "tone", label: filters.tone });
  if (filters.sfwOnly) chips.push({ key: "sfw", label: "SFW only" });
  if (filters.nsfwOnly) chips.push({ key: "nsfw", label: "NSFW only 🔞" });
  return chips;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const lastQueryRef = useRef(null);
  const filtersRef = useRef(filters);
  const skipRequeryRef = useRef(false);

  filtersRef.current = filters;

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then(setMeta)
      .catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const id = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const fetchChat = useCallback(async (query, activeFilters, replaceLast = false) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query || "", filters: activeFilters }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }, []);

  const sendMessage = useCallback(
    async (text, options = {}) => {
      const { replaceLastAssistant = false, browseOnly = false } = options;
      const query = browseOnly ? "" : (text || input.trim());
      const activeFilters = filtersRef.current;

      const hasQuery = !!query;
      const hasFilters = countActiveFilters(activeFilters) > 0;

      if ((!hasQuery && !hasFilters) || isLoading) return;

      if (hasQuery) {
        lastQueryRef.current = query;
        if (!replaceLastAssistant) {
          setMessages((prev) => [...prev, { role: "user", content: query }]);
        }
      }

      setInput("");
      setIsLoading(true);

      try {
        const data = await fetchChat(query, activeFilters);

        const assistantMsg = {
          role: "assistant",
          content: data.message,
          results: data.results,
          total: data.total,
          type: data.type,
        };

        setMessages((prev) => {
          if (replaceLastAssistant) {
            const lastUserIdx = prev.map((m) => m.role).lastIndexOf("user");
            if (lastUserIdx === -1) {
              return [
                ...prev,
                {
                  role: "user",
                  content: query || "Browse with filters",
                },
                assistantMsg,
              ];
            }
            return [...prev.slice(0, lastUserIdx + 1), assistantMsg];
          }
          return [...prev, assistantMsg];
        });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Connection error: ${err.message}. Is the server running?`,
            results: [],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, fetchChat]
  );

  // Auto re-query when filters change (if we have a prior query or active filters)
  useEffect(() => {
    if (skipRequeryRef.current) {
      skipRequeryRef.current = false;
      return;
    }

    const hasFilters = countActiveFilters(filters) > 0;
    const lastQuery = lastQueryRef.current;

    if (messages.length === 0) return;
    if (!lastQuery && !hasFilters) return;

    const timer = setTimeout(() => {
      sendMessage(lastQuery || "", { replaceLastAssistant: true });
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePromptClick = (prompt) => {
    sendMessage(prompt);
  };

  const handleBrowse = () => {
    lastQueryRef.current = "";
    sendMessage("", { browseOnly: true });
  };

  const clearFilters = () => {
    skipRequeryRef.current = true;
    setFilters(DEFAULT_FILTERS);
  };

  const filterChips = buildFilterChips(filters);
  const activeFilterCount = countActiveFilters(filters);
  const isEmpty = messages.length === 0;
  const canBrowse = activeFilterCount > 0 && !isLoading;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <FilterPanel
        meta={meta}
        filters={filters}
        setFilters={setFilters}
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-gaali-border bg-gaali-surface/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterOpen(true)}
              className="lg:hidden relative p-2 rounded-lg hover:bg-gaali-card text-gaali-muted hover:text-white transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-gaali-red text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌶️</span>
              <h1 className="font-display text-xl title-fire tracking-wide">
                GaaliGPT
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {meta && (
              <span className="hidden sm:block text-xs text-gaali-dim font-mono">
                {meta.totalEntries?.toLocaleString()} gaalis
              </span>
            )}
            <button
              onClick={() => {
                lastQueryRef.current = null;
                setMessages([]);
              }}
              className="text-xs text-gaali-muted hover:text-gaali-red transition-colors px-3 py-1.5 rounded-lg hover:bg-gaali-card"
            >
              New chat
            </button>
          </div>
        </header>

        {filterChips.length > 0 && (
          <div className="shrink-0 px-4 py-2 border-b border-gaali-border/50 bg-gaali-bg/50 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-gaali-dim uppercase tracking-wider">
              Active:
            </span>
            {filterChips.map((chip) => (
              <span key={chip.key} className="filter-chip-active">
                {chip.label}
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="text-[10px] text-gaali-red hover:underline ml-1"
            >
              clear
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <WelcomeScreen
              onPromptClick={handlePromptClick}
              onBrowse={handleBrowse}
              canBrowse={canBrowse}
              tagline={TAGLINES[taglineIndex]}
            />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gaali-border bg-gaali-bg px-4 py-4">
          {canBrowse && isEmpty && (
            <div className="max-w-3xl mx-auto mb-2">
              <button
                type="button"
                onClick={handleBrowse}
                className="w-full py-2 rounded-lg border border-gaali-red/40 text-gaali-red text-sm hover:bg-gaali-red/10 transition-colors"
              >
                Browse {activeFilterCount} active filter
                {activeFilterCount > 1 ? "s" : ""} — no query needed 🌶️
              </button>
            </div>
          )}
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask any gaali… e.g. 'severity 5/5 Hindi insults NSFW' or 'how do you say idiot in Spanish'"
              className="chat-input"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && activeFilterCount === 0) || isLoading}
              className={`
                absolute right-3 top-1/2 -translate-y-1/2
                w-8 h-8 rounded-lg flex items-center justify-center
                transition-all duration-200
                ${
                  (input.trim() || activeFilterCount > 0) && !isLoading
                    ? "bg-gaali-red text-white hover:bg-red-600"
                    : "bg-gaali-border text-gaali-dim"
                }
              `}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[10px] text-gaali-dim mt-2">
            GaaliGPT — works offline from your dataset. Set USE_OLLAMA=true for
            AI summaries. 🔊 = pronounce.
          </p>
        </div>
      </main>
    </div>
  );
}

function WelcomeScreen({ onPromptClick, onBrowse, canBrowse, tagline }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12 animate-fade-in">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4 animate-pulse-glow inline-block rounded-full">
          🌶️
        </div>
        <h1 className="font-display text-5xl sm:text-6xl title-fire tracking-wide mb-3">
          GaaliGPT
        </h1>
        <p className="text-gaali-muted text-sm max-w-md mx-auto leading-relaxed min-h-[3rem] transition-opacity">
          {tagline}
        </p>
        <div className="flex justify-center gap-1 mt-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className="spiciness-dot"
              title={`Severity ${n}`}
            >
              {["😌", "😏", "😤", "🔥", "💀"][n - 1]}
            </span>
          ))}
        </div>
      </div>

      {canBrowse && (
        <button
          type="button"
          onClick={onBrowse}
          className="mb-6 px-6 py-2.5 rounded-xl border-2 border-gaali-red text-gaali-red font-medium text-sm hover:bg-gaali-red/15 transition-all animate-fade-in-up"
        >
          Browse with your filters →
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onPromptClick(prompt)}
            className="prompt-chip animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 animate-fade-in-up ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-gaali-card flex items-center justify-center text-sm mt-0.5">
          🌶️
        </div>
      )}

      <div className={`${isUser ? "max-w-md" : "max-w-2xl"} min-w-0`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-gaali-red text-white rounded-br-sm"
              : "bg-gaali-card text-gaali-text rounded-bl-sm"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {renderMarkdownBold(message.content)}
          </p>
        </div>

        {message.results && message.results.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.total > message.results.length && (
              <p className="text-xs text-gaali-dim px-1">
                Showing {message.results.length} of {message.total} results
              </p>
            )}
            {message.results.map((entry, i) => (
              <ResultCard key={entry.id || i} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-gaali-border flex items-center justify-center text-sm mt-0.5">
          👤
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-gaali-card flex items-center justify-center text-sm">
        🌶️
      </div>
      <div className="bg-gaali-card rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function renderMarkdownBold(text) {
  if (!text) return text;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
