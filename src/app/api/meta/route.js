import { NextResponse } from "next/server";
import { getMeta } from "@/lib/database";
import { getStats } from "@/lib/search";
import { isOllamaAvailable, isOllamaEnabled } from "@/lib/ollama";

export async function GET() {
  try {
    const meta = getMeta();
    const stats = getStats();
    const ollamaEnabled = isOllamaEnabled();
    const ollamaUp = ollamaEnabled ? await isOllamaAvailable() : false;

    return NextResponse.json({
      ...meta,
      ...stats,
      ollamaEnabled,
      ollamaAvailable: ollamaUp,
    });
  } catch (err) {
    console.error("Meta API error:", err);
    return NextResponse.json(
      { error: "Failed to load metadata", detail: err.message },
      { status: 500 }
    );
  }
}
