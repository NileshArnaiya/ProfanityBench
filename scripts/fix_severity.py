#!/usr/bin/env python3
"""
Recalibrate severity (and normalize tone) in ProfanityBench JSONL datasets.
Does NOT deduplicate or remove entries — only fixes ratings.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FILES = [
    ROOT / "data" / "dataset.jsonl",
    ROOT / "data" / "gaalis.jsonl",
]

# ── Rule 1: minimum severity 5 (substring match on word + transliteration) ──
SEV5_PHRASES = [
    "behenchod",
    "behanchod",
    "bhenchod",
    "be hanco",
    "madarchod",
    "maderchod",
    "madarchod",
    "bhosdike",
    "bhosdiwale",
    "bhosdi ke",
    "chutmarike",
    "chut marike",
    "laudebaaz",
    "laude baaz",
    "randi ke bacche",
    "randi ke bacch",
    "teri maa ki",
    "teri ma ki",
    "motherfucker",
    "mother fucker",
    "sister fucker",
    "sister-fucker",
    "fuck your mother",
    "fuck your sister",
    "fuck your daughter",
    "fuck your mom",
    "fick deine mutter",
    "nique ta mere",
    "nique ta mère",
    "nique ta maman",
    "filho da puta",
    "filha da puta",
    "hijo de puta",
    "hija de puta",
    "figlio di puttana",
    "figlia di puttana",
    "orospu cocugu",
    "orospu çocuğu",
    "ibn el sharmouta",
    "yob tvoyu mat",
    "ёб твою мать",
    "еб твою мать",
    "bokachoda",
    "banchod",
    "bhenchod",
    "behenchodi",
    "behanchodi",
    "behenchodu",
    "behanchodu",
    "behenchodiya",
    "behanchodiya",
    "behenchod ki",
    "behanchod ki",
]

# ── Rule 2: minimum severity 4 ──
SEV4_PHRASES = [
    "chutiya",
    "chutya",
    "chutiye",
    "randi",
    "gaand",
    "gaandu",
    "gandu",
    "lund",
    "lauda",
    "loda",
    "chut",
    "kutiya",
    "kutti",
    "harami",
    "haraami",
    "jhatu",
    "jhantu",
    "tatti",
    "bhosdi",
    "bhosad",
    "whore",
    "slut",
    "cunt",
    "putain",
    "puta",
    "puttana",
    "putana",
    "stronzo",
    "stronza",
    "cabron",
    "cabrona",
    "pendejo",
    "verga",
    "coño",
    "cono",
    "chinga",
    "caralho",
    "buceta",
    "fotze",
    "hurensohn",
    "wichser",
    "arschloch",
    "schlampe",
    "blyad",
    "blyat",
    "blyad'",
    "suka",
    "pizdec",
    "nahui",
    "nahuy",
    "orospu",
    "siktir",
    "thevidiya",
    "thevdiya",
    "punda",
    "punde",
    "otha",
    "sunni",
    "connard",
    "salope",
    "enculer",
    "minchia",
    "vaffanculo",
    "shibal",
    "씨발",
    "gaesaekki",
    "개새끼",
    "kisama",
    "temee",
    "sharmouta",
    "kuss um",
    "mudak",
    "debil",
]

# Short tokens: word-boundary match only
SEV4_WORDS_BOUNDARY = [
    "dick",
    "cock",
    "pussy",
    "bitch",
    "ass",
    "fuck",
    "fuk",
]

# ── Rule 3: meaning / category keywords ──
SEV5_MEANING_PATTERNS = [
    r"\bincest\b",
    r"\brape\b",
    r"sexual threat",
    r"fuck your mother",
    r"fuck your sister",
    r"fuck your daughter",
    r"fuck your mom",
    r"mother.?fucker",
    r"sister.?fucker",
    r"daughter.?fucker",
]

SEV4_MEANING_PATTERNS = [
    r"motherfucker",
    r"sister fucker",
    r"\bcunt\b",
    r"\bwhore\b",
    r"\bslut\b",
    r"son of a (?:bitch|whore)",
    r"daughter of a whore",
]

SEV4_CATEGORY_SUBSTRINGS = [
    "sexual_threat",
    "sexual threat",
    "incest_implication",
    "incest-implication",
    "incest implication",
    "fighting_word",
    "fighting word",
    "sexual_profanity",
    "sexual profanity",
    "cuckold-implication",
    "homophobic slur",
    "racial slur",
    "ethnic slur",
]

TONE_PRIORITY = [
    "vulgar",
    "aggressive",
    "harsh",
    "mocking",
    "sarcastic",
    "dismissive",
    "critical",
    "moderate",
    "playful",
    "humorous",
    "ironic",
    "affectionate",
    "mild",
    "neutral",
]


def load_jsonl(path: Path) -> list[dict]:
    entries = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"  skip malformed line {i} in {path.name}: {e}", file=sys.stderr)
    return entries


def save_jsonl(path: Path, entries: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def entry_text(entry: dict) -> str:
    parts = [
        entry.get("word") or "",
        entry.get("transliteration") or "",
        entry.get("literal_translation") or "",
        entry.get("actual_meaning") or "",
        entry.get("category") or "",
        entry.get("usage_context") or "",
        entry.get("notes") or "",
    ]
    return " ".join(parts).lower()


def normalize_tone(raw: str | None) -> str:
    if not raw:
        return raw or ""
    t = raw.lower().strip()
    for priority in TONE_PRIORITY:
        if priority in t:
            return priority
    # fallback: first segment before | or ,
    first = re.split(r"[|,]", t)[0].strip()
    return first or raw


def phrase_match(text: str, phrase: str) -> bool:
    return phrase.lower() in text


def boundary_match(text: str, word: str) -> bool:
    return re.search(rf"\b{re.escape(word)}\b", text, re.I) is not None


def compute_floor(entry: dict, text: str) -> tuple[int, bool]:
    """Return (minimum severity floor, whether word/phrase rule fired)."""
    floor = 1
    word_matched = False
    tone_raw = (entry.get("tone") or "").lower()

    # Rule 1
    for phrase in SEV5_PHRASES:
        if phrase_match(text, phrase):
            floor = max(floor, 5)
            word_matched = True

    # Rule 2
    for phrase in SEV4_PHRASES:
        if phrase_match(text, phrase):
            floor = max(floor, 4)
            word_matched = True

    for word in SEV4_WORDS_BOUNDARY:
        if boundary_match(text, word):
            # skip weak "ass" in non-insult contexts
            if word == "ass" and "asshole" not in text and "arse" not in text:
                if "butt" not in text and "backside" not in text and "idiot" not in text:
                    if "competence" in text or "lazy" in text:
                        continue
            floor = max(floor, 4)
            word_matched = True

    # hate speech slurs -> 5
    if entry.get("hate_speech"):
        slur_hints = ["nigger", "n-word", "kike", "spic", "chink", "faggot", "tranny"]
        if any(h in text for h in slur_hints):
            floor = max(floor, 5)
            word_matched = True
        else:
            floor = max(floor, 4)

    # Rule 3
    for pat in SEV5_MEANING_PATTERNS:
        if re.search(pat, text, re.I):
            floor = max(floor, 5)
            word_matched = True

    for pat in SEV4_MEANING_PATTERNS:
        if re.search(pat, text, re.I):
            floor = max(floor, 4)

    cat = (entry.get("category") or "").lower()
    for sub in SEV4_CATEGORY_SUBSTRINGS:
        if sub in cat:
            floor = max(floor, 4)

    # Rule 4 — tone floors (use raw tone before normalize for compound tones)
    if "vulgar" in tone_raw and ("aggressive" in tone_raw or "harsh" in tone_raw):
        floor = max(floor, 4)
    elif "vulgar" in tone_raw:
        floor = max(floor, 3)
    elif "aggressive" in tone_raw:
        floor = max(floor, 3)
    elif "harsh" in tone_raw:
        floor = max(floor, 3)

    # Rule 5 — flags
    if entry.get("sexual") and entry.get("family_related"):
        floor = max(floor, 4)
    elif entry.get("sexual"):
        floor = max(floor, 3)

    if entry.get("hate_speech"):
        floor = max(floor, 4)

    return floor, word_matched


def apply_mild_cap(entry: dict, severity: int, word_matched: bool, text: str) -> int:
    """Rule 6: cap mild/playful non-flagged entries at 2."""
    if word_matched:
        return severity

    tone_norm = normalize_tone(entry.get("tone"))
    if tone_norm not in ("mild", "playful"):
        return severity

    if entry.get("sexual") or entry.get("family_related") or entry.get("hate_speech"):
        return severity

    harsh_in_meaning = any(
        re.search(p, text, re.I)
        for p in SEV5_MEANING_PATTERNS + SEV4_MEANING_PATTERNS
    )
    if harsh_in_meaning:
        return severity

    for phrase in SEV5_PHRASES + SEV4_PHRASES:
        if phrase_match(text, phrase):
            return severity

    return min(severity, 2)


def fix_entry(entry: dict) -> tuple[dict, bool, bool]:
    """Returns (entry, severity_changed, tone_changed)."""
    old_sev = int(entry.get("severity") or 1)
    old_tone = entry.get("tone") or ""

    text = entry_text(entry)
    floor, word_matched = compute_floor(entry, text)

    new_sev = max(old_sev, floor)
    new_sev = max(1, min(5, new_sev))
    new_sev = apply_mild_cap(entry, new_sev, word_matched, text)

    # Prison/coded slang is not top-tier personal insults (e.g. andar = inside/jail)
    cat = (entry.get("category") or "").lower()
    if not word_matched and (
        "prison" in cat or "criminal slang" in cat
    ):
        new_sev = min(new_sev, 3)

    new_tone = normalize_tone(old_tone)

    entry["severity"] = new_sev
    entry["tone"] = new_tone

    sev_changed = new_sev != old_sev
    tone_changed = new_tone != old_tone
    return entry, sev_changed, tone_changed


def severity_distribution(entries: list[dict]) -> Counter:
    c = Counter()
    for e in entries:
        s = int(e.get("severity") or 0)
        if 1 <= s <= 5:
            c[s] += 1
    return c


def process_file(path: Path, dry_run: bool = False) -> dict:
    if not path.exists():
        print(f"  skip missing: {path}")
        return {}

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing {path} ...")
    entries = load_jsonl(path)
    before = severity_distribution(entries)

    sev_changes = tone_changes = 0
    for entry in entries:
        _, sc, tc = fix_entry(entry)
        if sc:
            sev_changes += 1
        if tc:
            tone_changes += 1

    after = severity_distribution(entries)

    print(f"  entries: {len(entries)}")
    print(f"  severity updated: {sev_changes}")
    print(f"  tone normalized: {tone_changes}")
    print("  severity distribution:")
    for s in range(1, 6):
        b, a = before.get(s, 0), after.get(s, 0)
        if b != a:
            print(f"    {s}/5: {b} -> {a} ({a-b:+d})")
        else:
            print(f"    {s}/5: {a}")

    if not dry_run:
        save_jsonl(path, entries)
        print(f"  wrote {path}")

    return {
        "path": str(path),
        "entries": len(entries),
        "sev_changes": sev_changes,
        "tone_changes": tone_changes,
        "before": dict(before),
        "after": dict(after),
    }


def spot_check(entries: list[dict], label: str) -> None:
    print(f"\n--- Spot check: {label} ---")
    checks = [
        ("behenchod", "behenchod"),
        ("behanchod", "behanchod"),
        ("madarchod", "madarchod"),
        ("chutiya", "chutiya"),
    ]
    for name, needle in checks:
        matches = [
            e
            for e in entries
            if needle in (e.get("transliteration") or "").lower()
            or needle in (e.get("word") or "").lower()
        ]
        if not matches:
            print(f"  {name}: no entries")
            continue
        sevs = [e["severity"] for e in matches]
        print(
            f"  {name}: {len(matches)} entries, "
            f"min={min(sevs)} max={max(sevs)} "
            f"dist={dict(sorted(Counter(sevs).items()))}"
        )

    vulgar_low = sum(
        1
        for e in entries
        if "vulgar" in (e.get("tone") or "").lower() and int(e.get("severity", 0)) < 3
    )
    vulgar_total = sum(1 for e in entries if "vulgar" in (e.get("tone") or "").lower())
    print(
        f"  tone=vulgar with sev<3: {vulgar_low}/{vulgar_total}"
    )


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    paths = DEFAULT_FILES
    for arg in sys.argv[1:]:
        if arg.startswith("--") and arg != "--dry-run":
            continue
        if not arg.startswith("-"):
            paths.append(Path(arg))

    results = []
    last_entries = []
    for path in paths:
        stats = process_file(path, dry_run=dry_run)
        if stats.get("entries"):
            last_entries = load_jsonl(path) if dry_run else load_jsonl(path)
            results.append(stats)

    if last_entries and paths:
        spot_check(last_entries, paths[0].name)

    print("\nDone.")


if __name__ == "__main__":
    main()
