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

  // Nếu người dùng chọn giọng đọc thiết bị (Native WebSpeech)
  if (preferredEngine === 'native') {
    const hasViVoice = typeof window !== 'undefined' && 'speechSynthesis' in window &&
      window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith('vi'));

    // Nếu máy không có giọng tiếng Việt, tự động chuyển sang Edge Neural để không bị câm tiếng
    if (!hasViVoice) {
      console.log(`[TTS] Device lacks Vietnamese native voice, automatically routing to Edge-TTS Neural...`);
      return speakEdgeTTS(cleanText, options, () => speakWebSpeech(cleanText, options));
    }

    console.log(`[TTS] Prioritizing Device Native Voice for: "${cleanText.substring(0, 40)}..."`);
    return speakWebSpeech(cleanText, options, () => {
      console.warn('[TTS] WebSpeech fallback to Edge-TTS...');
      speakEdgeTTS(cleanText, options);
    });
  }

  // Mặc định: Ưu tiên Edge TTS Neural cực chuẩn (với WebSpeech fallback)
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

      console.log(`[TTS] Received audio from server (engine: ${data.engine || 'unknown'}), playing sound...`);
      
      const audio = new Audio(data.audioBase64);
      activeAudio = audio;

      audio.onplay = () => {
        console.log('[TTS] Audio playing successfully! 🔊');
      };

      audio.onended = () => {
        console.log('[TTS] Audio playback finished.');
        speakingActive = false;
        activeAudio = null;
        options.onEnd?.();
      };

      audio.onerror = (e) => {
        console.warn('[TTS Playback Error], falling back to WebSpeech:', e);
        speakingActive = false;
        activeAudio = null;
        if (onFallback) {
          onFallback();
        } else {
          options.onError?.(e);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          console.warn('[TTS Play Promise Rejected]:', playErr);
          if (onFallback) {
            onFallback();
          } else {
            options.onError?.(playErr);
          }
        });
      }
    })
    .catch((err) => {
      console.warn('[TTS Request Error], falling back to WebSpeech:', err);
      if (onFallback) {
        onFallback();
      } else {
        speakingActive = false;
        options.onError?.(err);
      }
    });

  return true;
}

