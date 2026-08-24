import { ReminderCategory, ReminderRepeat } from '../types/reminder';

export interface ParsedReminderIntent {
  title: string;
  scheduledAt: string; // ISO 8601
  notes?: string;
  category: ReminderCategory;
  repeat: ReminderRepeat;
  priority: 'normal' | 'high';
}

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
): ParsedReminderIntent | null {
  if (!text || !text.trim()) return null;

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // Check if text is a reminder command
  const isReminderCommand =
    lower.includes('nhắc') ||
    lower.includes('lên lịch') ||
    lower.includes('đặt lịch') ||
    lower.includes('hẹn giờ') ||
    lower.includes('báo thức') ||
    lower.includes('nhắc nhở');

  if (!isReminderCommand) return null;

  let targetDate = new Date(baseDate.getTime());
  let repeat: ReminderRepeat = 'once';
  let isDateSpecified = false;

  // 1. Recurrence
  if (lower.includes('hàng ngày') || lower.includes('mỗi ngày') || lower.includes('hằng ngày')) {
    repeat = 'daily';
    isDateSpecified = true;
  } else if (lower.includes('hàng tuần') || lower.includes('mỗi tuần')) {
    repeat = 'weekly';
    isDateSpecified = true;
  } else if (lower.includes('hàng tháng') || lower.includes('mỗi tháng')) {
    repeat = 'monthly';
    isDateSpecified = true;
  }

  // 2. Relative offset (e.g. "30 phút nữa", "15 phút sau", "1 tiếng nữa", "2 giờ nữa")
  const minutesRelMatch = lower.match(/(\d+)\s*(phút|p)\s*(nữa|sau)/);
  const hoursRelMatch = lower.match(/(\d+)\s*(tiếng|giờ|h)\s*(nữa|sau)/);

  if (minutesRelMatch) {
    const mins = parseInt(minutesRelMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + mins * 60 * 1000);
    isDateSpecified = true;
  } else if (hoursRelMatch) {
    const hrs = parseInt(hoursRelMatch[1], 10);
    targetDate = new Date(baseDate.getTime() + hrs * 60 * 60 * 1000);
    isDateSpecified = true;
  } else {
    // 3. Day of recurrence / relative day
    if (lower.includes('ngày mai') || lower.includes('sáng mai') || lower.includes('chiều mai') || lower.includes('tối mai') || lower.includes('trưa mai')) {
      targetDate.setDate(targetDate.getDate() + 1);
      isDateSpecified = true;
    } else if (lower.includes('ngày mốt') || lower.includes('ngày kia')) {
      targetDate.setDate(targetDate.getDate() + 2);
      isDateSpecified = true;
    } else if (lower.includes('hôm kia')) {
      targetDate.setDate(targetDate.getDate() - 2);
      isDateSpecified = true;
    } else if (lower.includes('hôm nay') || lower.includes('tối nay') || lower.includes('chiều nay') || lower.includes('trưa nay') || lower.includes('sáng nay')) {
      // today
      isDateSpecified = true;
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
    } else if (timeHMatch) {
      parsedHour = parseInt(timeHMatch[1], 10);
      parsedMinute = timeHMatch[2] ? parseInt(timeHMatch[2], 10) : 0;
    } else if (timeGiolMatch) {
      parsedHour = parseInt(timeGiolMatch[1], 10);
      parsedMinute = timeGiolMatch[2] ? parseInt(timeGiolMatch[2], 10) : 0;
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
        if (parsedHour < 11) parsedHour += 12; // e.g. "1 giờ trưa" -> 13
      }
      targetDate.setHours(parsedHour, parsedMinute, 0, 0);

      // If scheduled today and time already passed, roll to next day for daily/general
      if (targetDate.getTime() < baseDate.getTime() && !lower.includes('hôm nay')) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    } else {
      // Default times if only morning/afternoon/evening specified
      if (lower.includes('sáng')) {
        targetDate.setHours(8, 0, 0, 0);
      } else if (lower.includes('trưa')) {
        targetDate.setHours(12, 0, 0, 0);
      } else if (lower.includes('chiều')) {
        targetDate.setHours(15, 0, 0, 0);
      } else if (lower.includes('tối')) {
        targetDate.setHours(20, 0, 0, 0);
      } else {
        // Default to next hour if no time specified
        targetDate = new Date(baseDate.getTime() + 60 * 60 * 1000);
      }
    }
  }

  // 5. Category detection
  let category: ReminderCategory = 'general';
  if (
    lower.includes('thuốc') ||
    lower.includes('uống thuốc') ||
    lower.includes('đo huyết áp') ||
    lower.includes('đo đường huyết') ||
    lower.includes('khám bệnh') ||
    lower.includes('nhỏ mắt')
  ) {
    category = 'medication';
  } else if (
    lower.includes('khám') ||
    lower.includes('hẹn') ||
    lower.includes('bác sĩ') ||
    lower.includes('phỏng vấn') ||
    lower.includes('họp') ||
    lower.includes('làm cccd') ||
    lower.includes('thủ tục') ||
    lower.includes('ngân hàng') ||
    lower.includes('công chứng')
  ) {
    category = 'appointment';
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
  // Clean temporal phrases, time phrases, and command prefixes from raw text
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
  if (!cleanedTitle || cleanedTitle.length < 3) {
    if (category === 'medication') cleanedTitle = 'Uống thuốc đúng giờ';
    else if (category === 'appointment') cleanedTitle = 'Cuộc hẹn quan trọng';
    else if (category === 'family') cleanedTitle = 'Việc gia đình';
    else cleanedTitle = 'Nhắc nhở công việc';
  }

  // Capitalize first letter
  cleanedTitle = cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1);

  const priority = lower.includes('khẩn') || lower.includes('quan trọng') || category === 'medication' ? 'high' : 'normal';

  return {
    title: cleanedTitle,
    scheduledAt: targetDate.toISOString(),
    category,
    repeat,
    priority,
  };
}
