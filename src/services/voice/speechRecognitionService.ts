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

  private submitFinal(text: string) {
    if (this.isSubmitted) return;
    this.isSubmitted = true;
    this.clearSilenceTimer();
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }
    this.events.onFinalResult?.(text);
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
      this.recognition.continuous = true;
      this.recognition.maxAlternatives = 1;

      this.events = events;
      this.isListening = false;
      this.isSubmitted = false;
      this.currentTranscript = '';
      let hasError = false;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.isSubmitted = false;
        this.currentTranscript = '';
        this.clearSilenceTimer();
        this.events.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
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
        
        // If aborted intentionally by user or system, do nothing
        if (error === 'aborted') {
          this.isListening = false;
          return;
        }

        hasError = true;
        const { type, message } = this.mapError(error);
        this.isListening = false;
        this.events.onError?.(type, message);
      };

      this.recognition.onend = () => {
        this.clearSilenceTimer();
        const wasListening = this.isListening;
        this.isListening = false;

        if (hasError) {
          return;
        }

        // If there is pending transcript not yet submitted, submit it now
        if (wasListening && !this.isSubmitted && this.currentTranscript.trim()) {
          this.submitFinal(this.currentTranscript.trim());
        } else if (!this.isSubmitted) {
          this.events.onEnd?.();
        }
      };

      this.recognition.start();
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
  public finishListening() {
    this.clearSilenceTimer();
    if (!this.isSubmitted && this.currentTranscript.trim()) {
      this.submitFinal(this.currentTranscript.trim());
    } else {
      this.cancelListening();
    }
  }

  /**
   * Stop listening alias (safe completion).
   */
  public stopListening() {
    this.finishListening();
  }

  /**
   * Internal silent cancel without triggering callbacks
   */
  private cancelListeningSilent() {
    this.clearSilenceTimer();
    this.isListening = false;
    this.isSubmitted = true;
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // Ignore
      }
      this.recognition = null;
    }
  }

  /**
   * Cancel listening and discard any active transcript.
   */
  public cancelListening() {
    this.clearSilenceTimer();
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
