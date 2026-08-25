export type EdgeTTSVoice = 'vi-VN-HoaiMyNeural' | 'vi-VN-NamMinhNeural';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  voice?: EdgeTTSVoice;
}

const STORAGE_KEY_VOICE = 'lovira_edge_tts_voice';

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

  const selectedVoice = options.voice || getTTSVoice();
  speakingActive = true;
  options.onStart?.();

  console.log(`[TTS] Requesting Edge-TTS for: "${cleanText.substring(0, 50)}..." (Voice: ${selectedVoice})`);

  // 1. Try Edge TTS API Endpoint first
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

      console.log(`[TTS] Edge-TTS audio received (${data.engine || 'EdgeTTS'}), playing audio...`);

      // Convert Base64 data URL to Blob for seamless browser audio playback
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
        console.log('[TTS] Audio playback completed.');
        speakingActive = false;
        activeAudio = null;
        if (activeBlobUrl) {
          URL.revokeObjectURL(activeBlobUrl);
          activeBlobUrl = null;
        }
        options.onEnd?.();
      };

      audio.onerror = (e) => {
        console.warn('[TTS] Audio Playback Error, falling back to WebSpeech:', e);
        speakingActive = false;
        activeAudio = null;
        if (activeBlobUrl) {
          URL.revokeObjectURL(activeBlobUrl);
          activeBlobUrl = null;
        }
        speakWebSpeechFallback(cleanText, options);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          console.warn('[TTS] Autoplay/Audio play error, falling back to WebSpeech:', playErr);
          speakWebSpeechFallback(cleanText, options);
        });
      }
    })
    .catch((err) => {
      console.warn('[TTS] Edge TTS Service Failure, falling back to WebSpeech:', err);
      speakWebSpeechFallback(cleanText, options);
    });

  return true;
}

function speakWebSpeechFallback(cleanText: string, options: SpeakOptions): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    speakingActive = false;
    options.onError?.('Trình duyệt không hỗ trợ đọc giọng nói');
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (viVoice) utterance.voice = viVoice;

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
      options.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    speakingActive = false;
    options.onError?.(e);
  }
}
