import fs from "fs";
import path from "path";

let _db = null;
let _index = null;
let _meta = null;

const DATA_PATH =
  process.env.GAALI_DATA_PATH ||
  path.join(process.cwd(), "data", "gaalis.jsonl");

// ── Load JSONL into memory ──────────────────────────────────────────
function loadJSONL(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        console.warn(`Skipped malformed line ${i + 1}`);
        return null;
      }
    })
    .filter(Boolean);
}

// ── Build inverted index for keyword search ─────────────────────────
function buildIndex(entries) {
  const index = {};

  const addToken = (token, entryIdx) => {
    const t = token.toLowerCase().trim();
    if (t.length < 2) return;
    if (!index[t]) index[t] = new Set();
    index[t].add(entryIdx);
  };

  entries.forEach((entry, idx) => {
    // Index all searchable text fields
    const fields = [
      entry.language,
      entry.country,
      entry.region,
      entry.word,
      entry.transliteration,
      entry.literal_translation,
      entry.actual_meaning,
      entry.category,
      entry.target_type,
      entry.usage_context,
      entry.tone,
      entry.etymology,
      entry.notes,
    ];

    fields.forEach((field) => {
      if (!field) return;
      String(field)
        .split(/[\s,;_\-/()]+/)
        .forEach((token) => addToken(token, idx));
    });

    // Also index severity and generation as tokens
    if (entry.severity) addToken(`severity${entry.severity}`, idx);
    if (entry.generation) addToken(entry.generation, idx);
    if (entry.safe_for_work) addToken("sfw", idx);
    if (!entry.safe_for_work) addToken("nsfw", idx);
    if (entry.sexual) addToken("sexual", idx);
    if (entry.religious) addToken("religious", idx);
    if (entry.family_related) addToken("family", idx);
  });

  // Convert sets to arrays for serialization
  Object.keys(index).forEach((k) => {
    index[k] = Array.from(index[k]);
  });

  return index;
}

// ── Extract metadata (unique languages, countries, categories) ──────
function extractMeta(entries) {
  const languages = new Set();
  const countries = new Set();
  const categories = new Set();
  const tones = new Set();

  entries.forEach((e) => {
    if (e.language) languages.add(e.language);
    if (e.country) countries.add(e.country);
    if (e.category) categories.add(e.category);
    if (e.tone) tones.add(e.tone);
  });

  return {
    languages: [...languages].sort(),
    countries: [...countries].sort(),
    categories: [...categories].sort(),
    tones: [...tones].sort(),
    totalEntries: entries.length,
  };
}

// ── Public getters (singleton, loads once) ───────────────────────────
export function getDatabase() {
  if (!_db) {
    console.log(`Loading dataset from ${DATA_PATH}`);
    _db = loadJSONL(DATA_PATH);
    console.log(`Loaded ${_db.length} entries`);
  }
  return _db;
}

export function getIndex() {
  if (!_index) {
    _index = buildIndex(getDatabase());
    console.log(`Index built with ${Object.keys(_index).length} tokens`);
  }
  return _index;
}

export function getMeta() {
  if (!_meta) {
    _meta = extractMeta(getDatabase());
  }
  return _meta;
}

// ── Hot reload: clear cache if file changes (dev mode) ──────────────
export function clearCache() {
  _db = null;
  _index = null;
  _meta = null;
}
