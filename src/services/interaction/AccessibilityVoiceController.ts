import { AccessibilitySettings } from '../../types.js';
import { AppAction } from './appActionTypes.js';
import { normalizeVietnameseText, stripVietnameseAccents } from './VietnameseNormalizer.js';

export interface AccessibilityVoiceCommandResult {
  handled: boolean;
  appAction?: AppAction;
  reply?: string;
  speech?: string;
  updatedSettings?: Partial<AccessibilitySettings>;
}

/**
 * Deterministic, ultra-fast Voice Command Detector for Accessibility & System Display Settings
 */
export function matchAccessibilityVoiceCommand(
  rawText: string,
  currentSettings?: AccessibilitySettings
): AccessibilityVoiceCommandResult | null {
  if (!rawText || !rawText.trim()) return null;

  const normalized = normalizeVietnameseText(rawText);
  const stripped = stripVietnameseAccents(normalized);

  // 1. HIGH CONTRAST (Tương phản)
  if (
    stripped.includes('tuong phan cao') ||
    stripped.includes('che do tuong phan') ||
    stripped.includes('bat tuong phan') ||
    stripped.includes('do tuong phan') ||
    stripped.includes('bat do tuong phan') ||
    stripped.includes('man hinh tuong phan') ||
    stripped === 'tuong phan' ||
    stripped === 'che do tuong phan' ||
    stripped === 'tuong phan cao' ||
    stripped.startsWith('tuong phan') ||
    stripped.endsWith('tuong phan')
  ) {
    // Check if turning OFF
    if (
      stripped.includes('tat tuong phan') ||
      stripped.includes('tat che do tuong phan') ||
      stripped.includes('tat do tuong phan') ||
      stripped.includes('dung tuong phan') ||
      stripped.includes('khong dung tuong phan')
    ) {
      return {
        handled: true,
        appAction: {
          type: 'UPDATE_ACCESSIBILITY_SETTING',
          payload: { setting: 'highContrast', value: false },
        },
        reply: 'Dạ, Lovira đã tắt chế độ tương phản cao rồi ạ.',
        speech: 'Dạ, Lovira đã tắt chế độ tương phản cao rồi ạ.',
        updatedSettings: { highContrast: false },
      };
    }

    // Default is turning ON or TOGGLING
    const nextVal = currentSettings ? !currentSettings.highContrast : true;
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'highContrast', value: nextVal },
      },
      reply: nextVal
        ? 'Dạ, Lovira đã bật chế độ tương phản cao với viền và chữ siêu rõ nét rồi ạ.'
        : 'Dạ, Lovira đã tắt chế độ tương phản cao rồi ạ.',
      speech: nextVal
        ? 'Dạ, Lovira đã bật chế độ tương phản cao với viền và chữ siêu rõ nét rồi ạ.'
        : 'Dạ, Lovira đã tắt chế độ tương phản cao rồi ạ.',
      updatedSettings: { highContrast: nextVal },
    };
  }

  if (
    stripped.includes('tat tuong phan') ||
    stripped.includes('tat che do tuong phan')
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'highContrast', value: false },
      },
      reply: 'Dạ, Lovira đã tắt chế độ tương phản cao rồi ạ.',
      speech: 'Dạ, Lovira đã tắt chế độ tương phản cao rồi ạ.',
      updatedSettings: { highContrast: false },
    };
  }

  // 2. THEME DARK / LIGHT (Chế độ Tối / Sáng)
  if (
    stripped.includes('che do toi') ||
    stripped.includes('bat che do toi') ||
    stripped.includes('giao dien toi') ||
    stripped.includes('man hinh toi') ||
    stripped.includes('che do ban dem') ||
    stripped.includes('bat nen toi') ||
    stripped.includes('nen toi') ||
    stripped.includes('chuyen sang toi') ||
    stripped.includes('chuyen qua toi') ||
    stripped.includes('giao dien ban dem') ||
    stripped === 'che do toi' ||
    stripped === 'giao dien toi' ||
    stripped === 'man hinh toi'
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'theme', value: 'dark' },
      },
      reply: 'Dạ, Lovira đã chuyển sang chế độ giao diện tối (Dark Mode) dịu mắt rồi ạ.',
      speech: 'Dạ, Lovira đã chuyển sang chế độ giao diện tối dịu mắt rồi ạ.',
      updatedSettings: { theme: 'dark' },
    };
  }

  if (
    stripped.includes('che do sang') ||
    stripped.includes('bat che do sang') ||
    stripped.includes('giao dien sang') ||
    stripped.includes('man hinh sang') ||
    stripped.includes('che do ban ngay') ||
    stripped.includes('bat nen sang') ||
    stripped.includes('nen sang') ||
    stripped.includes('chuyen sang sang') ||
    stripped.includes('chuyen qua sang') ||
    stripped.includes('giao dien ban ngay') ||
    stripped === 'che do sang' ||
    stripped === 'giao dien sang' ||
    stripped === 'man hinh sang'
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'theme', value: 'light' },
      },
      reply: 'Dạ, Lovira đã chuyển sang chế độ giao diện sáng rõ nét rồi ạ.',
      speech: 'Dạ, Lovira đã chuyển sang chế độ giao diện sáng rõ nét rồi ạ.',
      updatedSettings: { theme: 'light' },
    };
  }

  // 3. FONT SCALE (Cỡ chữ hiển thị)
  // Specific percentage requests
  if (stripped.includes('100%') || stripped.includes('100 phan tram') || stripped.includes('co chu 100') || stripped.includes('chu 100') || stripped.includes('co chu chuan') || stripped.includes('co chu mac dinh') || stripped.includes('co chu binh thuong')) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'fontScale', value: 1.0 },
      },
      reply: 'Dạ, Lovira đã đặt cỡ chữ về 100% chuẩn ban đầu rồi ạ.',
      speech: 'Dạ, Lovira đã đặt cỡ chữ về 100% chuẩn ban đầu rồi ạ.',
      updatedSettings: { fontScale: 1.0 },
    };
  }

  if (stripped.includes('125%') || stripped.includes('125 phan tram') || stripped.includes('co chu 125') || stripped.includes('chu 125')) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'fontScale', value: 1.25 },
      },
      reply: 'Dạ, Lovira đã chỉnh cỡ chữ hiển thị sang mức 125% rồi ạ.',
      speech: 'Dạ, Lovira đã chỉnh cỡ chữ hiển thị sang mức 125% rồi ạ.',
      updatedSettings: { fontScale: 1.25 },
    };
  }

  if (stripped.includes('150%') || stripped.includes('150 phan tram') || stripped.includes('co chu 150') || stripped.includes('chu 150')) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'fontScale', value: 1.5 },
      },
      reply: 'Dạ, Lovira đã chỉnh cỡ chữ hiển thị sang mức 150% lớn rõ ràng rồi ạ.',
      speech: 'Dạ, Lovira đã chỉnh cỡ chữ hiển thị sang mức 150% lớn rõ ràng rồi ạ.',
      updatedSettings: { fontScale: 1.5 },
    };
  }

  if (stripped.includes('175%') || stripped.includes('175 phan tram') || stripped.includes('co chu 175') || stripped.includes('chu 175') || stripped.includes('chu to nhat') || stripped.includes('co chu cuc dai')) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'fontScale', value: 1.75 },
      },
      reply: 'Dạ, Lovira đã chỉnh cỡ chữ hiển thị sang mức cực đại 175% rồi ạ.',
      speech: 'Dạ, Lovira đã chỉnh cỡ chữ hiển thị sang mức cực đại 175% rồi ạ.',
      updatedSettings: { fontScale: 1.75 },
    };
  }

  // Relative font scaling: Increase
  if (
    stripped.includes('tang co chu') ||
    stripped.includes('chu to hon') ||
    stripped.includes('chu to len') ||
    stripped.includes('chu lon hon') ||
    stripped.includes('phong to chu') ||
    stripped.includes('cho chu to') ||
    stripped.includes('co chu lon') ||
    stripped.includes('chu bu hon') ||
    stripped.includes('chu to ra') ||
    stripped.includes('phong to van ban') ||
    stripped.includes('tang kich thuoc chu') ||
    stripped === 'chu to hon' ||
    stripped === 'tang co chu' ||
    stripped === 'chu to len'
  ) {
    const scales = [1.0, 1.25, 1.5, 1.75];
    const current = currentSettings?.fontScale || 1.0;
    const currentIndex = scales.indexOf(current);
    const nextScale = currentIndex < scales.length - 1 ? scales[currentIndex + 1] : 1.75;
    const percent = Math.round(nextScale * 100);

    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'fontScale', value: nextScale },
      },
      reply: `Dạ, Lovira đã tăng cỡ chữ lên ${percent}% cho dễ nhìn rồi ạ.`,
      speech: `Dạ, Lovira đã tăng cỡ chữ lên ${percent}% cho dễ nhìn rồi ạ.`,
      updatedSettings: { fontScale: nextScale },
    };
  }

  // Relative font scaling: Decrease
  if (
    stripped.includes('giam co chu') ||
    stripped.includes('chu nho lai') ||
    stripped.includes('chu nho hon') ||
    stripped.includes('thu nho chu') ||
    stripped.includes('cho chu nho') ||
    stripped.includes('giam kich thuoc chu') ||
    stripped.includes('thu nho van ban') ||
    stripped === 'chu nho hon' ||
    stripped === 'giam co chu' ||
    stripped === 'chu nho lai'
  ) {
    const scales = [1.0, 1.25, 1.5, 1.75];
    const current = currentSettings?.fontScale || 1.0;
    const currentIndex = scales.indexOf(current);
    const prevScale = currentIndex > 0 ? scales[currentIndex - 1] : 1.0;
    const percent = Math.round(prevScale * 100);

    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'fontScale', value: prevScale },
      },
      reply: `Dạ, Lovira đã giảm cỡ chữ xuống ${percent}% rồi ạ.`,
      speech: `Dạ, Lovira đã giảm cỡ chữ xuống ${percent}% rồi ạ.`,
      updatedSettings: { fontScale: prevScale },
    };
  }

  // 4. SPEAK RESPONSE / TTS (Đọc phản hồi bằng giọng nói)
  if (
    stripped.includes('bat doc giong noi') ||
    stripped.includes('bat giong noi') ||
    stripped.includes('bat doc to') ||
    stripped.includes('bat am thanh') ||
    stripped.includes('doc to cau tra loi') ||
    stripped.includes('bat doc tro ly') ||
    stripped.includes('bat tieng') ||
    stripped.includes('doc bang giong noi')
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'speakResponse', value: true },
      },
      reply: 'Dạ, Lovira đã bật chế độ tự động đọc to câu trả lời rồi ạ.',
      speech: 'Dạ, Lovira đã bật chế độ tự động đọc to câu trả lời rồi ạ.',
      updatedSettings: { speakResponse: true },
    };
  }

  if (
    stripped.includes('tat doc giong noi') ||
    stripped.includes('tat giong noi') ||
    stripped.includes('tat am thanh') ||
    stripped.includes('tat doc to') ||
    stripped.includes('tat tieng') ||
    stripped.includes('im lang') ||
    stripped.includes('dung doc') ||
    stripped.includes('tat doc')
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'speakResponse', value: false },
      },
      reply: 'Dạ, Lovira đã tắt đọc to câu trả lời rồi ạ.',
      speech: 'Dạ, Lovira đã tắt đọc to câu trả lời rồi ạ.',
      updatedSettings: { speakResponse: false },
    };
  }

  // 5. VSL SIGN LANGUAGE (Ngôn ngữ ký hiệu VSL)
  if (
    stripped.includes('bat ngon ngu ky hieu') ||
    stripped.includes('bat thu ngu') ||
    stripped.includes('bat vsl') ||
    stripped.includes('hien ngon ngu ky hieu') ||
    stripped.includes('mo ngon ngu ky hieu')
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'vslEnabled', value: true },
      },
      reply: 'Dạ, Lovira đã mở khung phiên dịch Ngôn ngữ ký hiệu VSL cho bạn rồi ạ.',
      speech: 'Dạ, Lovira đã mở khung phiên dịch Ngôn ngữ ký hiệu VSL cho bạn rồi ạ.',
      updatedSettings: { vslEnabled: true },
    };
  }

  if (
    stripped.includes('tat ngon ngu ky hieu') ||
    stripped.includes('tat thu ngu') ||
    stripped.includes('tat vsl') ||
    stripped.includes('an ngon ngu ky hieu') ||
    stripped.includes('dong ngon ngu ky hieu')
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'vslEnabled', value: false },
      },
      reply: 'Dạ, Lovira đã ẩn khung Ngôn ngữ ký hiệu VSL rồi ạ.',
      speech: 'Dạ, Lovira đã ẩn khung Ngôn ngữ ký hiệu VSL rồi ạ.',
      updatedSettings: { vslEnabled: false },
    };
  }

  // 6. REDUCED MOTION (Giảm chuyển động)
  if (
    stripped.includes('giam chuyen dong') ||
    stripped.includes('bat giam chuyen dong') ||
    stripped.includes('tat hieu ung chuyen dong') ||
    stripped.includes('it chuyen dong')
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'reducedMotion', value: true },
      },
      reply: 'Dạ, Lovira đã bật chế độ giảm hiệu ứng chuyển động rồi ạ.',
      speech: 'Dạ, Lovira đã bật chế độ giảm hiệu ứng chuyển động rồi ạ.',
      updatedSettings: { reducedMotion: true },
    };
  }

  if (
    stripped.includes('tat giam chuyen dong') ||
    stripped.includes('bat hieu ung chuyen dong')
  ) {
    return {
      handled: true,
      appAction: {
        type: 'UPDATE_ACCESSIBILITY_SETTING',
        payload: { setting: 'reducedMotion', value: false },
      },
      reply: 'Dạ, Lovira đã khôi phục hiệu ứng chuyển động bình thường rồi ạ.',
      speech: 'Dạ, Lovira đã khôi phục hiệu ứng chuyển động bình thường rồi ạ.',
      updatedSettings: { reducedMotion: false },
    };
  }

  return null;
}
