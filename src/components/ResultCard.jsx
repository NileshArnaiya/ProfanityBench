"use client";

import { useState, useEffect } from "react";
import { speakGaali, stopSpeaking, loadVoices } from "@/lib/speech";

const SEVERITY_LABELS = ["", "Mild", "Light", "Moderate", "Strong", "Extreme"];
const SEVERITY_EMOJI = ["", "😌", "😏", "😤", "🔥", "💀"];

export default function ResultCard({ entry, index }) {
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadVoices();
    return () => {
      if (speaking) stopSpeaking();
    };
  }, [speaking]);

  const handleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    speakGaali(
      entry,
      () => setSpeaking(true),
      () => setSpeaking(false)
    );
  };

  const handleCopy = async () => {
    const text = [
      entry.word,
      entry.transliteration && `/${entry.transliteration}/`,
      entry.actual_meaning,
      `${entry.language} · severity ${entry.severity}/5`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const sev = entry.severity || 1;

  return (
    <div
      className="result-card animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="severity-flame-bar mb-3" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`severity-flame-segment ${i < sev ? "active" : ""}`}
            data-level={i + 1}
          />
        ))}
      </div>

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-white leading-tight break-words">
            {entry.word}
          </h3>
          {entry.transliteration && entry.transliteration !== entry.word && (
            <p className="text-sm text-gaali-muted font-mono mt-0.5">
              /{entry.transliteration}/
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSpeak}
            className={`speak-btn ${speaking ? "speaking" : ""}`}
            title="Hear pronunciation"
            aria-label="Pronounce"
          >
            {speaking ? (
              <span className="speak-wave">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="speak-btn"
            title="Copy to clipboard"
            aria-label="Copy"
          >
            {copied ? (
              <span className="text-[10px] text-green-400 font-bold">✓</span>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
          <span className={`tag severity-${sev} font-mono`}>
            {SEVERITY_EMOJI[sev]} {sev}/5
          </span>
        </div>
      </div>

      <p className="text-[10px] text-gaali-dim mb-2 uppercase tracking-wide">
        {SEVERITY_LABELS[sev]} · {entry.tone}
      </p>

      <p className="text-xs text-gaali-muted mb-1">
        Literal: &ldquo;{entry.literal_translation}&rdquo;
      </p>

      <p className="text-sm text-gaali-text leading-relaxed mb-3">
        {entry.actual_meaning}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="tag bg-[#1a1a2e] text-[#7b8cff]">
          {entry.language}
        </span>
        {entry.country && (
          <span className="tag bg-[#1e1a2e] text-[#b07bff]">
            {entry.country}
          </span>
        )}
        <span className="tag bg-[#2e1a1a] text-[#ff7b7b]">
          {entry.category?.replace(/_/g, " ")}
        </span>
        <span className="tag bg-[#1a2e1e] text-[#7bff8c]">{entry.tone}</span>
        {entry.safe_for_work ? (
          <span className="tag bg-[#1a2e2e] text-[#7bffe0]">SFW ✓</span>
        ) : (
          <span className="tag bg-[#2e1a1a] text-[#ff9b7b]">NSFW</span>
        )}
        {entry.sexual && (
          <span className="tag bg-[#2e1a2a] text-[#ff7bc4]">sexual</span>
        )}
        {entry.religious && (
          <span className="tag bg-[#2e2a1a] text-[#ffd77b]">religious</span>
        )}
        {entry.family_related && (
          <span className="tag bg-[#2a1a2e] text-[#c47bff]">family</span>
        )}
      </div>

      {entry.example_sentence &&
        !entry.example_sentence.includes("[redacted") && (
          <div className="bg-[#111] rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-gaali-muted mb-0.5">Example</p>
            <p className="text-sm text-gaali-text italic">
              &ldquo;{entry.example_sentence}&rdquo;
            </p>
          </div>
        )}

      {entry.etymology && (
        <p className="text-xs text-gaali-dim leading-relaxed">
          <span className="text-gaali-muted">Origin:</span> {entry.etymology}
        </p>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gaali-border">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gaali-dim">Popularity:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-2.5 rounded-sm"
                style={{
                  background:
                    i < entry.popularity_score
                      ? `hsl(${10 + i * 4}, 80%, 50%)`
                      : "#2a2a2a",
                }}
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-gaali-dim">
          {entry.generation === "all" ? "All ages" : entry.generation}
        </span>
      </div>
    </div>
  );
}
