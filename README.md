# ProfanityBench

**The world's spiciest open profanity benchmark — built to become the largest actively maintained multilingual dataset across languages, generations, and slang eras.**

The runnable chat app inside this repo is **[GaaliGPT](http://localhost:3000)** (the UI name). **ProfanityBench** is the project, dataset, and community around it.

Search 80,000+ curse words, insults, and slang from hundreds of languages and dialects. Chat-style UI, instant search from your JSONL dataset, optional local LLM summaries via Ollama.

> **This project is not perfect — but it's already great.** Severity ratings, dialect labels, and cultural nuance will always need human eyes. That's why we want *you* to contribute, verify, and argue about the data. That's the point.

---

## Branding

| Where | Name |
|-------|------|
| **Repo, README, PRs, community** | **ProfanityBench** |
| **App UI** (header, chat, assistant persona) | **GaaliGPT** |

Same project — ProfanityBench is the benchmark and dataset; GaaliGPT is what users see when they run the app.

---

## What we're building

ProfanityBench is more than a demo app. The goal is an **open, community-verified profanity corpus** that stays alive for years:

- New slang, old slang, Gen Z, boomer, regional dialects, diaspora mixes
- Honest severity (1–5) that reflects real-world offensiveness, not random labels
- Search that respects language families (`Italian` → all `Italian - *` dialects; `Hindi` without Hinglish noise)
- Pronunciation on every card (browser TTS today; better models welcome)

**We want this to be the largest actively maintained profanity resource people actually trust.**

---

## Quick start

```bash
git clone <your-repo-url>
cd profanitybench
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Dataset

Point `GAALI_DATA_PATH` in `.env` to your JSONL file (default: `./data/gaalis.jsonl`). We also ship `data/dataset.jsonl` (~82k entries). One JSON object per line.

### Ollama (optional)

The app runs **without any LLM** by default (`USE_OLLAMA=false`). Search and result cards work fully offline.

To enable AI-written summaries:

```bash
ollama pull llama3.2:1b
# In .env:
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2:1b
```

Try different models (`phi3:mini`, `gemma2:2b`, etc.) and open a PR with what worked best for your language.

---

## Using the app

| Feature | How |
|--------|-----|
| **Chat** | Ask naturally: *"severity 5 Hindi insults NSFW"*, *"highest in Italian"*, *"how do you say idiot in Spanish"* |
| **Filters** | Searchable language / country / category fields — type to find values in long lists |
| **Severity** | Slider defaults to **5/5 (maximum)** — lower it for milder browsing |
| **Pronounce** | Tap the speaker icon on any result card |
| **Browse** | Set filters only, then use *Browse with your filters* |

Sidebar filters stack with your query. Language filters use smart matching: picking **Italian** includes `Italian - Standard`, `Italian - Romanesco`, etc.

---

## Contributing — we need you

**The dataset is the product.** The app is the engine. We need help to:

1. **Verify entries** — Is the severity right? Is the meaning accurate? Is the example real?
2. **Fix severity** — Run or improve [`scripts/fix_severity.py`](scripts/fix_severity.py), or hand-edit JSONL. **You are encouraged to change severity** when you know the culture better than a script.
3. **Add missing gaalis** — Regional variants, new internet slang, older generational terms.
4. **Remove or flag bad rows** — Duplicates across dialects are OK; wrong or fake entries are not.
5. **Improve search** — [`src/lib/search.js`](src/lib/search.js): language families, insult relevance ranking, semantic filters.

### How to contribute

1. Fork the repo
2. Edit `data/gaalis.jsonl` and/or `data/dataset.jsonl` (or submit a patch file)
3. Run `python3 scripts/fix_severity.py` if you bulk-change severity
4. Test locally: `npm run dev`
5. Open a **Pull Request** with:
   - What you changed (language/region/count)
   - Why (sources, native speaker, context)
   - How you tested (example queries)

**Meaningful PRs that get merged** — corrections, new languages, severity overhauls, search fixes — **may receive a ProfanityBench T-shirt.** We'll contact you using your GitHub profile.

No PR is too small: one language, one category, ten fixed severities.

---

## Data schema

Each line in the JSONL is one entry:

| Field | Description |
|-------|-------------|
| `id` | Unique ID, e.g. `HI-0000043` |
| `language` | e.g. `Hindi`, `Italian - Romanesco` |
| `country`, `region` | Geographic context |
| `word`, `transliteration` | Term + romanization |
| `literal_translation`, `actual_meaning` | Meaning layers |
| `category`, `tone` | insult type, mild/harsh/vulgar/etc. |
| `severity` | **1–5** (1 = mildest, 5 = nuclear) |
| `safe_for_work`, `sexual`, `religious`, `family_related`, `hate_speech` | Flags |
| `example_sentence`, `etymology`, `notes` | Extra context |
| `popularity_score` | 1–10 for ranking |
| `generation` | `all`, `Gen Z`, `boomer`, etc. |

Example:

```json
{
  "id": "HI-0034003",
  "language": "Hindi",
  "country": "India",
  "word": "बहनचोद",
  "transliteration": "behanchod",
  "literal_translation": "sister-fucker",
  "actual_meaning": "extremely offensive insult",
  "category": "sister-insult",
  "severity": 5,
  "tone": "vulgar",
  "safe_for_work": false,
  "popularity_score": 9,
  "generation": "all"
}
```

---

## Project structure

```
profanitybench/
├── data/
│   ├── gaalis.jsonl          # default dataset (~79k)
│   └── dataset.jsonl         # extended copy (~82k)
├── scripts/
│   └── fix_severity.py       # bulk severity recalibration
├── src/
│   ├── app/api/chat/         # search + response
│   ├── app/api/meta/         # filter options + stats
│   ├── components/
│   │   ├── ChatInterface.jsx
│   │   ├── FilterPanel.jsx
│   │   ├── SearchableSelect.jsx
│   │   └── ResultCard.jsx
│   └── lib/
│       ├── database.js       # JSONL loader + index
│       ├── search.js           # query parser + ranking
│       ├── ollama.js           # optional LLM summaries
│       └── filterDefaults.js
├── .env.example
└── package.json
```

---

## Search & filters (for developers)

- **Strict Hindi** — `language === "Hindi"` only (excludes *Internet Hindi/Hinglish*, etc.)
- **Language families** — Query or filter `Italian` matches all `Italian - *` dialect labels
- **Insult-aware ranking** — Queries mentioning insults/gaalis boost real slurs over prison slang, drug terms, etc.
- **Severity floors** — Query phrases like `5/5`, `highest`, `NSFW` adjust filters automatically
- **Default filter severity** — UI starts at **5/5**

Improvements welcome: fuzzy matching, contributor-reviewed severity per region, generation/year tags.

---

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `GAALI_DATA_PATH` | `./data/gaalis.jsonl` | Path to JSONL |
| `USE_OLLAMA` | `false` | Set `true` for LLM summaries |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API |
| `OLLAMA_MODEL` | `llama3.2:1b` | Model name |
| `OLLAMA_TIMEOUT_MS` | `12000` | Request timeout |

---

## Scripts

```bash
# Recalibrate severity from rules (tone, category, known words)
python3 scripts/fix_severity.py

# Preview without writing
python3 scripts/fix_severity.py --dry-run
```

---

## Roadmap (community-driven)

- [ ] Per-language maintainer teams
- [ ] PR review rubric for severity
- [ ] Better TTS / voice models per language
- [ ] Generation & year metadata (`2020s`, `Gen Alpha`)
- [ ] SQLite / FTS for 500k+ entries
- [ ] Public API for researchers and comedy writers alike

---

## License & ethics

This is a **linguistic reference and cultural documentation** project. Use responsibly. Hate speech entries exist in the corpus for accuracy; they are flagged in data. Do not use this to harass people.

Your dataset, your community. **Raise PRs. Fix the severity. Claim your shirt.** 🌶️
