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

export function speakText(
  text: string,
  onEnd?: () => void,
  onError?: (err: any) => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('Trình duyệt không hỗ trợ tổng hợp giọng nói (Text-to-Speech)');
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any ongoing speech

    // Clean text from markdown bold/bullets for smoother speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/#/g, '')
      .replace(/•/g, '')
      .replace(/⚠️/g, 'Cảnh báo:')
      .replace(/👉/g, '')
      .replace(/🏥|🏛️|🛒|📄|🌟|📍|🕒|👤|📋|💬/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.toLowerCase().startsWith('vi'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    utterance.onend = () => onEnd?.();
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    console.error('TTS error:', e);
    onError?.(e);
    return false;
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
