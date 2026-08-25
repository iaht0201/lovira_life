import { useState, useCallback, useRef } from 'react';
import { VoiceInteractionState } from '../types';
import { speechRecognitionService } from '../services/voice/speechRecognitionService';
import { speakText, stopSpeaking } from '../services/ttsService';
import { sfx } from '../utils/sfx';

interface UseVoiceAssistantOptions {
  onSpeechResult?: (text: string) => void;
  speakResponse?: boolean;
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const [voiceStatus, setVoiceStatus] = useState<VoiceInteractionState>('idle');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | undefined>(undefined);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Acoustic Echo Cancellation: Safely speak text while muting mic
  const speakWithVoiceStatus = useCallback((text: string, onEndCallback?: () => void) => {
    // Stop any active speech recognition to avoid acoustic loop (AI listening to itself)
    speechRecognitionService.cancelListening();
    stopSpeaking();

    setVoiceStatus('speaking');
    setInterimTranscript('');

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
  }, []);

  const startListening = useCallback((overrideOnFinalResult?: (transcript: string) => void) => {
    // Play electronic mic start beep
    sfx.playMicStart();

    // Ensure TTS audio is silenced immediately when mic turns on
    stopSpeaking();
    setVoiceError(undefined);
    setInterimTranscript('');
    setVoiceStatus('listening');

    const started = speechRecognitionService.startListening({
      onStart: () => {
        setVoiceStatus('listening');
        setInterimTranscript('');
      },
      onInterimResult: (transcript) => {
        setInterimTranscript(transcript);
      },
      onFinalResult: (transcript) => {
        setInterimTranscript('');
        if (transcript.trim()) {
          sfx.playSuccess();
          const handler = overrideOnFinalResult || optionsRef.current.onSpeechResult;
          if (handler) {
            handler(transcript.trim());
          }
        } else {
          sfx.playMicStop();
          setVoiceStatus('idle');
        }
      },
      onError: (_errType, message) => {
        sfx.playMicStop();
        setVoiceStatus('error');
        setVoiceError(message);
        setInterimTranscript('');
      },
      onEnd: () => {
        setVoiceStatus((prev) => {
          if (prev === 'listening') {
            sfx.playMicStop();
            return 'idle';
          }
          return prev;
        });
      },
    });

    if (!started) {
      sfx.playMicStop();
      setVoiceStatus('error');
      setVoiceError('Trình duyệt chưa hỗ trợ nhận diện giọng nói hoặc micro chưa mở. Chú có thể gõ bằng tin nhắn nhé.');
    }
  }, []);

  const stopListening = useCallback(() => {
    sfx.playMicStop();
    speechRecognitionService.finishListening();
  }, []);

  const cancelListening = useCallback(() => {
    sfx.playMicStop();
    speechRecognitionService.cancelListening();
    setVoiceStatus('idle');
    setInterimTranscript('');
  }, []);

  return {
    voiceStatus,
    setVoiceStatus,
    interimTranscript,
    setInterimTranscript,
    voiceError,
    setVoiceError,
    speakWithVoiceStatus,
    stopSpeakingAudio,
    startListening,
    stopListening,
    cancelListening,
  };
}
