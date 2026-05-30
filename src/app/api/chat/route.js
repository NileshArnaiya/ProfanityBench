import { NextResponse } from "next/server";
import { search } from "@/lib/search";
import { personalizeResponse } from "@/lib/ollama";

export async function POST(request) {
  try {
    const { query, filters = {} } = await request.json();

    const hasQuery = typeof query === "string" && query.trim().length > 0;
    const hasFilters =
      filters.language ||
      filters.country ||
      filters.category ||
      filters.tone ||
      filters.sfwOnly ||
      filters.nsfwOnly ||
      (filters.minSeverity && Number(filters.minSeverity) > 1);

    if (!hasQuery && !hasFilters) {
      return NextResponse.json(
        { error: "Missing query or filters" },
        { status: 400 }
      );
    }

    // 1. Search the database
    const searchResults = search(hasQuery ? query.trim() : "", filters);

    // 2. Witty summary (template by default; Ollama only if USE_OLLAMA=true)
    const message = await personalizeResponse(
      hasQuery ? query.trim() : "",
      searchResults
    );

    // 3. Return response
    return NextResponse.json({
      message,
      results: searchResults.results.map((r) => ({
        id: r.id,
        word: r.word,
        transliteration: r.transliteration,
        literal_translation: r.literal_translation,
        actual_meaning: r.actual_meaning,
        language: r.language,
        country: r.country,
        region: r.region,
        category: r.category,
        severity: r.severity,
        target_type: r.target_type,
        tone: r.tone,
        example_sentence: r.example_sentence,
        safe_for_work: r.safe_for_work,
        sexual: r.sexual,
        religious: r.religious,
        family_related: r.family_related,
        etymology: r.etymology,
        popularity_score: r.popularity_score,
        generation: r.generation,
        notes: r.notes,
      })),
      total: searchResults.total,
      type: searchResults.type,
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err.message },
      { status: 500 }
    );
  }
}
