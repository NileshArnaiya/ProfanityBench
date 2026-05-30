const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 12000;

/** Set to "true" to use Ollama; default off so deploy works without a local model. */
export function isOllamaEnabled() {
  const v = (process.env.USE_OLLAMA || "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

const SYSTEM_PROMPT = `You are GaaliGPT — the world's spiciest multilingual profanity expert.
Use ONLY the database results provided. Be fun and concise (2-4 sentences). Mention severity and language. Never invent words.`;

function describeIntent(query, parsed, filters) {
  const parts = [];
  if (query) parts.push(`Query: "${query}"`);
  if (parsed?.languages?.length)
    parts.push(`Language: ${parsed.languages.join(", ")}`);
  if (parsed?.minSeverity)
    parts.push(`Min severity: ${parsed.minSeverity}/5`);
  if (parsed?.nsfwOnly || filters?.nsfwOnly) parts.push("NSFW only");
  if (parsed?.sfwOnly || filters?.sfwOnly) parts.push("SFW only");
  if (filters?.language) parts.push(`Filter language: ${filters.language}`);
  if (filters?.minSeverity && filters.minSeverity > 1)
    parts.push(`Sidebar min severity: ${filters.minSeverity}/5`);
  return parts.length ? parts.join("\n") : "General search";
}

function stripModelNoise(text) {
  if (!text) return "";
  return text
    .replace(/[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\n]+/, "")
    .trim();
}

export function fallbackResponse(query, searchResults) {
  const { type, results, total, parsed, filters } = searchResults;
  const wantedSpicy =
    (parsed?.minSeverity || 0) >= 4 ||
    (filters?.minSeverity || 0) >= 4 ||
    parsed?.nsfwOnly ||
    filters?.nsfwOnly;

  if (results.length === 0) {
    const hints = [];
    if (parsed?.languages?.length)
      hints.push(parsed.languages[0]);
    if (parsed?.minSeverity) hints.push(`severity ${parsed.minSeverity}+`);
    if (parsed?.nsfwOnly) hints.push("NSFW");
    const hintStr = hints.length ? hints.join(" + ") : "loosen filters";
    return `No matches for that combo. Try **${hintStr}** in the sidebar, or a shorter query like "Hindi insults severity 5" 🌶️🔍`;
  }

  if (type === "count") {
    const langs = [...new Set(results.map((r) => r.language))];
    return `Found **${total}** entries across ${langs.length} language(s). Scroll the cards below 🔥`;
  }

  const langs = [...new Set(results.map((r) => r.language))];
  const langLabel =
    langs.length === 1 ? langs[0] : langs.slice(0, 3).join(", ");
  const topSeverity = Math.max(...results.map((r) => r.severity));
  const topWords = results
    .slice(0, 3)
    .map((r) => `**${r.word}** (${r.severity}/5)`)
    .join(", ");

  if (wantedSpicy && topSeverity < 4) {
    return `Found **${total}** in ${langs.join(", ")} — spiciest only **${topSeverity}/5**. Slide severity to 5 or toggle NSFW for harder hits 🌶️`;
  }

  if (total === 1) {
    const r = results[0];
    return `One gaali: **${r.word}** [${r.transliteration}] — **${r.severity}/5** in ${r.language}. Tap 🔊 to hear it! 🔥`;
  }

  return `Served **${total}** gaalis from **${langLabel}** (up to **${topSeverity}/5**). Top picks: ${topWords}. Tap 🔊 on any card to pronounce! 🌶️`;
}

async function callOllama(query, searchResults) {
  const { type, results, total, parsed, filters } = searchResults;

  let context = "";
  if (results.length === 0) {
    context = "NO RESULTS.";
  } else {
    context = `${total} total, showing ${results.length}:\n`;
    context += results
      .slice(0, 12)
      .map(
        (r) =>
          `"${r.word}" [${r.transliteration}] ${r.language} sev=${r.severity}/5 SFW=${r.safe_for_work} — ${r.actual_meaning}`
      )
      .join("\n");
  }

  const userMessage = `${describeIntent(query, parsed, filters)}\n\n${context}\n\nShort witty summary (2-3 sentences). Cards show below.`;

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      stream: false,
      options: { temperature: 0.7, num_predict: 200 },
    }),
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = stripModelNoise(data.message?.content);
  if (!content) throw new Error("Empty Ollama response");
  return content;
}

/** Main entry: uses template by default; Ollama only when USE_OLLAMA=true. */
export async function personalizeResponse(query, searchResults) {
  if (!isOllamaEnabled()) {
    return fallbackResponse(query, searchResults);
  }

  try {
    return await callOllama(query, searchResults);
  } catch (err) {
    console.warn("Ollama failed, using template:", err.message);
    return fallbackResponse(query, searchResults);
  }
}

/** @deprecated Use personalizeResponse */
export async function personalizeWithOllama(query, searchResults) {
  return personalizeResponse(query, searchResults);
}

export async function isOllamaAvailable() {
  if (!isOllamaEnabled()) return false;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
