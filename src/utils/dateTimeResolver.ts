import { ReminderCategory, ReminderRepeat } from '../types/reminder.js';

export interface ParsedReminderIntent {
  title: string;
  scheduledAt: string; // ISO 8601
  notes?: string;
  category: ReminderCategory;
  repeat: ReminderRepeat;
  priority: 'normal' | 'high';
}

export type ReminderParseResult =
  | {
      status: 'resolved';
      reminder: ParsedReminderIntent;
    }
  | {
      status: 'needs_clarification';
      missing: ('date' | 'time')[];
      title: string;
      category: ReminderCategory;
      repeat: ReminderRepeat;
      priority: 'normal' | 'high';
      targetDateStr?: string;
    }
  | {
      status: 'not_reminder';
    };

/**
 * Deterministic parser for Vietnamese datetime expressions in voice & text prompts.
 * Examples:
 * - "Ngày mai 7 giờ sáng nhắc chú mang CCCD đi khám"
 * - "30 phút nữa nhắc chú uống thuốc huyết áp"
 * - "Tối nay 8h nhắc tôi gọi điện cho con"
 * - "Hàng ngày lúc 7:00 sáng nhắc đo đường huyết"
 */
export function parseVietnameseReminderText(
  text: string,
  baseDate: Date = new Date()
): ReminderParseResult {
  if (!text || !text.trim()) return { status: 'not_reminder' };

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 0. Exclude non-reminder conversational or inquiry phrases
  const conversationalKeywords = [
    'nhắc lại',
    'vừa nhắc',
    'có nhắc',
    'không nhắc',
    'chưa nhắc',
    'chuyện gì',
    'điều gì',
    'bước số',
    'bước tiếp',
    'nhắc tới',
    'nhắc đến',
    'nhắc xem',
    'nhắc coi',
  ];
  if (conversationalKeywords.some((kw) => lower.includes(kw))) {
    return { status: 'not_reminder' };
  }

  // Check if text is a reminder command verb
  const isReminderCommand =
    lower.includes('nhắc') ||
    lower.includes('lên lịch') ||
    lower.includes('đặt lịch') ||
    lower.includes('hẹn giờ') ||
    lower.includes('báo thức') ||
    lower.includes('nhắc nhở');

  if (!isReminderCommand) return { status: 'not_reminder' };

  let targetDate = new Date(baseDate.getTime());
  let repeat: ReminderRepeat = 'once';
  let hasExplicitDate = false;
  let hasTime = false;
  let hasRelativeOffset = false;

  // 1. Recurrence
  if (lower.includes('hàng ngày') || lower.includes('mỗi ngày') || lower.includes('hằng ngày')) {
    repeat = 'daily';
  } else if (lower.includes('hàng tuần') || lower.includes('mỗi tuần')) {
    repeat = 'weekly';
  } else if (lower.includes('hàng tháng') || lower.includes('mỗi tháng')) {
    repeat = 'monthly';
  }

  // 2. Relative offset (e.g. "30 phút nữa", "15 phút sau", "1 tiếng nữa", "2 giờ nữa")
  const minutesRelMatch = lower.match(/(\d+)\s*(phút|p)\s*(nữa|sau)/);
  const hoursRelMatch = lower.match(/(\d+)\s*(tiếng|giờ|h)\s*(nữa|sau)/);

  if (minutesRelMatch) {
    const mins = parseInt(minutesRelMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + mins * 60 * 1000);
    hasRelativeOffset = true;
  } else if (hoursRelMatch) {
    const hrs = parseInt(hoursRelMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + hrs * 60 * 60 * 1000);
    hasRelativeOffset = true;
  } else {
    // 3. Day of recurrence / relative day
    if (lower.includes('ngày mai') || lower.includes('sáng mai') || lower.includes('chiều mai') || lower.includes('tối mai') || lower.includes('trưa mai')) {
      targetDate.setDate(targetDate.getDate() + 1);
      hasExplicitDate = true;
    } else if (lower.includes('ngày mốt') || lower.includes('ngày kia')) {
      targetDate.setDate(targetDate.getDate() + 2);
      hasExplicitDate = true;
    } else if (lower.includes('hôm kia')) {
      targetDate.setDate(targetDate.getDate() - 2);
      hasExplicitDate = true;
    } else if (lower.includes('hôm nay') || lower.includes('tối nay') || lower.includes('chiều nay') || lower.includes('trưa nay') || lower.includes('sáng nay')) {
      hasExplicitDate = true;
    }

    // 4. Exact time parsing
    // Pattern: "7 giờ 30", "7h30", "7:30", "7 giờ sáng", "19 giờ", "8h tối", "14h"
    let parsedHour: number | null = null;
    let parsedMinute = 0;

    const timeColonMatch = lower.match(/(\d{1,2}):(\d{2})/);
    const timeHMatch = lower.match(/(\d{1,2})\s*h\s*(\d{1,2})?/);
    const timeGiolMatch = lower.match(/(\d{1,2})\s*giờ\s*(\d{1,2})?/);

    if (timeColonMatch) {
      parsedHour = parseInt(timeColonMatch[1], 10);
      parsedMinute = parseInt(timeColonMatch[2], 10);
      hasTime = true;
    } else if (timeHMatch) {
      parsedHour = parseInt(timeHMatch[1], 10);
      parsedMinute = timeHMatch[2] ? parseInt(timeHMatch[2], 10) : 0;
      hasTime = true;
    } else if (timeGiolMatch) {
      parsedHour = parseInt(timeGiolMatch[1], 10);
      parsedMinute = timeGiolMatch[2] ? parseInt(timeGiolMatch[2], 10) : 0;
      hasTime = true;
    }

    // AM / PM / Noon adjustments
    const isPM = lower.includes('chiều') || lower.includes('tối') || lower.includes('đêm');
    const isAM = lower.includes('sáng');
    const isNoon = lower.includes('trưa');

    if (parsedHour !== null) {
      if (isPM && parsedHour < 12) {
        parsedHour += 12;
      } else if (isAM && parsedHour === 12) {
        parsedHour = 0;
      } else if (isNoon && parsedHour < 12 && parsedHour !== 12) {
        if (parsedHour < 11) parsedHour += 12;
      }
      targetDate.setHours(parsedHour, parsedMinute, 0, 0);

      // If scheduled today and time already passed, roll to next day
      if (targetDate.getTime() < baseDate.getTime() && !lower.includes('hôm nay')) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }
  }

  // 5. Category detection (Appointment HAS PRECEDENCE for doctor/clinic visits)
  let category: ReminderCategory = 'general';
  if (
    lower.includes('khám') ||
    lower.includes('bác sĩ') ||
    lower.includes('bệnh viện') ||
    lower.includes('tái khám') ||
    lower.includes('đi khám') ||
    lower.includes('phòng khám') ||
    lower.includes('cuộc hẹn') ||
    lower.includes('lịch hẹn') ||
    lower.includes('hẹn bác sĩ') ||
    lower.includes('hẹn khám') ||
    lower.includes('hẹn gặp') ||
    lower.includes('phỏng vấn') ||
    lower.includes('họp') ||
    lower.includes('làm cccd') ||
    lower.includes('thủ tục') ||
    lower.includes('ngân hàng') ||
    lower.includes('công chứng')
  ) {
    category = 'appointment';
  } else if (
    lower.includes('thuốc') ||
    lower.includes('uống thuốc') ||
    lower.includes('đo huyết áp') ||
    lower.includes('đo đường huyết') ||
    lower.includes('nhỏ mắt') ||
    lower.includes('tiêm') ||
    lower.includes('uống viên')
  ) {
    category = 'medication';
  } else if (
    lower.includes('gọi điện cho con') ||
    lower.includes('thăm cháu') ||
    lower.includes('sinh nhật') ||
    lower.includes('gia đình') ||
    lower.includes('đón cháu')
  ) {
    category = 'family';
  }

  // 6. Title extraction
  let cleanedTitle = raw
    .replace(/hàng\s+ngày|mỗi\s+ngày|hằng\s+ngày|hàng\s+tuần|mỗi\s+tuần|hàng\s+tháng|mỗi\s+tháng/gi, '')
    .replace(/\d+\s*(phút|p)\s*(nữa|sau)/gi, '')
    .replace(/\d+\s*(tiếng|giờ|h)\s*(nữa|sau)/gi, '')
    .replace(/ngày\s+mai|sáng\s+mai|chiều\s+mai|tối\s+mai|trưa\s+mai|ngày\s+mốt|ngày\s+kia|hôm\s+nay|sáng\s+nay|chiều\s+nay|tối\s+nay|trưa\s+nay|hôm\s+kia/gi, '')
    .replace(/(lúc\s+)?\d{1,2}(:\d{2}|\s*h\s*\d{0,2}|\s*giờ\s*\d{0,2})?(\s*(sáng|trưa|chiều|tối|đêm))?/gi, '')
    .replace(/\b\d{1,2}\s*(h|giờ)\b(\s*\d{1,2})?/gi, '')
    .replace(/lúc\s+(sáng|trưa|chiều|tối|đêm)/gi, '')
    .replace(/\b(sáng|trưa|chiều|tối|đêm)\b/gi, '')
    .replace(/\b(hãy\s+)?(nhắc|lên\s+lịch|đặt\s+lịch|hẹn\s+giờ|báo\s+thức|nhắc\s+nhở)\b(\s*(cho\s+)?(chú|bác|tôi|cô|bà|anh|em|mình|nhé|nha|giúp))?/gi, '')
    .replace(/(nhé|nha|nhen|ạ|nhé con|nha con|giúp chú|giúp bác|giúp tôi)$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If title was stripped down too much, fallback to sensible category defaults
  if (!cleanedTitle || cleanedTitle.length < 2) {
    if (category === 'medication') cleanedTitle = 'Uống thuốc đúng giờ';
    else if (category === 'appointment') cleanedTitle = 'Cuộc hẹn quan trọng';
    else if (category === 'family') cleanedTitle = 'Việc gia đình';
    else cleanedTitle = 'Nhắc nhở';
  }

  // Capitalize first letter
  cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);

  const priority = lower.includes('khẩn') || lower.includes('quan trọng') || category === 'medication' ? 'high' : 'normal';

  // If no relative offset AND no exact time specified -> Needs clarification
  if (!hasRelativeOffset && !hasTime) {
    return {
      status: 'needs_clarification',
      missing: ['time'],
      title: cleanedTitle,
      category,
      repeat,
      priority,
      targetDateStr: hasExplicitDate ? targetDate.toISOString() : undefined,
    };
  }

  return {
    status: 'resolved',
    reminder: {
      title: cleanedTitle,
      scheduledAt: targetDate.toISOString(),
      category,
      repeat,
      priority,
    },
  };
}

/**
 * Resolves clarified time answer from user when responding to a time prompt
 * (e.g. "7 giờ sáng", "8h30", "15 phút nữa", "tối 8h")
 */
export function parseClarifiedTime(
  userText: string,
  baseTargetDateStr?: string
): Date | null {
  if (!userText || !userText.trim()) return null;

  const lower = userText.trim().toLowerCase();
  let baseDate = baseTargetDateStr ? new Date(baseTargetDateStr) : new Date();
  if (isNaN(baseDate.getTime())) baseDate = new Date();

  // 1. Relative offset ("30 phút nữa", "15 phút sau", "1 tiếng nữa")
  const minutesRelMatch = lower.match(/(\d+)\s*(phút|p)\s*(nữa|sau)?/);
  const hoursRelMatch = lower.match(/(\d+)\s*(tiếng|giờ|h)\s*(nữa|sau)/);

  if (minutesRelMatch && (lower.includes('nữa') || lower.includes('sau'))) {
    const mins = parseInt(minutesRelMatch[1], 10);
    return new Date(Date.now() + mins * 60 * 1000);
  }
  if (hoursRelMatch && (lower.includes('nữa') || lower.includes('sau'))) {
    const hrs = parseInt(hoursRelMatch[1], 10);
    return new Date(Date.now() + hrs * 60 * 60 * 1000);
  }

  // 2. Exact time parsing
  // Word number map for common spoken numbers
  const wordToNum: Record<string, number> = {
    'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5,
    'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10,
    'mười một': 11, 'mười hai': 12,
  };

  let parsedHour: number | null = null;
  let parsedMinute = 0;

  // "7 rưỡi", "7h rưỡi", "7 giờ rưỡi", "bảy rưỡi"
  const ruoiMatch = lower.match(/(\d{1,2}|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mười\s+một|mười\s+hai)\s*(giờ|h)?\s*rưỡi/);
  // "6 giờ kém 15", "6h kém 15", "6h kém 10"
  const kemMatch = lower.match(/(\d{1,2}|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mười\s+một|mười\s+hai)\s*(giờ|h)?\s*kém\s*(\d{1,2})/);

  if (ruoiMatch) {
    const hStr = ruoiMatch[1];
    parsedHour = wordToNum[hStr] !== undefined ? wordToNum[hStr] : parseInt(hStr, 10);
    parsedMinute = 30;
  } else if (kemMatch) {
    const hStr = kemMatch[1];
    const rawH = wordToNum[hStr] !== undefined ? wordToNum[hStr] : parseInt(hStr, 10);
    const minsSub = parseInt(kemMatch[3], 10);
    parsedHour = rawH - 1;
    if (parsedHour < 0) parsedHour += 12;
    parsedMinute = 60 - minsSub;
  } else {
    const timeColonMatch = lower.match(/(\d{1,2}):(\d{2})/);
    const timeHMatch = lower.match(/(\d{1,2})\s*h\s*(\d{1,2})?/);
    const timeGiolMatch = lower.match(/(\d{1,2})\s*giờ\s*(\d{1,2})?/);
    const aloneNumMatch = lower.match(/^(\d{1,2})$/);
    const wordNumMatch = lower.match(/^(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mười\s+một|mười\s+hai)$/);

    if (timeColonMatch) {
      parsedHour = parseInt(timeColonMatch[1], 10);
      parsedMinute = parseInt(timeColonMatch[2], 10);
    } else if (timeHMatch) {
      parsedHour = parseInt(timeHMatch[1], 10);
      parsedMinute = timeHMatch[2] ? parseInt(timeHMatch[2], 10) : 0;
    } else if (timeGiolMatch) {
      parsedHour = parseInt(timeGiolMatch[1], 10);
      parsedMinute = timeGiolMatch[2] ? parseInt(timeGiolMatch[2], 10) : 0;
    } else if (aloneNumMatch) {
      parsedHour = parseInt(aloneNumMatch[1], 10);
      parsedMinute = 0;
    } else if (wordNumMatch && wordToNum[wordNumMatch[1]]) {
      parsedHour = wordToNum[wordNumMatch[1]];
      parsedMinute = 0;
    }
  }

  if (parsedHour === null) {
    if (lower.includes('sáng')) parsedHour = 8;
    else if (lower.includes('trưa')) parsedHour = 12;
    else if (lower.includes('chiều')) parsedHour = 15;
    else if (lower.includes('tối')) parsedHour = 20;
  }

  if (parsedHour === null) return null;

  const isPM = lower.includes('chiều') || lower.includes('tối') || lower.includes('đêm');
  const isAM = lower.includes('sáng');
  const isNoon = lower.includes('trưa');

  if (isPM && parsedHour < 12) {
    parsedHour += 12;
  } else if (isAM && parsedHour === 12) {
    parsedHour = 0;
  } else if (isNoon && parsedHour < 12 && parsedHour !== 12) {
    if (parsedHour < 11) parsedHour += 12;
  }

  const resultDate = new Date(baseDate.getTime());
  resultDate.setHours(parsedHour, parsedMinute, 0, 0);

  // If result date is in the past, roll forward to tomorrow
  if (resultDate.getTime() <= Date.now()) {
    resultDate.setDate(resultDate.getDate() + 1);
  }

  return resultDate;
}

/**
 * Extracts a specific goal / activity title from a user's prompt,
 * preserving specific details like "khám tai", "phỏng vấn kế toán", "làm BHYT"
 */
export function extractSpecificGoal(text: string): string {
  if (!text || !text.trim()) return '';
  let cleaned = text.trim();

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[?.!;,]+$/, '');

  // Iteratively remove leading temporal words, time expressions, pronouns, and modals
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;

    // Remove leading date/time expressions
    cleaned = cleaned.replace(/^(ngày mai|sáng mai|chiều mai|tối mai|trưa mai|hôm nay|sáng nay|chiều nay|tối nay|ngày mốt|ngày kia|hôm kia|mai này|mai|mốt|tuần sau|thứ\s+[2-7]|chủ\s+nhật)\s*/i, '');

    // Remove leading clock expressions (e.g. lúc 8h, 8:00, 8 giờ sáng, 8h30)
    cleaned = cleaned.replace(/^(lúc\s+)?\d{1,2}(:\d{2}|\s*h\s*\d{0,2}|\s*giờ\s*\d{0,2})?(\s*(sáng|trưa|chiều|tối|đêm))?\s*/i, '');

    // Remove leading personal pronouns
    cleaned = cleaned.replace(/^(chú|tôi|bác|cô|bà|ông|anh|chị|em|mình)\s+/i, '');

    // Remove leading modal/intent verbs
    cleaned = cleaned.replace(/^(phải|cần|sắp|muốn|dự định|sắp sửa|tính|đang|nhớ|tạo|cho|hỗ trợ)\s+/i, '');
  }

  // Clean trailing polite words or reminder requests
  cleaned = cleaned.replace(/(nhé|nha|nhen|ạ|nhé con|nha con|giúp chú|giúp bác|giúp tôi)$/i, '').trim();

  if (!cleaned || cleaned.length < 2) {
    return text.trim();
  }

  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Formats a specific goal into a clean action verb phrase for speech & replies
 */
export function formatActionVerbDisplay(specificGoal: string): string {
  if (!specificGoal || !specificGoal.trim()) return 'thực hiện công việc này';
  const lower = specificGoal.trim().toLowerCase();

  if (lower.startsWith('khám')) {
    return 'đi ' + lower;
  }

  const commonVerbs = [
    'đi', 'làm', 'tái', 'ra', 'về', 'mua', 'rút', 'học', 'sửa', 'đổi', 'chụp',
    'uống', 'gặp', 'đến', 'sang', 'đóng', 'tập', 'nhận', 'nộp', 'ký', 'soạn'
  ];

  const startsWithVerb = commonVerbs.some((v) => lower.startsWith(v));
  if (startsWithVerb) {
    return lower;
  }

  return 'làm ' + lower;
}

/**
 * Extracts date information from text
 */
export function extractDateFromText(
  text: string,
  baseDate: Date = new Date()
): { hasDate: boolean; dateObj: Date; dateLabel: string } {
  const lower = text.toLowerCase();
  const d = new Date(baseDate.getTime());

  if (
    lower.includes('ngày mai') ||
    lower.includes('sáng mai') ||
    lower.includes('chiều mai') ||
    lower.includes('tối mai') ||
    lower.includes('trưa mai') ||
    /\bmai\b/.test(lower)
  ) {
    d.setDate(d.getDate() + 1);
    return { hasDate: true, dateObj: d, dateLabel: 'ngày mai' };
  }
  if (lower.includes('ngày mốt') || lower.includes('ngày kia')) {
    d.setDate(d.getDate() + 2);
    return { hasDate: true, dateObj: d, dateLabel: 'ngày kia' };
  }
  if (
    lower.includes('hôm nay') ||
    lower.includes('sáng nay') ||
    lower.includes('chiều nay') ||
    lower.includes('tối nay') ||
    lower.includes('trưa nay')
  ) {
    return { hasDate: true, dateObj: d, dateLabel: 'hôm nay' };
  }

  // Specific date pattern e.g. 29/8, 30/08
  const dateSlashMatch = lower.match(/(\d{1,2})\/(\d{1,2})/);
  if (dateSlashMatch) {
    const day = parseInt(dateSlashMatch[1], 10);
    const month = parseInt(dateSlashMatch[2], 10) - 1;
    d.setMonth(month, day);
    if (d.getTime() < baseDate.getTime() - 86400000) {
      d.setFullYear(d.getFullYear() + 1);
    }
    return { hasDate: true, dateObj: d, dateLabel: `ngày ${day}/${month + 1}` };
  }

  return { hasDate: false, dateObj: d, dateLabel: '' };
}

/**
 * Extracts event time from text (e.g. 8 giờ, 8h30, 9:00, 7h sáng)
 */
export function extractTimeFromText(text: string): {
  hasTime: boolean;
  timeStr: string;
  hour: number | null;
  minute: number;
} {
  const lower = text.toLowerCase();
  let hour: number | null = null;
  let minute = 0;

  const timeColonMatch = lower.match(/(\d{1,2}):(\d{2})/);
  const timeHMatch = lower.match(/(\d{1,2})\s*h\s*(\d{1,2})?/);
  const timeGioMatch = lower.match(/(\d{1,2})\s*giờ\s*(\d{1,2})?/);
  const aloneNumMatch = lower.match(/\blúc\s*(\d{1,2})\b/);

  if (timeColonMatch) {
    hour = parseInt(timeColonMatch[1], 10);
    minute = parseInt(timeColonMatch[2], 10);
  } else if (timeHMatch) {
    hour = parseInt(timeHMatch[1], 10);
    minute = timeHMatch[2] ? parseInt(timeHMatch[2], 10) : 0;
  } else if (timeGioMatch) {
    hour = parseInt(timeGioMatch[1], 10);
    minute = timeGioMatch[2] ? parseInt(timeGioMatch[2], 10) : 0;
  } else if (aloneNumMatch) {
    hour = parseInt(aloneNumMatch[1], 10);
    minute = 0;
  }

  if (hour !== null) {
    const isPM = lower.includes('chiều') || lower.includes('tối') || lower.includes('đêm');
    const isAM = lower.includes('sáng');
    const isNoon = lower.includes('trưa');

    if (isPM && hour < 12) {
      hour += 12;
    } else if (isAM && hour === 12) {
      hour = 0;
    } else if (isNoon && hour < 12 && hour !== 12) {
      if (hour < 11) hour += 12;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      hasTime: true,
      timeStr: `${pad(hour)}:${pad(minute)}`,
      hour,
      minute,
    };
  }

  return { hasTime: false, timeStr: '', hour: null, minute: 0 };
}

/**
 * Extracts lead time preference (e.g. "trước 15 phút", "báo trước 15p", "15 phút", "đúng giờ", "trước 1 tiếng")
 */
export function extractLeadTimeFromText(text: string): {
  hasLeadTime: boolean;
  leadMinutes: number;
  isExact: boolean;
} {
  const lower = text.trim().toLowerCase();

  // 1. Explicit Exact / On-time requests
  if (
    lower.includes('đúng giờ') ||
    lower.includes('nhắc đúng') ||
    lower.includes('đúng lúc') ||
    lower.includes('không cần trước') ||
    lower.includes('khong can truoc') ||
    lower.startsWith('đúng ') ||
    lower.startsWith('dung ') ||
    lower === 'đúng' ||
    lower === 'dung'
  ) {
    return { hasLeadTime: true, leadMinutes: 0, isExact: true };
  }

  // 2. Explicit Minutes match (e.g. "báo trước 15 phút", "trước 15p", "15 phút", "30p", "10 phút", "15")
  const minsMatch = lower.match(/(?:báo\s*trước|nhắc\s*trước|bao\s*truoc|nhac\s*truoc|trước\s*|truoc\s*)?(\d+)\s*(?:phút|phut|p)\b/i);
  if (minsMatch) {
    const mins = parseInt(minsMatch[1], 10);
    if (!isNaN(mins) && mins >= 0 && mins <= 180) {
      return { hasLeadTime: true, leadMinutes: mins, isExact: mins === 0 };
    }
  }

  // 3. Short standalone number when answering lead time prompt (e.g., "15", "30", "10", "45", "5", "20")
  if (/^(\d{1,2})$/.test(lower)) {
    const mins = parseInt(lower, 10);
    if (mins >= 1 && mins <= 60) {
      return { hasLeadTime: true, leadMinutes: mins, isExact: false };
    }
  }

  // 4. Hours match ONLY for small offsets (1-3 hours / tiếng, e.g. "trước 1 tiếng", "trước 1 giờ", "1 tiếng")
  const hoursMatch = lower.match(/(?:báo\s*trước|nhắc\s*trước|bao\s*truoc|nhac\s*truoc|trước\s*|truoc\s*)?([1-3]|một|hai|ba)\s*(?:tiếng|tieng|giờ|gio|h)\b/i);
  if (hoursMatch) {
    let hrs = 1;
    const rawVal = hoursMatch[1].toLowerCase();
    if (rawVal === 'một' || rawVal === 'mot' || rawVal === '1') hrs = 1;
    else if (rawVal === 'hai' || rawVal === '2') hrs = 2;
    else if (rawVal === 'ba' || rawVal === '3') hrs = 3;
    else hrs = parseInt(rawVal, 10) || 1;

    return { hasLeadTime: true, leadMinutes: hrs * 60, isExact: false };
  }

  // 5. Common Vietnamese phrase matches
  if (lower.includes('trước 15') || lower.includes('truoc 15') || lower.includes('15p') || lower.includes('15 phút')) {
    return { hasLeadTime: true, leadMinutes: 15, isExact: false };
  }
  if (lower.includes('trước 30') || lower.includes('truoc 30') || lower.includes('30p') || lower.includes('30 phút') || lower.includes('nửa tiếng') || lower.includes('nua tieng')) {
    return { hasLeadTime: true, leadMinutes: 30, isExact: false };
  }
  if (lower.includes('trước 1 tiếng') || lower.includes('trước 1 giờ') || lower.includes('truoc 1 tieng') || lower.includes('truoc 1 gio') || lower.includes('1 tiếng') || lower.includes('1 giờ')) {
    return { hasLeadTime: true, leadMinutes: 60, isExact: false };
  }

  // 6. Generic "báo trước" / "nhắc trước" without specifying duration -> default to 15 minutes
  if (
    lower.includes('báo trước') ||
    lower.includes('bao truoc') ||
    lower.includes('nhắc trước') ||
    lower.includes('nhac truoc') ||
    lower.includes('trước đó') ||
    lower.includes('truoc do') ||
    lower.includes('trước đi') ||
    lower.includes('truoc di')
  ) {
    return { hasLeadTime: true, leadMinutes: 15, isExact: false };
  }

  return { hasLeadTime: false, leadMinutes: 0, isExact: false };
}

