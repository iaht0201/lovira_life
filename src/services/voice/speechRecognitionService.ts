import { SpeechRecognitionEvents, VoiceErrorType } from './voiceTypes';

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private isSubmitted = false;
  private events: SpeechRecognitionEvents = {};

  // Audio Stream & VAD State
  private activeStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private animFrameId: number | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // VAD Timers & Thresholds
  private heardSpeech = false;
  private lastVoiceActivityAt = 0;
  private silenceTimer: any = null;
  private noSpeechTimer: any = null;

  private readonly SILENCE_MS = 1600; // 1.6 seconds silence after speech -> auto finalize
  private readonly NO_SPEECH_TIMEOUT_MS = 8000; // 8 seconds timeout if no speech detected at all
  private readonly SPEECH_THRESHOLD = 8; // Volume threshold percentage

  // Accumulated Transcripts
  private confirmedTranscript = '';
  private currentInterimTranscript = '';

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindowWithSpeech;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private clearNoSpeechTimer() {
    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer);
      this.noSpeechTimer = null;
    }
  }

  /**
   * Initialize shared microphone MediaStream for both Audio Analyser (VAD) and MediaRecorder
   */
  private async setupAudioStream(onVolumeChange?: (volume: number) => void): Promise<MediaStream | null> {
    this.cleanupAudioStream();
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.activeStream = stream;

      // 1. Audio Analyser for VAD
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        const source = this.audioCtx.createMediaStreamSource(stream);
        const analyser = this.audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!this.isListening) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const volumePercent = Math.min(100, Math.round((avg / 64) * 100));
          onVolumeChange?.(volumePercent);

          // Voice Activity Detection logic
          if (volumePercent >= this.SPEECH_THRESHOLD) {
            this.heardSpeech = true;
            this.lastVoiceActivityAt = Date.now();
            this.clearSilenceTimer();
            this.clearNoSpeechTimer();
          } else if (this.heardSpeech) {
            // User previously spoke and is now quiet
            if (!this.silenceTimer && !this.isSubmitted) {
              this.silenceTimer = setTimeout(() => {
                console.log('[VAD] 1.6s of silence detected after speech. Auto-finalizing transcript...');
                this.finishListening();
              }, this.SILENCE_MS);
            }
          }

          this.animFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      }

      // 2. MediaRecorder for Whisper AI Fallback (using same stream)
      this.audioChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(100);

      return stream;
    } catch (e) {
      console.warn('[SpeechRecognitionService] Audio stream setup failed:', e);
      return null;
    }
  }

  private cleanupAudioStream() {
    this.clearSilenceTimer();
    this.clearNoSpeechTimer();

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {
        // Ignore
      }
      this.mediaRecorder = null;
    }
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  public async stopMediaRecorderAndTranscribe(): Promise<string> {
    if (!this.mediaRecorder || this.audioChunks.length === 0) {
      return '';
    }
    return new Promise<string>((resolve) => {
      const recorder = this.mediaRecorder;
      if (!recorder) return resolve('');

      const timeout = setTimeout(() => {
        resolve('');
      }, 5000);

      recorder.onstop = async () => {
        clearTimeout(timeout);
        try {
          const audioBlob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
          if (audioBlob.size < 200) return resolve('');

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = (reader.result as string).split(',')[1];
            try {
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64data, mimeType: recorder.mimeType }),
              });
              if (res.ok) {
                const data = await res.json();
                console.log('[Whisper Fallback Result]:', data.text);
                resolve(data.text || '');
              } else {
                resolve('');
              }
            } catch (err) {
              console.warn('[Transcribe Fallback Error]:', err);
              resolve('');
            }
          };
        } catch (e) {
          resolve('');
        }
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          clearTimeout(timeout);
          resolve('');
        }
      } catch (e) {
        clearTimeout(timeout);
        resolve('');
      }
    });
  }

  private async submitFinal(text: string) {
    if (this.isSubmitted) return;
    this.isSubmitted = true;
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }

    let finalSpeechText = text;

    // Fallback to Whisper AI if Web Speech transcript was empty but audio/speech was detected
    if (!finalSpeechText.trim() && (this.heardSpeech || this.audioChunks.length > 0)) {
      console.log('[SpeechRecognition] Web Speech returned empty text. Running Whisper AI audio transcription...');
      finalSpeechText = await this.stopMediaRecorderAndTranscribe();
    }

    this.cleanupAudioStream();

    if (finalSpeechText.trim()) {
      console.log('[SpeechRecognition] Chốt transcript thành công:', finalSpeechText.trim());
      this.events.onFinalResult?.(finalSpeechText.trim());
    } else {
      this.events.onError?.(
        'no-speech',
        'Lovira chưa nghe thấy câu nói nào. Chú/bạn thử nói lại hoặc gõ tin nhắn cho Lovira nhé.'
      );
    }
  }

  public async ensureMicAccess(): Promise<{ ok: boolean; message?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { ok: true };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return { ok: true };
    } catch (err: any) {
      console.warn('[SpeechRecognitionService] getUserMedia mic check failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return {
          ok: false,
          message:
            'Quyền Micro đang bị chặn. Bạn vui lòng bật "Cho phép truy cập Micro" trong cài đặt trình duyệt nhé.',
        };
      }
      return {
        ok: false,
        message: `Không thể mở Micro (${err.name || err.message}).`,
      };
    }
  }

  private mapError(errCode: string): { type: VoiceErrorType; message: string } {
    switch (errCode) {
      case 'not-allowed':
      case 'permission-denied':
        return {
          type: 'not-allowed',
          message:
            'Lovira chưa được cấp quyền dùng micro. Chú/bạn vui lòng cấp quyền micro trên trình duyệt nhé.',
        };
      case 'no-speech':
        return {
          type: 'no-speech',
          message:
            'Lovira chưa nghe thấy câu nói nào. Chú/bạn thử nói lại hoặc gõ tin nhắn cho Lovira nhé.',
        };
      case 'audio-capture':
        return {
          type: 'audio-capture',
          message: 'Không tìm thấy thiết bị micro. Chú/bạn vui lòng kiểm tra lại thiết bị nhé.',
        };
      case 'network':
        return {
          type: 'network',
          message: 'Lỗi kết nối mạng khi nhận dạng giọng nói. Bạn thử lại nhé.',
        };
      case 'aborted':
        return {
          type: 'aborted',
          message: 'Đã dừng thu âm.',
        };
      default:
        return {
          type: 'unknown',
          message:
            'Lovira chưa nghe rõ. Chú/bạn vui lòng thử nói lại hoặc nhập câu hỏi bằng tin nhắn nhé!',
        };
    }
  }

  public startListening(events: SpeechRecognitionEvents): boolean {
    if (!this.isSupported()) {
      events.onError?.(
        'unsupported-browser',
        'Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Bạn có thể gõ tin nhắn cho Lovira nhé.'
      );
      return false;
    }

    // Clean up any ongoing session
    this.cancelListeningSilent();

    try {
      const win = window as IWindowWithSpeech;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'vi-VN';
      this.recognition.interimResults = true;
      this.recognition.continuous = true; // Use continuous mode to capture full sentences without auto-stopping early
      this.recognition.maxAlternatives = 1;

      this.events = events;
      this.isListening = true;
      this.isSubmitted = false;
      this.heardSpeech = false;
      this.lastVoiceActivityAt = 0;
      this.confirmedTranscript = '';
      this.currentInterimTranscript = '';

      let hasError = false;

      // 1. Setup shared Audio Stream (Audio Analyser + MediaRecorder)
      this.setupAudioStream((vol) => {
        this.events.onVolumeChange?.(vol);
      });

      // 2. Set 8s Timeout if no speech is heard at all
      this.noSpeechTimer = setTimeout(() => {
        if (this.isListening && !this.heardSpeech && !this.isSubmitted) {
          console.log('[VAD] No speech detected after 8 seconds. Stopping listening...');
          this.cancelListening();
          this.events.onError?.(
            'no-speech',
            'Lovira chưa nghe thấy câu nói nào. Chú/bạn thử nói lại hoặc gõ tin nhắn cho Lovira nhé.'
          );
        }
      }, this.NO_SPEECH_TIMEOUT_MS);

      this.recognition.onstart = () => {
        console.log('[SpeechRecognition] Microphone active! Listening for voice...');
        this.isListening = true;
        this.isSubmitted = false;
        this.events.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let newFinalText = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            newFinalText += (newFinalText ? ' ' : '') + text;
          } else {
            interimText += (interimText ? ' ' : '') + text;
          }
        }

        // Accumulate confirmed final packets so they are NOT lost or overwritten
        if (newFinalText.trim()) {
          if (this.confirmedTranscript) {
            this.confirmedTranscript += ' ' + newFinalText.trim();
          } else {
            this.confirmedTranscript = newFinalText.trim();
          }
        }

        this.currentInterimTranscript = interimText.trim();

        // Combine confirmed transcript + current interim transcript
        const combined = [this.confirmedTranscript, this.currentInterimTranscript]
          .filter(Boolean)
          .join(' ')
          .trim();

        if (combined) {
          this.heardSpeech = true;
          this.clearNoSpeechTimer();
          console.log('[SpeechRecognition] Realtime transcript:', combined);
          this.events.onInterimResult?.(combined);
        }

        // IMPORTANT: DO NOT call submitFinal() on isFinal!
        // Mobile Chrome marks intermediate clauses as isFinal prematurely.
        // We accumulate transcripts and rely solely on VAD 1.6s silence detection or manual submit.
      };

      this.recognition.onerror = (event: any) => {
        const error = event.error || 'unknown';
        if (error === 'aborted') {
          this.isListening = false;
          return;
        }

        console.warn('[SpeechRecognition] Error event:', error, event);
        hasError = true;
        const { type, message } = this.mapError(error);
        this.cleanupAudioStream();
        this.isListening = false;
        this.events.onError?.(type, message);
      };

      this.recognition.onend = () => {
        if (hasError || this.isSubmitted) return;

        const combinedText = [this.confirmedTranscript, this.currentInterimTranscript]
          .filter(Boolean)
          .join(' ')
          .trim();

        // If recognition ended naturally and user has spoken or transcript exists, finalize!
        if (this.isListening && (this.heardSpeech || combinedText)) {
          this.submitFinal(combinedText);
        } else if (this.isListening && !this.isSubmitted) {
          // Restart recognition silently if still within listening window and user hasn't spoken
          try {
            this.recognition.start();
          } catch (e) {
            this.cleanupAudioStream();
            this.isListening = false;
            this.events.onEnd?.();
          }
        }
      };

      this.recognition.start();
      return true;
    } catch (e: any) {
      console.warn('Failed to start SpeechRecognition:', e);
      events.onError?.('unknown', 'Không thể kích hoạt micro lúc này. Bạn thử gõ tin nhắn nhé!');
      return false;
    }
  }

  /**
   * Finish and submit current accumulated transcript immediately.
   */
  public async finishListening() {
    if (this.isSubmitted) return;
    const combinedText = [this.confirmedTranscript, this.currentInterimTranscript]
      .filter(Boolean)
      .join(' ')
      .trim();
    await this.submitFinal(combinedText);
  }

  public async stopListening() {
    await this.finishListening();
  }

  private cancelListeningSilent() {
    this.cleanupAudioStream();
    this.isListening = false;
    this.isSubmitted = true;
    if (this.recognition) {
      const oldInstance = this.recognition;
      this.recognition = null;
      try {
        oldInstance.onstart = null;
        oldInstance.onresult = null;
        oldInstance.onerror = null;
        oldInstance.onend = null;
        oldInstance.stop();
      } catch (e) {
        // Ignore
      }
    }
  }

  public cancelListening() {
    this.cleanupAudioStream();
    this.isListening = false;
    this.isSubmitted = true;
    this.confirmedTranscript = '';
    this.currentInterimTranscript = '';
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore
      }
    }
    this.events.onEnd?.();
  }

  public getCurrentTranscript(): string {
    return [this.confirmedTranscript, this.currentInterimTranscript].filter(Boolean).join(' ').trim();
  }
}

export const speechRecognitionService = new SpeechRecognitionService();

