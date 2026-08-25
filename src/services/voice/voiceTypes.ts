export type VoiceErrorType =
  | 'not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'aborted'
  | 'unsupported-browser'
  | 'unknown';

export interface SpeechRecognitionEvents {
  onStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (errorType: VoiceErrorType, message: string) => void;
  onEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
}

export type VoiceInteractionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
