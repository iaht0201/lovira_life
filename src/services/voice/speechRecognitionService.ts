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

  constructor() {
    this.initRecognition();
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindowWithSpeech;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private initRecognition() {
    if (!this.isSupported()) return;

    try {
      const win = window as IWindowWithSpeech;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'vi-VN';
      this.recognition.interimResults = true;
      this.recognition.continuous = false;
      this.recognition.maxAlternatives = 1;

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
        const { type, message } = this.mapError(error);
        
        // If aborted intentionally by user or system, don't trigger intrusive error
        if (error === 'aborted') {
          this.isListening = false;
          this.events.onEnd?.();
          return;
        }

        this.isListening = false;
        this.events.onError?.(type, message);
      };

      this.recognition.onend = () => {
        this.clearSilenceTimer();
        const wasListening = this.isListening;
        this.isListening = false;

        // If there is pending transcript not yet submitted, submit it now
        if (wasListening && !this.isSubmitted && this.currentTranscript.trim()) {
          this.submitFinal(this.currentTranscript.trim());
        } else {
          this.events.onEnd?.();
        }
      };
    } catch (e) {
      console.warn('Failed to initialize SpeechRecognition:', e);
      this.recognition = null;
    }
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    // 900ms silence after user stops speaking -> auto finalize
    this.silenceTimer = setTimeout(() => {
      if (this.isListening && !this.isSubmitted && this.currentTranscript.trim()) {
        this.submitFinal(this.currentTranscript.trim());
      }
    }, 900);
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
    this.stopListening();
    this.events.onFinalResult?.(text);
  }

  private mapError(errCode: string): { type: VoiceErrorType; message: string } {
    switch (errCode) {
      case 'not-allowed':
      case 'permission-denied':
        return {
          type: 'not-allowed',
          message: 'Lovira chưa được cấp quyền dùng micro. Bạn có thể cấp quyền micro trong trình duyệt hoặc tiếp tục nhập bằng bàn phím.',
        };
      case 'no-speech':
        return {
          type: 'no-speech',
          message: 'Lovira chưa nghe thấy nội dung. Bạn thử bấm và nói lại nhé.',
        };
      case 'audio-capture':
        return {
          type: 'audio-capture',
          message: 'Không tìm thấy thiết bị micro. Bạn vui lòng kiểm tra micro của thiết bị.',
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
          message: 'Chưa nhận dạng được giọng nói. Bạn thử lại hoặc nhập câu hỏi bằng bàn phím nhé!',
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

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      events.onError?.('unknown', 'Không thể khởi động dịch vụ giọng nói.');
      return false;
    }

    try {
      this.events = events;
      this.isSubmitted = false;
      this.currentTranscript = '';
      this.recognition.start();
      return true;
    } catch (e: any) {
      // If already started, stop and restart
      try {
        this.recognition.stop();
        this.recognition.start();
        return true;
      } catch (err) {
        console.warn('SpeechRecognition start failed:', err);
        events.onError?.('unknown', 'Không thể bật micro lúc này. Bạn thử lại nhé!');
        return false;
      }
    }
  }

  public stopListening() {
    this.clearSilenceTimer();
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors on stopping
      }
    }
  }

  public abortListening() {
    this.clearSilenceTimer();
    this.isListening = false;
    this.isSubmitted = true;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore
      }
    }
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
