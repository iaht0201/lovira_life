import { SpeechRecognitionEvents, VoiceErrorType } from './voiceTypes';

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private isSubmitted = false;
  private silenceTimer: any = null;
  private currentTranscript = '';
  private events: SpeechRecognitionEvents = {};

  private activeStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private animFrameId: number | null = null;

  public async startAudioAnalyser(onVolumeChange?: (volume: number) => void) {
    this.stopAudioAnalyser();
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.activeStream = stream;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaStreamSource(stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const volumePercent = Math.min(100, Math.round((avg / 64) * 100));
        onVolumeChange?.(volumePercent);
        this.animFrameId = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (e) {
      console.warn('[SpeechRecognition] Audio analyser error:', e);
    }
  }

  public stopAudioAnalyser() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
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

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindowWithSpeech;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    // 1200ms silence after user stops speaking -> auto finalize
    this.silenceTimer = setTimeout(() => {
      if (this.isListening && !this.isSubmitted && this.currentTranscript.trim()) {
        this.submitFinal(this.currentTranscript.trim());
      }
    }, 1200);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  public async startMediaRecorder() {
    this.stopMediaRecorder();
    this.audioChunks = [];
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    } catch (e) {
      console.warn('[SpeechRecognitionService] MediaRecorder error:', e);
    }
  }

  public async stopMediaRecorderAndTranscribe(): Promise<string> {
    if (!this.mediaRecorder || this.audioChunks.length === 0) {
      this.stopMediaRecorder();
      return '';
    }
    return new Promise<string>((resolve) => {
      const recorder = this.mediaRecorder;
      if (!recorder) return resolve('');

      const timeout = setTimeout(() => {
        this.stopMediaRecorder();
        resolve('');
      }, 5000);

      recorder.onstop = async () => {
        clearTimeout(timeout);
        try {
          const audioBlob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
          this.stopMediaRecorder();

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

  public stopMediaRecorder() {
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // Ignore
      }
      this.mediaRecorder = null;
    }
    this.audioChunks = [];
  }

  private async submitFinal(text: string) {
    if (this.isSubmitted) return;
    this.isSubmitted = true;
    this.clearSilenceTimer();
    this.stopAudioAnalyser();
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }

    let finalSpeechText = text;
    if (!finalSpeechText.trim()) {
      console.log('[SpeechRecognition] Web Speech API returned empty text. Falling back to Whisper AI audio transcription...');
      finalSpeechText = await this.stopMediaRecorderAndTranscribe();
    } else {
      this.stopMediaRecorder();
    }

    if (finalSpeechText.trim()) {
      this.events.onFinalResult?.(finalSpeechText.trim());
    } else {
      this.events.onError?.('no-speech', 'Lovira chưa nghe thấy câu nói nào. Chú/bạn thử bấm "Thử lại bằng giọng nói" và nói to hơn chút nhé.');
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
          message: 'Quyền Micro đang bị chặn bởi Windows hoặc Trình duyệt. Bạn vui lòng bật "Cho phép ứng dụng truy cập Micro" trong Cài đặt Windows hoặc Cài đặt trình duyệt nhé.',
        };
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return {
          ok: false,
          message: 'Không tìm thấy thiết bị Micro nào kết nối với máy tính. Bạn vui lòng kiểm tra giắc cắm/kết nối Micro nhé.',
        };
      }
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        return {
          ok: false,
          message: 'Micro đang bị một ứng dụng khác (Zoom, Teams, Zalo, Discord, OBS...) chiếm giữ. Bạn thử tắt bớt app khác nhé.',
        };
      }
      return {
        ok: false,
        message: `Khôn thể mở Micro (${err.name || err.message}).`,
      };
    }
  }

  private mapError(errCode: string): { type: VoiceErrorType; message: string } {
    switch (errCode) {
      case 'not-allowed':
      case 'permission-denied':
        return {
          type: 'not-allowed',
          message: 'Lovira chưa được cấp quyền dùng micro. Chú/bạn vui lòng cấp quyền micro trên trình duyệt hoặc tiếp tục nhắn qua khung Chat nhé.',
        };
      case 'no-speech':
        return {
          type: 'no-speech',
          message: 'Lovira chưa nghe thấy câu nói nào. Chú/bạn thử bấm "Thử lại bằng giọng nói" và nói to hơn chút nhé.',
        };
      case 'audio-capture':
        return {
          type: 'audio-capture',
          message: 'Không tìm thấy thiết bị micro. Chú/bạn vui lòng kiểm tra micro của thiết bị.',
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
          message: 'Lovira chưa nghe rõ. Chú/bạn vui lòng bấm "Thử lại" hoặc nhập câu hỏi bằng tin nhắn nhé!',
        };
    }
  }

  public startListening(events: SpeechRecognitionEvents): boolean {
    if (!this.isSupported()) {
      events.onError?.(
        'unsupported-browser',
        'Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Bạn vẫn có thể dùng Chat để tương tác với Lovira nhé.'
      );
      return false;
    }

    // Clean up any ongoing recognition instance first
    this.cancelListeningSilent();

    try {
      const win = window as IWindowWithSpeech;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'vi-VN';
      this.recognition.interimResults = true;
      this.recognition.continuous = false;
      this.recognition.maxAlternatives = 1;

      this.events = events;
      this.isListening = true;
      this.isSubmitted = false;
      this.currentTranscript = '';
      let hasError = false;
      let restartCount = 0;

      // Ensure no getUserMedia stream holds exclusive hardware lock on microphone
      this.stopAudioAnalyser();

      this.recognition.onstart = () => {
        console.log('[SpeechRecognition] onstart fired - Microphone active!');
        this.isListening = true;
        this.isSubmitted = false;
        this.currentTranscript = '';
        restartCount = 0;
        this.clearSilenceTimer();
        this.events.onStart?.();
      };

      this.recognition.onspeechstart = () => {
        console.log('[SpeechRecognition] onspeechstart - Chrome detected speech sound!');
      };

      this.recognition.onsoundstart = () => {
        console.log('[SpeechRecognition] onsoundstart - Chrome detected audio sound!');
      };

      this.recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        const effectiveText = (finalText || interimText).trim();
        if (effectiveText) {
          console.log('[SpeechRecognition] Realtime transcript:', effectiveText);
          this.currentTranscript = effectiveText;
          this.events.onInterimResult?.(effectiveText);
        }

        // Reset silence timer on every speech packet
        this.resetSilenceTimer();

        // If browser marked this result as final, submit immediately
        if (finalText && finalText.trim().length > 0) {
          this.submitFinal(finalText.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        this.clearSilenceTimer();
        const error = event.error || 'unknown';
        
        // 'aborted' is defined by W3C Web Speech API spec as an intentional cancellation signal by browser/user.
        // Always ignore 'aborted' silently without logging or triggering error states.
        if (error === 'aborted') {
          this.isListening = false;
          return;
        }

        console.warn('[SpeechRecognition] Error event:', error, event);

        hasError = true;
        const { type, message } = this.mapError(error);
        this.isListening = false;
        this.events.onError?.(type, message);
      };

      this.recognition.onend = () => {
        this.clearSilenceTimer();

        if (hasError) {
          this.isListening = false;
          return;
        }

        // If recognition ended prematurely (silence timeout) before user spoke, auto-restart to keep mic open
        if (this.isListening && !this.isSubmitted && !this.currentTranscript.trim()) {
          restartCount++;
          if (restartCount <= 3) {
            try {
              this.recognition.start();
              return;
            } catch (e) {
              // Ignore restart error and fall through
            }
          }
        }

        const wasListening = this.isListening;
        this.isListening = false;

        // If there is pending transcript not yet submitted, submit it now
        if (wasListening && !this.isSubmitted && this.currentTranscript.trim()) {
          this.submitFinal(this.currentTranscript.trim());
        } else if (!this.isSubmitted) {
          this.events.onEnd?.();
        }
      };

      this.recognition.start();
      this.startMediaRecorder();
      return true;
    } catch (e: any) {
      console.warn('Failed to start SpeechRecognition:', e);
      events.onError?.('unknown', 'Không thể kích hoạt micro lúc này. Bạn thử gõ tin nhắn cho Lovira nhé!');
      return false;
    }
  }

  /**
   * Finish and submit current transcript immediately.
   */
  public async finishListening() {
    this.clearSilenceTimer();
    if (!this.isSubmitted) {
      await this.submitFinal(this.currentTranscript.trim());
    }
  }

  /**
   * Stop listening alias (safe completion).
   */
  public async stopListening() {
    await this.finishListening();
  }

  /**
   * Internal silent cancel without triggering callbacks
   */
  private cancelListeningSilent() {
    this.clearSilenceTimer();
    this.stopAudioAnalyser();
    this.stopMediaRecorder();
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

  /**
   * Cancel listening and discard any active transcript.
   */
  public cancelListening() {
    this.clearSilenceTimer();
    this.stopAudioAnalyser();
    this.stopMediaRecorder();
    this.isListening = false;
    this.isSubmitted = true;
    this.currentTranscript = '';
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
    return this.currentTranscript;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
