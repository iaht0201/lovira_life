import { UserProfile, EmergencyContact, getEmergencyContacts, getUserDisplayName } from '../types/userProfile.js';
import { SOSLocation, SOSAlertLog, NATIONAL_EMERGENCY_SERVICES } from '../types/sos.js';
import { reverseGeocodeVietnamese } from './locationService.js';

const KEY_SOS_LOGS = 'lovira_sos_logs';

class SOSService {
  private audioCtx: AudioContext | null = null;
  private sirenOscillator1: OscillatorNode | null = null;
  private sirenOscillator2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenIntervalId: any = null;
  private isSirenPlaying: boolean = false;

  /**
   * Fetches high-accuracy GPS coordinates and reverse geocodes address
   */
  async getCurrentLocation(timeoutMs = 8000): Promise<SOSLocation | null> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.warn('[SOSService] GPS timeout, falling back');
          resolve(null);
        }
      }, timeoutMs);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);

          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 10);
          const mapUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

          let address: string | undefined = undefined;
          let cityName: string | undefined = undefined;

          // Attempt reverse geocode with Vietnamese diacritics
          try {
            const geo = await reverseGeocodeVietnamese(latitude, longitude);
            cityName = geo.cityName;
            address = geo.address || geo.cityName;
          } catch (e) {
            console.warn('[SOSService] Reverse geocode error:', e);
          }

          const loc: SOSLocation = {
            latitude,
            longitude,
            accuracy,
            address,
            cityName,
            timestamp: new Date().toISOString(),
            mapUrl,
          };

          resolve(loc);
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          console.warn('[SOSService] Geolocation error:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Formats a clear, high-priority emergency distress message in Vietnamese
   */
  formatSOSMessage(params: {
    userProfile?: UserProfile | null;
    location?: SOSLocation | null;
    customNote?: string;
  }): string {
    const { userProfile, location, customNote } = params;
    const name = getUserDisplayName(userProfile, 'Tôi');
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ngày ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    let msg = `🆘 [KHẨN CẤP] CỨU TÔI!\n`;
    msg += `Tôi là: ${name} đang cần sự trợ giúp khẩn cấp ngay bây giờ!\n\n`;

    if (location) {
      msg += `📍 Vị trí GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      if (location.accuracy) {
        msg += ` (Độ chính xác: ~${location.accuracy}m)`;
      }
      msg += `\n`;

      if (location.address) {
        msg += `🏢 Khu vực/Địa chỉ: ${location.address}\n`;
      }

      msg += `🗺️ Bản đồ Google Maps: ${location.mapUrl}\n`;
    } else {
      msg += `📍 Vị trí: Đang chưa lấy được tọa độ GPS chính xác. Vui lòng liên hệ lại ngay!\n`;
    }

    if (userProfile?.selfReportedConditions && userProfile.selfReportedConditions.length > 0) {
      msg += `\n🩺 Bệnh nền/Lưu ý y tế: ${userProfile.selfReportedConditions.join(', ')}\n`;
    }

    if (customNote?.trim()) {
      msg += `\n📝 Lời nhắn thêm: ${customNote.trim()}\n`;
    }

    msg += `\n⏰ Thời gian gửi: ${timeString}`;
    return msg;
  }

  /**
   * Generates cross-platform SMS URI with encoded body
   * Supports both Android (?body=) and iOS (&body= or ?&body=)
   */
  getSMSUri(phoneNumber: string, message: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(message);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    return `sms:${cleanPhone}${separator}body=${encodedBody}`;
  }

  /**
   * Generates telephone call URI
   */
  getTelUri(phoneNumber: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * Shares emergency text & link via Native Web Share or falls back to clipboard
   */
  async shareEmergencyAlert(message: string, mapUrl?: string): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: '🆘 CỨU TÔI - Khẩn cấp!',
          text: message,
          url: mapUrl,
        });
        return { success: true, method: 'share' };
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return { success: false, method: 'share' };
        }
        // Fallback to clipboard on error
      }
    }

    // Clipboard fallback
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        return { success: true, method: 'clipboard' };
      }
    } catch {
      // ignore
    }

    return { success: false, method: 'clipboard' };
  }

  /**
   * Plays loud emergency siren using Web Audio API
   */
  playSiren(): boolean {
    if (this.isSirenPlaying) return true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.sirenGain = this.audioCtx.createGain();
      this.sirenGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      this.sirenGain.connect(this.audioCtx.destination);

      this.sirenOscillator1 = this.audioCtx.createOscillator();
      this.sirenOscillator1.type = 'sawtooth';
      this.sirenOscillator1.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      this.sirenOscillator1.connect(this.sirenGain);
      this.sirenOscillator1.start();

      let toggle = false;
      this.sirenIntervalId = setInterval(() => {
        if (!this.audioCtx || !this.sirenOscillator1) return;
        const now = this.audioCtx.currentTime;
        const targetFreq = toggle ? 700 : 1300;
        this.sirenOscillator1.frequency.linearRampToValueAtTime(targetFreq, now + 0.25);
        toggle = !toggle;
      }, 300);

      this.isSirenPlaying = true;
      return true;
    } catch (e) {
      console.error('[SOSService] Failed to play siren:', e);
      return false;
    }
  }

  /**
   * Stops the emergency siren
   */
  stopSiren(): void {
    if (this.sirenIntervalId) {
      clearInterval(this.sirenIntervalId);
      this.sirenIntervalId = null;
    }

    try {
      if (this.sirenOscillator1) {
        this.sirenOscillator1.stop();
        this.sirenOscillator1.disconnect();
        this.sirenOscillator1 = null;
      }
      if (this.sirenGain) {
        this.sirenGain.disconnect();
        this.sirenGain = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    } catch (e) {
      console.warn('[SOSService] Error stopping siren:', e);
    }

    this.isSirenPlaying = false;
  }

  getIsSirenPlaying(): boolean {
    return this.isSirenPlaying;
  }

  /**
   * Records an SOS alert action into localStorage
   */
  saveSOSLog(log: Omit<SOSAlertLog, 'id' | 'timestamp'>): SOSAlertLog {
    const fullLog: SOSAlertLog = {
      ...log,
      id: `sos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    try {
      const logs = this.getSOSLogs();
      logs.unshift(fullLog);
      // Keep up to 30 most recent records
      localStorage.setItem(KEY_SOS_LOGS, JSON.stringify(logs.slice(0, 30)));
    } catch (e) {
      console.error('[SOSService] Failed to save SOS log:', e);
    }

    return fullLog;
  }

  getSOSLogs(): SOSAlertLog[] {
    try {
      const raw = localStorage.getItem(KEY_SOS_LOGS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  clearSOSLogs(): void {
    try {
      localStorage.removeItem(KEY_SOS_LOGS);
    } catch (e) {
      console.error('[SOSService] Failed to clear SOS logs:', e);
    }
  }
}

export const sosService = new SOSService();
