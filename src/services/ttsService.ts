export type EdgeTTSVoice = 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural';
export type TTSEnginePreference = 'native' | 'edge';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  voice?: EdgeTTSVoice;
  preferEngine?: TTSEnginePreference;
}

const STORAGE_KEY_VOICE = 'lovira_edge_tts_voice';
const STORAGE_KEY_ENGINE = 'lovira_tts_engine_preference';

/**
 * Mặc định ưu tiên giọng đọc nội bộ máy (Web Speech API / Trợ năng thiết bị).
 */
export function getTTSEnginePreference(): TTSEnginePreference {
  if (typeof window === 'undefined') return 'native';
  const saved = localStorage.getItem(STORAGE_KEY_ENGINE);
  if (saved === 'edge') return 'edge';
  return 'native'; // Mặc định là 'native' (giọng đọc máy)
}

export function setTTSEnginePreference(engine: TTSEnginePreference): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ENGINE, engine);
}

export function getTTSVoice(): EdgeTTSVoice {
  if (typeof window === 'undefined') return 'vi-VN-HoaiMyNeural';
  const saved = localStorage.getItem(STORAGE_KEY_VOICE);
  if (saved === 'vi-VN-NamMinhNeural') return 'vi-VN-NamMinhNeural';
  return 'vi-VN-HoaiMyNeural';
}

export function setTTSVoice(voice: EdgeTTSVoice): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VOICE, voice);
}

export function getAvailableVoices(): Array<{ id: EdgeTTSVoice; name: string; gender: string; desc: string }> {
  return [
    {
      id: 'vi-VN-HoaiMyNeural',
      name: 'Hoài My (Microsoft Edge Neural)',
      gender: 'Nữ',
      desc: 'Giọng đọc nữ nhẹ nhàng, truyền cảm và tự nhiên',
    },
    {
      id: 'vi-VN-NamMinhNeural',
      name: 'Nam Minh (Microsoft Edge Neural)',
      gender: 'Nam',
      desc: 'Giọng đọc nam ấm áp, rõ ràng và chuẩn xác',
    },
  ];
}

export function checkVietnameseVoiceSupport(): 'available' | 'unavailable' | 'pending' {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    const hasVi = voices.some((v) => v.lang.toLowerCase().startsWith('vi'));
    if (hasVi) return 'available';
  }
  return 'available';
}

let activeAudio: HTMLAudioElement | null = null;
let activeBlobUrl: string | null = null;
let speakingActive = false;

export function isSpeaking(): boolean {
  if (speakingActive) return true;
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

export function stopSpeaking(): void {
  speakingActive = false;

  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = '';
    } catch {
      // ignore
    }
    activeAudio = null;
  }

  if (activeBlobUrl) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch {
      // ignore
    }
    activeBlobUrl = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function speakText(
  text: string,
  optionsOrOnEnd?: SpeakOptions | (() => void),
  legacyOnError?: (err: any) => void
): boolean {
  stopSpeaking();

  const options: SpeakOptions =
    typeof optionsOrOnEnd === 'function'
      ? { onEnd: optionsOrOnEnd, onError: legacyOnError }
      : optionsOrOnEnd || {};

  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/#/g, '')
    .replace(/•/g, '')
    .replace(/⚠️/g, 'Cảnh báo:')
    .replace(/👉/g, '')
    .replace(/🏥|🏛️|🛒|📄|🌟|📍|🕒|👤|📋|💬|🎙️|🎙|✅|❌|❤️|🔔|💡/g, '')
    .trim();

  if (!cleanText) {
    options.onEnd?.();
    return true;
  }

  const preferredEngine = options.preferEngine || getTTSEnginePreference();

  // 1. Nếu ưu tiên giọng đọc máy (Mặc định)
  if (preferredEngine === 'native') {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      console.log(`[TTS] Prioritizing Device Native Voice for: "${cleanText.substring(0, 40)}..."`);
      return speakWebSpeech(cleanText, options, () => {
        console.warn('[TTS] WebSpeech fallback to Edge-TTS...');
        speakEdgeTTS(cleanText, options);
      });
    } else {
      // Thiết bị không hỗ trợ WebSpeech -> chuyển sang Edge-TTS
      console.log(`[TTS] Device has no SpeechSynthesis, falling back to Edge-TTS...`);
      return speakEdgeTTS(cleanText, options);
    }
  }

  // 2. Nếu ưu tiên Edge TTS Neural
  return speakEdgeTTS(cleanText, options, () => {
    console.warn('[TTS] Edge-TTS failed, falling back to Native WebSpeech...');
    speakWebSpeech(cleanText, options);
  });
}

function speakWebSpeech(
  cleanText: string,
  options: SpeakOptions,
  onFallback?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onFallback) {
      onFallback();
      return true;
    }
    speakingActive = false;
    options.onError?.('Trình duyệt không hỗ trợ đọc giọng nói');
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    let started = false;

    utterance.onstart = () => {
      started = true;
      speakingActive = true;
      options.onStart?.();
    };

    utterance.onend = () => {
      speakingActive = false;
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      speakingActive = false;
      if (!started && onFallback) {
        onFallback();
        return;
      }
      options.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    speakingActive = false;
    if (onFallback) {
      onFallback();
      return true;
    }
    options.onError?.(e);
    return false;
  }
}

function speakEdgeTTS(
  cleanText: string,
  options: SpeakOptions,
  onFallback?: () => void
): boolean {
  const selectedVoice = options.voice || getTTSVoice();
  speakingActive = true;
  options.onStart?.();

  console.log(`[TTS] Requesting Edge-TTS: "${cleanText.substring(0, 40)}..." (Voice: ${selectedVoice})`);

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: cleanText,
      voice: selectedVoice,
      format: 'base64',
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Edge TTS HTTP error: ${res.status}`);
      return res.json();
    })
    .then((data: { audioBase64?: string; voice?: string; engine?: string }) => {
      if (!data.audioBase64) throw new Error('Missing audioBase64 from Edge TTS response');

      const base64Data = data.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const blobUrl = URL.createObjectURL(audioBlob);
      activeBlobUrl = blobUrl;

      const audio = new Audio(blobUrl);
      activeAudio = audio;

      audio.onended = () => {
        speakingActive = false;
        activeAudio = null;
        if (activeBlobUrl) {
          URL.revokeObjectURL(activeBlobUrl);
          activeBlobUrl = null;
        }
        options.onEnd?.();
      };

      audio.onerror = (e) => {
        speakingActive = false;
        activeAudio = null;
        if (activeBlobUrl) {
          URL.revokeObjectURL(activeBlobUrl);
          activeBlobUrl = null;
        }
        if (onFallback) {
          onFallback();
        } else {
          options.onError?.(e);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          if (onFallback) {
            onFallback();
          } else {
            options.onError?.(playErr);
          }
        });
      }
    })
    .catch((err) => {
      if (onFallback) {
        onFallback();
      } else {
        speakingActive = false;
        options.onError?.(err);
      }
    });

  return true;
}

