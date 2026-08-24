import { ReminderCategory, ReminderRepeat } from '../types/reminder';

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
  let hasDate = false;
  let hasTime = false;
  let hasRelativeOffset = false;

  // 1. Recurrence
  if (lower.includes('hàng ngày') || lower.includes('mỗi ngày') || lower.includes('hằng ngày')) {
    repeat = 'daily';
    hasDate = true;
  } else if (lower.includes('hàng tuần') || lower.includes('mỗi tuần')) {
    repeat = 'weekly';
    hasDate = true;
  } else if (lower.includes('hàng tháng') || lower.includes('mỗi tháng')) {
    repeat = 'monthly';
    hasDate = true;
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
      hasDate = true;
    } else if (lower.includes('ngày mốt') || lower.includes('ngày kia')) {
      targetDate.setDate(targetDate.getDate() + 2);
      hasDate = true;
    } else if (lower.includes('hôm kia')) {
      targetDate.setDate(targetDate.getDate() - 2);
      hasDate = true;
    } else if (lower.includes('hôm nay') || lower.includes('tối nay') || lower.includes('chiều nay') || lower.includes('trưa nay') || lower.includes('sáng nay')) {
      hasDate = true;
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
    lower.includes('hẹn') ||
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
    .replace(/lúc\s+\d{1,2}(:\d{2}|\s*h\s*\d{0,2}|\s*giờ\s*\d{0,2})?(\s*(sáng|trưa|chiều|tối|đêm))?/gi, '')
    .replace(/\b\d{1,2}(:\d{2}|\s*h\s*\d{0,2}|\s*giờ\s*\d{0,2})?(\s*(sáng|trưa|chiều|tối|đêm))/gi, '')
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
      targetDateStr: hasDate ? targetDate.toISOString() : undefined,
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
  const timeColonMatch = lower.match(/(\d{1,2}):(\d{2})/);
  const timeHMatch = lower.match(/(\d{1,2})\s*h\s*(\d{1,2})?/);
  const timeGiolMatch = lower.match(/(\d{1,2})\s*giờ\s*(\d{1,2})?/);
  const aloneNumMatch = lower.match(/^(\d{1,2})$/);

  let parsedHour: number | null = null;
  let parsedMinute = 0;

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

  if (!baseTargetDateStr && resultDate.getTime() <= Date.now()) {
    resultDate.setDate(resultDate.getDate() + 1);
  }

  return resultDate;
}
