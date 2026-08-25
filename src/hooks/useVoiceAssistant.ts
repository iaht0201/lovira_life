import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceInteractionState } from '../types';
import { speakText, stopSpeaking } from '../services/ttsService';

interface UseVoiceAssistantOptions {
  onSpeechResult?: (text: string) => void;
  speakResponse?: boolean;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const [voiceStatus, setVoiceStatus] = useState<VoiceInteractionState>('idle');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | undefined>(undefined);
  const [audioVolume, setAudioVolume] = useState<number>(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const recognitionRef = useRef<any>(null);
  const cancelledRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');
  const overrideHandlerRef = useRef<((transcript: string) => void) | undefined>(undefined);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      stopSpeaking();
    };
  }, []);

  // Acoustic Echo Cancellation: Safely speak text while muting mic
  const speakWithVoiceStatus = useCallback((text: string, onEndCallback?: () => void) => {
    // Stop any active recognition before speaking
    cancelledRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    stopSpeaking();

    setVoiceStatus('speaking');
    setInterimTranscript('');
    setAudioVolume(0);

    speakText(text, {
      onStart: () => {
        setVoiceStatus('speaking');
      },
      onEnd: () => {
        setVoiceStatus('idle');
        if (onEndCallback) onEndCallback();
      },
      onError: () => {
        setVoiceStatus('idle');
        if (onEndCallback) onEndCallback();
      },
    });
  }, []);

  const stopSpeakingAudio = useCallback(() => {
    stopSpeaking();
    setVoiceStatus('idle');
    setAudioVolume(0);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const cancelListening = useCallback(() => {
    cancelledRef.current = true;
    latestTranscriptRef.current = '';
    setInterimTranscript('');
    setAudioVolume(0);
    setVoiceStatus('idle');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    stopSpeaking();
  }, []);

  const startListening = useCallback((overrideOnFinalResult?: (transcript: string) => void) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus('error');
      setVoiceError('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn có thể gõ tin nhắn nhé.');
      return;
    }

    // Stop speaking if currently speaking
    stopSpeaking();

    // Abort existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    cancelledRef.current = false;
    latestTranscriptRef.current = '';
    overrideHandlerRef.current = overrideOnFinalResult;
    setInterimTranscript('');
    setVoiceError(undefined);
    setAudioVolume(0);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false; // Standard discrete turn-taking like lovira
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        if (cancelledRef.current) return;
        console.log('[Lovira Voice] Speech recognition started. Listening for speech...');
        setVoiceStatus('listening');
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        if (cancelledRef.current) return;
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript + ' ';
          } else {
            interimText += res[0].transcript;
          }
        }

        const combined = (finalText + interimText).trim();
        latestTranscriptRef.current = combined;
        setInterimTranscript(combined);
        console.log('[Lovira Voice] Recognized text:', combined);
      };

      recognition.onerror = (e: any) => {
        console.warn('[Lovira Voice Error]', e.error);

        if (cancelledRef.current || e.error === 'aborted') {
          return;
        }

        if (e.error === 'no-speech') {
          // If no speech detected in the turn, gently return to idle without loud error
          setVoiceStatus('idle');
          return;
        }

        setVoiceStatus('error');
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          setVoiceError('Quyền truy cập micro bị từ chối. Vui lòng cho phép quyền micro trong trình duyệt.');
        } else if (e.error === 'audio-capture') {
          setVoiceError('Không tìm thấy micro thu âm trên thiết bị.');
        } else if (e.error === 'network') {
          setVoiceError('Lỗi kết nối mạng khi nhận diện giọng nói.');
        } else {
          setVoiceError('Chưa nghe rõ giọng nói. Bạn hãy thử lại nhé.');
        }
      };

      recognition.onend = () => {
        console.log('[Lovira Voice] Speech recognition ended.');
        recognitionRef.current = null;

        if (cancelledRef.current) {
          return;
        }

        const capturedText = latestTranscriptRef.current.trim();
        if (capturedText && capturedText.length >= 1) {
          console.log('[Lovira Voice] Submitting captured text:', capturedText);
          setVoiceStatus('processing');
          setInterimTranscript('');

          const handler = overrideHandlerRef.current || optionsRef.current.onSpeechResult;
          if (handler) {
            handler(capturedText);
          }
        } else {
          setVoiceStatus('idle');
        }
      };

      recognition.start();
    } catch (err) {
      console.warn('[Lovira Voice Exception]', err);
      setVoiceStatus('idle');
    }
  }, []);

  return {
    voiceStatus,
    setVoiceStatus,
    interimTranscript,
    setInterimTranscript,
    audioVolume,
    voiceError,
    setVoiceError,
    speakWithVoiceStatus,
    stopSpeakingAudio,
    startListening,
    stopListening,
    cancelListening,
  };
}
