const LANGUAGE_VOICE_HINTS = {
  hindi: ["hi", "hi-in", "hindi"],
  spanish: ["es", "es-es", "es-mx", "spanish"],
  french: ["fr", "fr-fr", "french"],
  german: ["de", "de-de", "german"],
  italian: ["it", "it-it", "italian"],
  portuguese: ["pt", "pt-br", "portuguese"],
  japanese: ["ja", "ja-jp", "japanese"],
  korean: ["ko", "ko-kr", "korean"],
  chinese: ["zh", "cmn", "mandarin", "chinese"],
  mandarin: ["zh", "cmn", "mandarin"],
  russian: ["ru", "ru-ru", "russian"],
  arabic: ["ar", "ar-sa", "arabic"],
  tamil: ["ta", "ta-in", "tamil"],
  bengali: ["bn", "bn-in", "bengali"],
  punjabi: ["pa", "pa-in", "punjabi"],
  urdu: ["ur", "ur-pk", "urdu"],
  turkish: ["tr", "tr-tr", "turkish"],
  dutch: ["nl", "nl-nl", "dutch"],
  polish: ["pl", "pl-pl", "polish"],
  swedish: ["sv", "sv-se", "swedish"],
  finnish: ["fi", "fi-fi", "finnish"],
  english: ["en", "en-us", "en-gb", "english"],
};

let voicesCache = null;
let currentUtterance = null;

export function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) voicesCache = voices;
  return voicesCache || voices;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

function pickVoice(languageLabel) {
  const voices = loadVoices();
  if (!voices.length) return null;

  const langKey = (languageLabel || "")
    .toLowerCase()
    .split(/[\s\-–(,]+/)[0];

  const hints = [];
  Object.entries(LANGUAGE_VOICE_HINTS).forEach(([key, codes]) => {
    if ((languageLabel || "").toLowerCase().includes(key)) {
      hints.push(...codes);
    }
  });
  if (LANGUAGE_VOICE_HINTS[langKey]) {
    hints.push(...LANGUAGE_VOICE_HINTS[langKey]);
  }

  for (const hint of hints) {
    const match = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(hint) ||
        v.name.toLowerCase().includes(hint)
    );
    if (match) return match;
  }

  return voices.find((v) => v.lang.startsWith("en")) || voices[0];
}

export function speakGaali(entry, onStart, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return false;
  }

  window.speechSynthesis.cancel();

  const text =
    entry.transliteration && entry.transliteration !== entry.word
      ? `${entry.word}. ${entry.transliteration}`
      : entry.word;

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(entry.language);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.85;
  utterance.pitch = 1;

  utterance.onstart = () => onStart?.();
  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };
  utterance.onerror = () => {
    currentUtterance = null;
    onEnd?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking() {
  return (
    typeof window !== "undefined" &&
    window.speechSynthesis?.speaking
  );
}
