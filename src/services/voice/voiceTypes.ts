export type VoiceInteractionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export type VoiceErrorType =
  | 'not-allowed'
  | 'audio-capture'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'unsupported-browser'
  | 'unknown';

export interface VoiceRuntimeState {
  status: VoiceInteractionState;
  interimTranscript?: string;
  finalTranscript?: string;
  error?: string;
  errorType?: VoiceErrorType;
  startedAt?: number;
}

export interface SpeechRecognitionEvents {
  onStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (errorType: VoiceErrorType, message: string) => void;
  onEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
}
