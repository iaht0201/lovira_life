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
  const [audioVolume, setAudioVolume] = useState<number>(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Acoustic Echo Cancellation: Safely speak text while muting mic
  const speakWithVoiceStatus = useCallback((text: string, onEndCallback?: () => void) => {
    // Stop any active speech recognition to avoid acoustic loop (AI listening to itself)
    speechRecognitionService.cancelListening();
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

  const startListening = useCallback((overrideOnFinalResult?: (transcript: string) => void) => {
    // 1. Immediately pop up Voice Assistant Overlay UI synchronously on click
    stopSpeaking();
    setVoiceError(undefined);
    setInterimTranscript('');
    setAudioVolume(0);
    setVoiceStatus('listening');
    sfx.playMicStart();

    // 2. Start Speech Recognition
    const started = speechRecognitionService.startListening({
      onStart: () => {
        setVoiceStatus('listening');
        setInterimTranscript('');
      },
      onVolumeChange: (vol) => {
        setAudioVolume(vol);
      },
      onInterimResult: (transcript) => {
        setInterimTranscript(transcript);
      },
      onFinalResult: (transcript) => {
        setInterimTranscript('');
        setAudioVolume(0);
        if (transcript.trim()) {
          sfx.playSuccess();
          setVoiceStatus('processing');
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
        setAudioVolume(0);
      },
      onEnd: () => {
        // DO NOT mutate voiceStatus here!
        // SpeechRecognition.onend only means the native microphone hardware finished recording.
        // It must NOT override 'processing' or 'speaking' states driven by the Voice Orchestrator.
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
