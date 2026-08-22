export function checkVietnameseVoiceSupport(): 'available' | 'unavailable' | 'pending' {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return 'unavailable';
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    return 'pending'; // Voices may load asynchronously
  }

  const hasViVoice = voices.some(v => v.lang.toLowerCase().startsWith('vi'));
  return hasViVoice ? 'available' : 'unavailable';
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

let speakingActive = false;

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  return speakingActive || window.speechSynthesis.speaking;
}

export function speakText(
  text: string,
  optionsOrOnEnd?: SpeakOptions | (() => void),
  legacyOnError?: (err: any) => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    const errorCb = typeof optionsOrOnEnd === 'object' ? optionsOrOnEnd?.onError : legacyOnError;
    errorCb?.('Trình duyệt không hỗ trợ tổng hợp giọng nói (Text-to-Speech)');
    return false;
  }

  const options: SpeakOptions =
    typeof optionsOrOnEnd === 'function'
      ? { onEnd: optionsOrOnEnd, onError: legacyOnError }
      : optionsOrOnEnd || {};

  try {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    speakingActive = false;

    // Clean text from markdown bold/bullets for smoother speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/#/g, '')
      .replace(/•/g, '')
      .replace(/⚠️/g, 'Cảnh báo:')
      .replace(/👉/g, '')
      .replace(/🏥|🏛️|🛒|📄|🌟|📍|🕒|👤|📋|💬|🎙️|🎙/g, '')
      .trim();

    if (!cleanText) {
      options.onEnd?.();
      return true;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    utterance.onstart = () => {
      speakingActive = true;
      options.onStart?.();
    };

    utterance.onend = () => {
      speakingActive = false;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      speakingActive = false;
      console.warn('Speech synthesis error:', e);
      options.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    speakingActive = false;
    console.error('TTS error:', e);
    options.onError?.(e);
    return false;
  }
}

export function stopSpeaking(): void {
  speakingActive = false;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
