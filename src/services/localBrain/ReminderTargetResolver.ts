import { reminderService } from '../reminderService.js';
import { Reminder } from '../../types/reminder.js';
import { normalizeVietnameseText, stripVietnameseAccents } from '../interaction/VietnameseNormalizer.js';

export interface ResolvedReminderTarget {
  targetText?: string;
  reminderId?: string;
  title?: string;
  matchedReminder?: Reminder;
  candidates?: Reminder[];
  isAmbiguous?: boolean;
  errorReason?: string;
}

const REMINDER_ACTION_PREFIXES = [
  'xoa nhac nho',
  'xoa lich nhac',
  'xoa lich hen',
  'xoa lich',
  'xoa nhac',
  'xoa bao thuc',
  'xoa',
  'huy nhac nho',
  'huy lich nhac',
  'huy lich hen',
  'huy lich',
  'huy nhac',
  'huy',
  'bo nhac nho',
  'bo lich nhac',
  'bo lich',
  'hoan nhac nho',
  'hoan lich nhac',
  'hoan nhac',
  'hoan bao thuc',
  'hoan',
  'bao lai sau',
  'nhac lai sau',
  'bao lai',
  'doi gio nhac nho',
  'doi gio nhac',
  'doi gio lich',
  'doi gio',
  'sua nhac nho',
  'sua lich nhac',
  'sua lich',
  'sua nhac',
  'chinh nhac nho',
  'chinh lich',
  'cap nhat nhac nho',
  'cap nhat lich',
  'danh dau xong',
  'hoan thanh nhac',
  'hoan thanh lich',
  'hoan thanh',
  'da uong thuoc',
  'da uong',
  'da lam xong',
  'da xong',
  'xong roi',
  'xong nhac nho',
  'xong lich',
];

const FILLER_HONORIFICS = [
  'giup chu',
  'giup bac',
  'giup toi',
  'giup co',
  'giup con',
  'cho chu',
  'cho bac',
  'cho toi',
  'cho co',
  'cho con',
  'dum chu',
  'dum toi',
  'ho chu',
  'ho toi',
  'cua chu',
  'cua toi',
  'cua bac',
  'nhe con',
  'nhe',
  'nha con',
  'nha',
  'a con',
  'a',
  'di con',
  'di',
  'voi con',
  'voi',
  'luon nhe',
  'luon di',
  'luon',
];

/**
 * Extract semantic reminder target text from query
 */
export function extractReminderTargetKeyword(rawText: string): string {
  const text = rawText.trim();
  const unaccented = stripVietnameseAccents(normalizeVietnameseText(text)).toLowerCase();

  // Try to remove action prefixes
  let strippedUnaccented = unaccented;
  for (const prefix of REMINDER_ACTION_PREFIXES) {
    if (strippedUnaccented.startsWith(prefix)) {
      strippedUnaccented = strippedUnaccented.slice(prefix.length).trim();
      break;
    }
  }

  // Remove filler honorifics in a loop until clean
  let changed = true;
  while (changed) {
    changed = false;
    for (const filler of FILLER_HONORIFICS) {
      if (strippedUnaccented.endsWith(filler)) {
        strippedUnaccented = strippedUnaccented.slice(0, -filler.length).trim();
        changed = true;
      }
      if (strippedUnaccented.startsWith(filler)) {
        strippedUnaccented = strippedUnaccented.slice(filler.length).trim();
        changed = true;
      }
    }
  }

  // Remove general nouns like "nhac nho", "lich nhac", "lich" if left at the beginning
  strippedUnaccented = strippedUnaccented.replace(/^(nhac nho|lich nhac|lich hen|lich|bao thuc)\s+/i, '').trim();

  return strippedUnaccented;
}

/**
 * Extract snooze duration preset from Vietnamese query text
 */
export function extractSnoozePreset(
  rawText: string,
  extractedSlots?: Record<string, string>
): { preset: '10m' | '30m' | '1h' | 'tonight' | 'tomorrow'; label: string } {
  const norm = stripVietnameseAccents(normalizeVietnameseText(rawText)).toLowerCase();

  // 1. Check slots if present
  const durationSlot = extractedSlots?.duration || extractedSlots?.time;
  const slotNorm = durationSlot ? stripVietnameseAccents(normalizeVietnameseText(durationSlot)).toLowerCase() : '';

  const textToCheck = `${norm} ${slotNorm}`;

  if (textToCheck.includes('30 phut') || textToCheck.includes('nua tieng') || textToCheck.includes('nua gio') || textToCheck.includes('30m')) {
    return { preset: '30m', label: '30 phút' };
  }

  if (textToCheck.includes('1 tieng') || textToCheck.includes('1 gio') || textToCheck.includes('mot tieng') || textToCheck.includes('mot gio') || textToCheck.includes('1h') || textToCheck.includes('60 phut')) {
    return { preset: '1h', label: '1 tiếng' };
  }

  if (textToCheck.includes('toi nay') || textToCheck.includes('chieu toi') || textToCheck.includes('toi')) {
    return { preset: 'tonight', label: 'tối nay' };
  }

  if (textToCheck.includes('ngay mai') || textToCheck.includes('mai') || textToCheck.includes('bua mai')) {
    return { preset: 'tomorrow', label: 'ngày mai' };
  }

  if (textToCheck.includes('10 phut') || textToCheck.includes('10m')) {
    return { preset: '10m', label: '10 phút' };
  }

  // Default
  return { preset: '10m', label: '10 phút' };
}

/**
 * Resolve target reminder from reminders list
 */
export function resolveReminderTarget(
  rawText: string,
  extractedSlots?: Record<string, string>,
  existingReminders?: Reminder[]
): ResolvedReminderTarget {
  const reminders = existingReminders || reminderService.getReminders();
  const activeReminders = reminders.filter((r) => r.status === 'active');

  const slotTitle = extractedSlots?.title || extractedSlots?.target;
  const targetKeyword = slotTitle ? slotTitle.trim() : extractReminderTargetKeyword(rawText);

  if (targetKeyword) {
    const normTarget = stripVietnameseAccents(normalizeVietnameseText(targetKeyword)).toLowerCase();

    // 1. Exact match
    const exactMatches = activeReminders.filter(
      (r) => stripVietnameseAccents(normalizeVietnameseText(r.title)).toLowerCase() === normTarget
    );
    if (exactMatches.length === 1) {
      return {
        targetText: targetKeyword,
        reminderId: exactMatches[0].id,
        title: exactMatches[0].title,
        matchedReminder: exactMatches[0],
      };
    }

    // 2. Substring match (either candidate in title, or title in candidate)
    const substringMatches = activeReminders.filter((r) => {
      const normTitle = stripVietnameseAccents(normalizeVietnameseText(r.title)).toLowerCase();
      return normTitle.includes(normTarget) || normTarget.includes(normTitle);
    });

    if (substringMatches.length === 1) {
      return {
        targetText: targetKeyword,
        reminderId: substringMatches[0].id,
        title: substringMatches[0].title,
        matchedReminder: substringMatches[0],
      };
    }

    if (substringMatches.length > 1) {
      return {
        targetText: targetKeyword,
        candidates: substringMatches,
        isAmbiguous: true,
        errorReason: `Có ${substringMatches.length} lịch nhắc liên quan đến "${targetKeyword}". Chú muốn thao tác với lịch nhắc nào cụ thể ạ?`,
      };
    }

    // No direct match in active reminders, but we extracted the keyword
    return {
      targetText: targetKeyword,
      title: targetKeyword,
    };
  }

  // No specific target text provided in query
  if (activeReminders.length === 1) {
    return {
      reminderId: activeReminders[0].id,
      title: activeReminders[0].title,
      matchedReminder: activeReminders[0],
    };
  }

  if (activeReminders.length > 1) {
    return {
      candidates: activeReminders,
      isAmbiguous: true,
      errorReason: 'Dạ chú muốn thực hiện với nhắc nhở nào cụ thể ạ?',
    };
  }

  return {
    errorReason: 'Hiện không có nhắc nhở nào đang hoạt động ạ.',
  };
}
