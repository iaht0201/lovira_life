import { SpeechRecognitionEvents, VoiceErrorType } from './voiceTypes.js';

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private isSubmitted = false;
  private isCancelled = false;
  private events: SpeechRecognitionEvents = {};

  // Transcripts
  private latestTranscript = '';
  private confirmedTranscript = '';
  private interimTranscript = '';

  // Silence & Timeout Timers
  private silenceTimer: any = null;
  private sessionTimeoutTimer: any = null;
  private inactivityTimeoutTimer: any = null;
  private restartTimer: any = null;
  private hasHeardSpeech = false;

  // Loop & restart protection
  private consecutiveRapidEnds = 0;
  private restartCount = 0;
  private lastStartTime = 0;
  private readonly MAX_CONSECUTIVE_RESTARTS = 15; // Allow smooth continuous waiting up to 60s

  private readonly SILENCE_COMMIT_MS = 2000; // 2.0s of silence after speaking -> auto-commit
  private readonly MAX_SESSION_MS = 30000; // 30s max continuous speaking window
  private readonly INACTIVITY_TIMEOUT_MS = 60000; // 60s (1 phút) không phản hồi -> kết thúc và báo lại

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as IWindowWithSpeech;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private clearTimers() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }
    if (this.inactivityTimeoutTimer) {
      clearTimeout(this.inactivityTimeoutTimer);
      this.inactivityTimeoutTimer = null;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
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
            'Lovira chưa nghe thấy câu nói nào. Bạn thử nói lại hoặc gõ tin nhắn nhé.',
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
        return { type: 'aborted', message: 'Đã dừng thu âm.' };
      default:
        return {
          type: 'unknown',
          message:
            'Lovira chưa nghe rõ. Chú/bạn vui lòng thử nói lại hoặc nhập câu hỏi bằng tin nhắn nhé!',
        };
    }
  }

  private commitTranscript(text: string) {
    if (this.isSubmitted || this.isCancelled) return;
    this.isSubmitted = true;
    this.isListening = false;
    this.clearTimers();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    const cleanText = text.trim();
    if (cleanText) {
      console.log('[SpeechRecognition] Final transcript committed:', cleanText);
      this.events.onFinalResult?.(cleanText);
    } else {
      this.events.onError?.(
        'no-speech',
        'Lovira chưa nghe thấy câu nói nào. Bạn thử bấm nói lại nhé.'
      );
    }
  }

  public startListening(events: SpeechRecognitionEvents): boolean {
    if (!this.isSupported()) {
      console.warn('[SpeechRecognition] Web Speech API not supported in this browser');
      events.onError?.(
        'unsupported-browser',
        'Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Bạn có thể gõ tin nhắn cho Lovira nhé.'
      );
      return false;
    }

    // Clean up any ongoing session
    this.cancelListening();

    try {
      const win = window as IWindowWithSpeech;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'vi-VN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      this.recognition = recognition;
      this.events = events;
      this.isListening = true;
      this.isSubmitted = false;
      this.isCancelled = false;
      this.hasHeardSpeech = false;
      this.consecutiveRapidEnds = 0;
      this.restartCount = 0;
      this.lastStartTime = Date.now();
      this.latestTranscript = '';
      this.confirmedTranscript = '';
      this.interimTranscript = '';

      let hasFatalError = false;

      // 60 seconds (1 minute) Inactivity Timeout: If no speech input within 1 minute, terminate and notify
      this.inactivityTimeoutTimer = setTimeout(() => {
        if (this.isListening && !this.isSubmitted && !this.isCancelled) {
          console.log('[SpeechRecognition] 60s inactivity timeout reached without speech');
          if (this.latestTranscript.trim()) {
            this.commitTranscript(this.latestTranscript);
          } else {
            this.cancelListening();
            this.events.onError?.(
              'no-speech',
              'Đã quá 1 phút không nhận được câu nói nào. Lovira xin phép dừng micro, bạn nhấn vào biểu tượng micro khi sẵn sàng nói lại nhé!'
            );
          }
        }
      }, this.INACTIVITY_TIMEOUT_MS);

      // 30 seconds max listening window for long continuous speech
      this.sessionTimeoutTimer = setTimeout(() => {
        if (this.isListening && !this.isSubmitted && !this.isCancelled) {
          console.log('[SpeechRecognition] Max 30s continuous session timeout reached');
          if (this.latestTranscript.trim()) {
            this.commitTranscript(this.latestTranscript);
          } else {
            this.cancelListening();
            this.events.onError?.(
              'no-speech',
              'Lovira chưa nghe thấy câu nói nào. Bạn bấm vào micro để nói lại nhé.'
            );
          }
        }
      }, this.MAX_SESSION_MS);


      recognition.onstart = () => {
        if (this.isCancelled) return;
        this.lastStartTime = Date.now();
        console.log('[SpeechRecognition] Microphone active! Listening continuously...');
        this.isListening = true;
        this.events.onStart?.();
      };

      recognition.onresult = (event: any) => {
        if (this.isCancelled || this.isSubmitted) return;

        let newFinal = '';
        let newInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            newFinal += text + ' ';
          } else {
            newInterim += text;
          }
        }

        if (newFinal.trim()) {
          this.confirmedTranscript = (this.confirmedTranscript + ' ' + newFinal).trim();
        }
        this.interimTranscript = newInterim.trim();

        const combined = [this.confirmedTranscript, this.interimTranscript]
          .filter(Boolean)
          .join(' ')
          .trim();

        if (combined) {
          this.hasHeardSpeech = true;
          this.consecutiveRapidEnds = 0; // Reset rapid ends on detected voice
          this.latestTranscript = combined;
          console.log('[SpeechRecognition] Live speech:', combined);
          this.events.onInterimResult?.(combined);

          // Reset silence timer on each new word
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.isListening && !this.isSubmitted && this.hasHeardSpeech) {
              console.log('[SpeechRecognition] Auto-committing after silence:', this.latestTranscript);
              this.commitTranscript(this.latestTranscript);
            }
          }, this.SILENCE_COMMIT_MS);
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error || 'unknown';
        console.log('[SpeechRecognition] Error notice:', error);

        // Ignore harmless temporary events
        if (this.isCancelled || error === 'aborted' || error === 'no-speech') {
          return;
        }

        hasFatalError = true;
        this.isListening = false;
        this.clearTimers();
        const { type, message } = this.mapError(error);
        this.events.onError?.(type, message);
      };

      recognition.onend = () => {
        const duration = Date.now() - this.lastStartTime;
        console.log(
          '[SpeechRecognition] onend fired — hasFatalError:',
          hasFatalError,
          '| isCancelled:',
          this.isCancelled,
          '| isSubmitted:',
          this.isSubmitted,
          '| isListening:',
          this.isListening,
          '| duration:',
          duration
        );

        if (this.isCancelled || hasFatalError || this.isSubmitted) {
          this.clearTimers();
          this.events.onEnd?.();
          return;
        }

        // Loop prevention: If speech recognition ends in less than 700ms without hearing speech
        if (duration < 700 && !this.hasHeardSpeech) {
          this.consecutiveRapidEnds++;
        }

        // If we hit too many rapid ends or too many empty restarts, gracefully terminate
        if (this.consecutiveRapidEnds >= 2 || this.restartCount >= this.MAX_CONSECUTIVE_RESTARTS) {
          console.log('[SpeechRecognition] Halting rapid restart loop to avoid thrashing.');
          this.isListening = false;
          this.clearTimers();
          this.events.onEnd?.();
          return;
        }

        // If the browser closed the connection naturally while we're still waiting for speech:
        if (this.isListening) {
          if (this.latestTranscript.trim()) {
            // If we have text buffered, finalize it
            this.commitTranscript(this.latestTranscript);
          } else {
            // Restart with backoff delay (350ms) to prevent synchronous loop
            this.restartCount++;
            if (this.restartTimer) clearTimeout(this.restartTimer);
            this.restartTimer = setTimeout(() => {
              if (this.isListening && !this.isCancelled && !this.isSubmitted && this.recognition) {
                try {
                  console.log('[SpeechRecognition] Seamlessly restarting listener (attempt ' + this.restartCount + ')...');
                  this.lastStartTime = Date.now();
                  this.recognition.start();
                } catch (e) {
                  this.isListening = false;
                  this.clearTimers();
                  this.events.onEnd?.();
                }
              }
            }, 350);
          }
        }
      };

      this.lastStartTime = Date.now();
      recognition.start();
      return true;
    } catch (e: any) {
      console.warn('Failed to start SpeechRecognition:', e);
      events.onError?.('unknown', 'Không thể kích hoạt micro lúc này. Bạn thử gõ tin nhắn nhé!');
      return false;
    }
  }

  public finishListening() {
    if (this.isSubmitted || this.isCancelled) return;
    this.commitTranscript(this.latestTranscript);
  }

  public stopListening() {
    this.finishListening();
  }

  public cancelListening() {
    this.isCancelled = true;
    this.isListening = false;
    this.isSubmitted = false;
    this.latestTranscript = '';
    this.clearTimers();

    if (this.recognition) {
      const rec = this.recognition;
      this.recognition = null;
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch {
        // ignore
      }
    }
    this.events.onEnd?.();
  }

  public getCurrentTranscript(): string {
    return this.latestTranscript;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
