import { getDatabase, getIndex } from "./database";

// ── Known language aliases for smarter matching ─────────────────────
const LANGUAGE_ALIASES = {
  hindi: ["hindi"],
  spanish: ["spanish", "andalusian"],
  korean: ["korean"],
  catalan: ["catalan"],
  tamil: ["tamil", "tanglish"],
  bhojpuri: ["bhojpuri"],
  konkani: ["konkani"],
  basque: ["basque", "euskara"],
  bengali: ["bengali", "dhaka"],
  somali: ["somali"],
  finnish: ["finnish"],
  mandarin: ["mandarin", "taiwan"],
  taiwanese: ["mandarin", "taiwan"],
  malayalam: ["malayalam", "malabar"],
  hopi: ["hopi"],
  english: ["english", "australian", "engsh"],
  australian: ["australian"],
  kenyan: ["engsh", "kenya"],
  french: ["french"],
  italian: ["italian"],
  german: ["german"],
  japanese: ["japanese"],
  chinese: ["mandarin", "cantonese", "chinese"],
  portuguese: ["portuguese"],
  arabic: ["arabic"],
  russian: ["russian"],
  swahili: ["swahili"],
  turkish: ["turkish"],
  punjabi: ["punjabi"],
  marathi: ["marathi"],
  telugu: ["telugu"],
  urdu: ["urdu"],
  rajasthani: ["rajasthani", "marwari"],
  pedi: ["pedi", "sepedi"],
};

// ── Concept synonyms for meaning-based search ───────────────────────
const CONCEPT_MAP = {
  motherfucker: ["mother", "fucker", "incest", "mom"],
  idiot: ["idiot", "fool", "stupid", "dumb", "intelligence", "moron"],
  fool: ["fool", "idiot", "stupid", "foolish", "silly"],
  coward: ["coward", "timid", "scared", "courage", "chicken"],
  drunk: ["drunk", "alcohol", "drink", "wasted", "intoxicated"],
  shit: ["shit", "feces", "crap", "excrement", "poop"],
  fuck: ["fuck", "sexual", "screw"],
  ass: ["ass", "arse", "butt", "backside"],
  bitch: ["bitch", "whore", "slut", "promiscuous"],
  pig: ["pig", "swine", "hog", "dirty", "filthy"],
  lazy: ["lazy", "useless", "unproductive", "slob"],
  ugly: ["ugly", "unattractive", "hideous"],
  fat: ["fat", "overweight", "obese"],
  crazy: ["crazy", "mad", "insane", "mental"],
  liar: ["liar", "cheat", "dishonest", "trickster"],
  religious: ["religious", "god", "christ", "church", "holy"],
  sister: ["sister", "akka", "thangai", "sibling"],
  brother: ["brother", "bhai"],
  insult: ["insult", "offensive", "profanity", "curse", "slur"],
  gaali: ["gaali", "curse", "insult", "profanity"],
};

// False positives when matching Hindi (not standard Hindi dialects)
const HINDI_LANGUAGE_EXCLUDE_RE =
  /internet|hinglish|register|hijra|kothi|prison|military|twitter|diaspora/i;

// Query "italian" → Italian - Standard, Italian - Romanesco, etc. (not random "italian" substrings)
const STRICT_LANGUAGE_LABELS = {
  hindi: "Hindi",
  spanish: "Spanish",
  french: "French",
  german: "German",
  italian: "Italian",
  portuguese: "Portuguese",
  russian: "Russian",
  arabic: "Arabic",
  japanese: "Japanese",
  korean: "Korean",
  chinese: "Chinese",
  mandarin: "Mandarin",
  tamil: "Tamil",
  bengali: "Bengali",
  punjabi: "Punjabi",
  marathi: "Marathi",
  telugu: "Telugu",
  urdu: "Urdu",
  bhojpuri: "Bhojpuri",
  konkani: "Konkani",
  turkish: "Turkish",
  swahili: "Swahili",
  finnish: "Finnish",
  catalan: "Catalan",
  basque: "Basque",
  somali: "Somali",
  malayalam: "Malayalam",
};

const INSULT_CATEGORY_RE =
  /insult|profanity|curse|slur|crude|vulgar|fighting|incest|sexual|mother|sister|homophob|misogyn|abuse|threat|offensive/i;

const LOW_RELEVANCE_CATEGORY_RE =
  /prison|criminal slang|drug|manosphere|body|competence|everyday|expressive|gendered slang|minced|interjection|boss_insult|purity|impurity|playful_banter|training slang/i;

const TOP_GAALI_MARKERS = [
  "behenchod",
  "behanchod",
  "bhenchod",
  "madarchod",
  "maderchod",
  "bhosdike",
  "bhosdiwale",
  "chutiya",
  "chutiye",
  "gaandu",
  "gandu",
  "randi",
  "harami",
  "haramkhor",
  "kutiya",
  "kutti",
  "lund",
  "lauda",
  "chutmar",
  "chut mar",
  "maa chod",
  "ma chod",
  "teri maa",
  "teri ma",
  "bhen ke",
  "behen ke",
  "madar",
  "bhadwa",
  "bhosda",
  "jhant",
  "jhatu",
  "cazzo",
  "stronzo",
  "stronza",
  "puttana",
  "minchia",
  "vaffanculo",
  "figlio di puttana",
  "figlia di puttana",
  "porco",
  "merda",
];

/** Match base language + regional dialects (e.g. Italian - Romanesco). */
function matchesLanguageFamily(entryLang, baseName) {
  if (!entryLang || !baseName) return false;
  if (entryLang === baseName) {
    if (baseName === "Hindi" && HINDI_LANGUAGE_EXCLUDE_RE.test(entryLang))
      return false;
    return true;
  }
  if (
    entryLang.startsWith(`${baseName} -`) ||
    entryLang.startsWith(`${baseName}-`)
  ) {
    if (baseName === "Hindi" && HINDI_LANGUAGE_EXCLUDE_RE.test(entryLang))
      return false;
    return true;
  }
  return false;
}

function wantsInsults(parsed) {
  const q = (parsed.raw || "").toLowerCase();
  return (
    /insult|gaali|gaalis|curse|curses|profanity|swear|abuse|slur|offensive/.test(
      q
    ) || parsed.concepts?.some((c) => ["insult", "curse", "profanity", "offensive", "slur"].includes(c))
  );
}

function hasActiveFilters(filters) {
  return !!(
    filters.language ||
    filters.country ||
    filters.category ||
    filters.tone ||
    filters.sfwOnly ||
    filters.nsfwOnly ||
    (filters.minSeverity && filters.minSeverity > 1)
  );
}

function mergeSeverity(parsed, filters) {
  const minSeverity =
    Math.max(
      parsed.minSeverity || 0,
      filters.minSeverity ? Number(filters.minSeverity) : 0
    ) || null;
  const maxSeverity =
    parsed.maxSeverity ||
    (filters.maxSeverity ? Number(filters.maxSeverity) : null);

  let sfwOnly = parsed.sfwOnly || filters.sfwOnly;
  let nsfwOnly =
    parsed.nsfwOnly ||
    filters.nsfwOnly ||
    /not safe for work|not.?sfw|unsafe for work/.test(
      (parsed.raw || "").toLowerCase()
    );

  // NSFW wins when both would apply (e.g. "not safe for work" contains "safe for work")
  if (sfwOnly && nsfwOnly) sfwOnly = false;

  return {
    minSeverity: minSeverity || null,
    maxSeverity: maxSeverity || null,
    sfwOnly,
    nsfwOnly,
  };
}

function applyFilters(candidates, parsed, filters) {
  const sev = mergeSeverity(parsed, filters);

  if (filters.language) {
    const fl = filters.language.trim();
    candidates = candidates.filter((e) => {
      const entryLang = (e.language || "").trim();
      if (entryLang.toLowerCase() === fl.toLowerCase()) return true;
      if (matchesLanguageFamily(entryLang, fl)) return true;
      // Typed search: "Italian" matches "Italian - Romanesco"
      const base = fl.split(/\s*[-–/]/)[0].trim();
      if (base.length > 2 && matchesLanguageFamily(entryLang, base))
        return true;
      return entryLang.toLowerCase().includes(fl.toLowerCase());
    });
  }
  if (filters.country) {
    const country = filters.country.toLowerCase();
    candidates = candidates.filter((e) =>
      (e.country || "").toLowerCase().includes(country)
    );
  }
  if (filters.category) {
    const cat = filters.category.toLowerCase();
    candidates = candidates.filter((e) =>
      (e.category || "").toLowerCase().includes(cat)
    );
  }
  if (filters.tone) {
    const tone = filters.tone.toLowerCase();
    candidates = candidates.filter(
      (e) => (e.tone || "").toLowerCase() === tone
    );
  }

  if (sev.sfwOnly) {
    candidates = candidates.filter((e) => e.safe_for_work);
  }
  if (sev.nsfwOnly) {
    candidates = candidates.filter((e) => !e.safe_for_work);
  }

  if (sev.maxSeverity) {
    candidates = candidates.filter((e) => e.severity <= sev.maxSeverity);
  }
  if (sev.minSeverity) {
    candidates = candidates.filter((e) => e.severity >= sev.minSeverity);
  }

  return candidates;
}

function computeRelevanceScore(entry, parsed) {
  let score = entry._score || 0;
  const cat = (entry.category || "").toLowerCase();
  const meaning = (entry.actual_meaning || "").toLowerCase();
  const translit = (entry.transliteration || "").toLowerCase();
  const word = (entry.word || "").toLowerCase();
  const combined = `${translit} ${word} ${meaning}`;

  if (wantsInsults(parsed)) {
    if (INSULT_CATEGORY_RE.test(cat)) score += 100;
    if (LOW_RELEVANCE_CATEGORY_RE.test(cat)) score -= 80;

    for (const marker of TOP_GAALI_MARKERS) {
      if (combined.includes(marker)) score += 150;
    }

    if (
      /prison|jail|incarcerat|informant|contraban|gang|police mole/.test(
        meaning
      )
    ) {
      score -= 70;
    }
    if (
      /coded reference|being in prison|inside/.test(meaning) &&
      !/insult|fuck|abuse/.test(meaning)
    ) {
      score -= 50;
    }
  }

  score += (entry.popularity_score || 0) * 8;
  score += (entry.severity || 0) * 4;

  return score;
}

function rankByRelevance(candidates, parsed) {
  const ranked = candidates.map((e) => ({
    ...e,
    _relevance: computeRelevanceScore(e, parsed),
  }));
  ranked.sort((a, b) => b._relevance - a._relevance);
  return ranked;
}

function sortCandidates(candidates, parsed, preferHighSeverity) {
  const insultQuery = wantsInsults(parsed);
  if (insultQuery) {
    let ranked = rankByRelevance(candidates, parsed);
    const strong = ranked.filter((e) => e._relevance >= 40);
    if (strong.length >= 8) ranked = strong;
    return ranked;
  }

  return candidates.sort((a, b) => {
    if (preferHighSeverity && a.severity !== b.severity) {
      return b.severity - a.severity;
    }
    const popDiff = (b.popularity_score || 0) - (a.popularity_score || 0);
    if (popDiff !== 0) return popDiff;
    return (b._score || 0) - (a._score || 0);
  });
}

function entryMatchesLanguage(entry, parsed, filters) {
  const entryLang = (entry.language || "").trim();

  if (filters.language) {
    const fl = filters.language.trim();
    if (entryLang.toLowerCase() === fl.toLowerCase()) return true;
    return matchesLanguageFamily(entryLang, fl);
  }

  if (parsed.strictLanguage) {
    return matchesLanguageFamily(entryLang, parsed.strictLanguage);
  }

  if (parsed.languages.length > 0) {
    const lang = entryLang.toLowerCase();
    const country = (entry.country || "").toLowerCase();
    return parsed.languages.some((l) => {
      if (STRICT_LANGUAGE_LABELS[l] && parsed.strictLanguage) {
        return matchesLanguageFamily(entryLang, parsed.strictLanguage);
      }
      return lang.includes(l) || country.includes(l);
    });
  }

  return true;
}

// ── Parse a natural language query ──────────────────────────────────
export function parseQuery(rawQuery) {
  const q = (rawQuery || "").toLowerCase().trim();

  const parsed = {
    raw: rawQuery,
    isCountQuery: /how many|count|number of|total/.test(q),
    isTranslation: /how (do|to) (you )?say|translate|what('?s| is) .+ (in|for)/.test(
      q
    ),
    isRandom: /\b(random|surprise)\b/.test(q) || /\bany\b random\b/.test(q),
    isListAll: /^(show |list |all |give me )?(all|every)/.test(q),
    isBrowse:
      !q ||
      q === "browse" ||
      q === "explore" ||
      /^browse\s|^explore\s|^show\s+filtered/.test(q),
    languages: [],
    concepts: [],
    tokens: [],
    sfwOnly: false,
    nsfwOnly: false,
    maxSeverity: null,
    minSeverity: null,
    strictLanguage: null,
    wantsInsults: false,
  };

  const wantsNsfw =
    /\bnsfw\b/.test(q) ||
    /not safe for work|not.?sfw|unsafe for work/.test(q) ||
    /\b(obscene|uncensored)\b/.test(q) ||
    (/\b(dirty|vulgar)\b/.test(q) && !/safe.?for.?work/.test(q));

  parsed.nsfwOnly = wantsNsfw;
  parsed.sfwOnly =
    !wantsNsfw &&
    (/safe.?for.?work|sfw only|family.?friendly/.test(q) ||
      (/\bclean\b/.test(q) && /\bonly\b/.test(q)));

  // Explicit severity: "5/5", "severity 5", "5 out of 5"
  const slashMatch = q.match(/(\d)\s*\/\s*5/);
  const sevAfterMatch = q.match(/severity\s*(?:of\s*)?(\d)/);
  const sevBeforeMatch = q.match(/(\d)\s*(?:out of\s*5\s*)?severity/);
  const exactSev = slashMatch || sevAfterMatch || sevBeforeMatch;
  if (exactSev) {
    const n = parseInt(exactSev[1], 10);
    if (n >= 4) parsed.minSeverity = n;
    else if (n <= 2) parsed.maxSeverity = n;
    else parsed.minSeverity = n;
  }

  // Qualitative severity
  if (
    /highest|most offensive|spiciest|strongest|most vulgar|worst|hardest|extreme|maximum|max severity|level 5/.test(
      q
    )
  ) {
    parsed.minSeverity = Math.max(parsed.minSeverity || 0, 5);
  } else if (
    /very harsh|very strong|very offensive|harsh|strong|severe|brutal/.test(q)
  ) {
    parsed.minSeverity = Math.max(parsed.minSeverity || 0, 4);
  }

  if (/mildest|softest|least offensive|gentlest|tamest|lightest/.test(q)) {
    parsed.maxSeverity = 2;
  } else if (/mild|light|soft|gentle/.test(q) && !parsed.minSeverity) {
    parsed.maxSeverity = 2;
  }

  // "insult" / "gaali" boost intent
  if (/insult|gaali|gaalis|curse|profanity|swear|abuse|slur/.test(q)) {
    parsed.concepts.push("insult", "curse", "profanity", "offensive");
    parsed.wantsInsults = true;
  }

  // Extract languages (strict label when user names a base language)
  Object.entries(LANGUAGE_ALIASES).forEach(([key, aliases]) => {
    if (q.includes(key)) {
      parsed.languages.push(...aliases);
      if (STRICT_LANGUAGE_LABELS[key]) {
        parsed.strictLanguage = STRICT_LANGUAGE_LABELS[key];
      }
    }
  });

  // Extract concepts
  Object.entries(CONCEPT_MAP).forEach(([key, synonyms]) => {
    if (q.includes(key)) {
      parsed.concepts.push(...synonyms);
    }
  });

  const STOPWORDS = new Set([
    "what",
    "how",
    "do",
    "you",
    "say",
    "are",
    "the",
    "in",
    "for",
    "is",
    "a",
    "an",
    "of",
    "to",
    "me",
    "my",
    "can",
    "show",
    "give",
    "tell",
    "find",
    "get",
    "there",
    "some",
    "any",
    "that",
    "this",
    "it",
    "about",
    "with",
    "from",
    "like",
    "would",
    "could",
    "please",
    "want",
    "need",
    "know",
    "many",
    "much",
    "most",
    "all",
    "every",
    "list",
    "words",
    "word",
    "curse",
    "curses",
    "insult",
    "insults",
    "profanity",
    "slang",
    "terms",
    "swear",
    "swearing",
    "bad",
    "highest",
    "hindi",
    "italian",
    "spanish",
    "please",
    "severity",
    "safe",
    "work",
    "not",
  ]);

  q.split(/\s+/).forEach((token) => {
    const clean = token.replace(/[^a-z0-9]/g, "");
    if (clean.length > 1 && !STOPWORDS.has(clean)) {
      parsed.tokens.push(clean);
    }
  });

  return parsed;
}

function browseByFilters(db, filters) {
  const parsed = parseQuery("");
  let candidates = db.map((e) => ({ ...e, _score: 1 }));
  candidates = candidates.filter((e) => entryMatchesLanguage(e, parsed, filters));
  candidates = applyFilters(candidates, parsed, filters);
  return sortCandidates(candidates, parsed, !!filters.minSeverity);
}

/** Direct DB scan when language + severity/NSFW intent is clear (reliable vs token index). */
function searchByIntent(db, parsed, filters) {
  const hasLang =
    parsed.strictLanguage ||
    parsed.languages.length > 0 ||
    filters.language;
  if (!hasLang) return null;

  const sev = mergeSeverity(parsed, filters);

  let candidates = db.filter((e) => {
    if (!entryMatchesLanguage(e, parsed, filters)) return false;
    if (sev.minSeverity && e.severity < sev.minSeverity) return false;
    if (sev.maxSeverity && e.severity > sev.maxSeverity) return false;
    if (sev.sfwOnly && !e.safe_for_work) return false;
    if (sev.nsfwOnly && e.safe_for_work) return false;
    if (filters.category) {
      const cat = filters.category.toLowerCase();
      if (!(e.category || "").toLowerCase().includes(cat)) return false;
    }
    if (filters.tone) {
      if ((e.tone || "").toLowerCase() !== filters.tone.toLowerCase())
        return false;
    }
    if (filters.country) {
      const c = filters.country.toLowerCase();
      if (!(e.country || "").toLowerCase().includes(c)) return false;
    }
    return true;
  });

  candidates = candidates.map((e) => ({
    ...e,
    _score: (e.popularity_score || 0) * 10 + e.severity * 5,
  }));
  return sortCandidates(candidates, parsed, (sev.minSeverity || 0) >= 4);
}

// ── Score-based search ──────────────────────────────────────────────
export function search(rawQuery, filters = {}) {
  const db = getDatabase();
  const index = getIndex();
  const parsed = parseQuery(rawQuery || "");
  const preferHighSeverity = (parsed.minSeverity || 0) >= 4;

  // Browse mode: filters only, no meaningful query
  const queryEmpty = !rawQuery || !String(rawQuery).trim();
  const browseMode =
    queryEmpty ||
    parsed.isBrowse ||
    (hasActiveFilters(filters) &&
      parsed.tokens.length === 0 &&
      parsed.languages.length === 0 &&
      parsed.concepts.length <= 3);

  // Language + severity/NSFW intent → scan dataset directly (most reliable)
  const intentCandidates = searchByIntent(db, parsed, filters);
  if (intentCandidates && intentCandidates.length > 0) {
    if (parsed.isRandom) {
      const rand =
        intentCandidates[
          Math.floor(Math.random() * intentCandidates.length)
        ];
      return {
        type: "random",
        results: [rand],
        total: intentCandidates.length,
        parsed,
        filters,
      };
    }
    const total = intentCandidates.length;
    return {
      type: parsed.isCountQuery ? "count" : "results",
      results: intentCandidates.slice(0, 25),
      total,
      parsed,
      filters,
    };
  }

  if (browseMode && hasActiveFilters(filters)) {
    let candidates = browseByFilters(db, filters);
    if (parsed.isRandom && candidates.length > 0) {
      const rand =
        candidates[Math.floor(Math.random() * candidates.length)];
      return { type: "random", results: [rand], total: 1, parsed, filters };
    }
    const total = candidates.length;
    return {
      type: parsed.isCountQuery ? "count" : "browse",
      results: candidates.slice(0, 25),
      total,
      parsed,
      filters,
    };
  }

  const searchTerms = [
    ...parsed.tokens,
    ...parsed.languages,
    ...parsed.concepts,
  ];

  const scores = new Map();

  searchTerms.forEach((term) => {
    const t = term.toLowerCase();
    if (index[t]) {
      index[t].forEach((idx) => {
        scores.set(idx, (scores.get(idx) || 0) + 3);
      });
    }
    Object.keys(index).forEach((key) => {
      if (key.startsWith(t) || t.startsWith(key)) {
        index[key].forEach((idx) => {
          scores.set(idx, (scores.get(idx) || 0) + 1);
        });
      }
    });
  });

  if (parsed.languages.length > 0 || parsed.strictLanguage || filters.language) {
    db.forEach((entry, idx) => {
      if (entryMatchesLanguage(entry, parsed, filters)) {
        scores.set(idx, (scores.get(idx) || 0) + 10);
      } else if (scores.has(idx)) {
        scores.delete(idx);
      }
    });
  }

  // Severity boost only within language-matched entries
  const minSev = mergeSeverity(parsed, filters).minSeverity;
  if (minSev) {
    db.forEach((entry, idx) => {
      if (!entryMatchesLanguage(entry, parsed, filters)) return;
      if (entry.severity >= minSev) {
        const boost = (entry.severity - minSev + 1) * 3;
        scores.set(idx, (scores.get(idx) || 0) + boost);
      }
    });
  }

  let candidates = Array.from(scores.entries())
    .filter(([, score]) => score > 0)
    .map(([idx, score]) => ({ ...db[idx], _score: score }));

  if (
    candidates.length === 0 &&
    (parsed.languages.length > 0 || parsed.strictLanguage || filters.language)
  ) {
    candidates = db
      .filter((e) => entryMatchesLanguage(e, parsed, filters))
      .map((e) => ({ ...e, _score: 1 }));
  }

  candidates = applyFilters(candidates, parsed, filters);
  candidates = sortCandidates(candidates, parsed, preferHighSeverity);

  if (parsed.isRandom) {
    const pool =
      candidates.length > 0
        ? candidates
        : applyFilters(
            db.map((e) => ({ ...e, _score: 0 })),
            parsed,
            filters
          );
    if (pool.length === 0) {
      return { type: "random", results: [], total: 0, parsed, filters };
    }
    const rand = pool[Math.floor(Math.random() * pool.length)];
    return { type: "random", results: [rand], total: 1, parsed, filters };
  }

  if (
    parsed.isListAll &&
    candidates.length === 0 &&
    hasActiveFilters(filters)
  ) {
    candidates = browseByFilters(db, filters);
  }

  const total = candidates.length;

  return {
    type: parsed.isCountQuery ? "count" : "results",
    results: candidates.slice(0, 25),
    total,
    parsed,
    filters,
  };
}

// ── Quick stats ─────────────────────────────────────────────────────
export function getStats() {
  const db = getDatabase();
  const langs = new Set(db.map((e) => e.language));
  const countries = new Set(db.map((e) => e.country));
  return {
    totalEntries: db.length,
    totalLanguages: langs.size,
    totalCountries: countries.size,
  };
}
