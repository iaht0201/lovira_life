import { PendingInteraction } from './interactionTypes.js';
import { AppAction } from './appActionTypes.js';
import { AgentAction } from '../../types.js';
import { parseClarifiedTime } from '../../utils/dateTimeResolver.js';
import { fetchCurrentWeatherReport } from '../weatherService.js';
import { reminderService } from '../reminderService.js';
import { normalizeVietnameseText, stripVietnameseAccents } from './VietnameseNormalizer.js';
import { extractSnoozePreset, extractReminderTargetKeyword } from '../localBrain/ReminderTargetResolver.js';

const STRICT_AFFIRMATIVE_REGEX =
  /^(có|ừ|uh|u|ok|oke|okie|được|tạo đi|tạo giúp|tạo luôn|đồng ý|nhất trí|tạo giúp chú|tạo giúp bác|tạo giúp tôi|tạo giúp cô|làm đi|tiến hành đi|mở đi|mở giúp|xóa đi|xóa giúp|xóa luôn|chắc chắn|đồng ý xóa|ừ xóa đi|ok xóa|hoàn thành đi|kết thúc đi|đúng rồi|chính xác)$/i;

const STRICT_NEGATIVE_REGEX =
  /^(không|thôi|hủy|khỏi|không cần|thôi khỏi|bỏ qua|đừng|không tạo|không xóa|đừng xóa|giữ lại|thôi nha|thôi đừng|chưa|chưa đâu|chưa hoàn thành|không hoàn thành|chưa kết thúc|không kết thúc|ko|k|thôi không xóa|không đồng ý)$/i;

export function isNegativeResponse(text: string): boolean {
  const raw = text.trim();
  const norm = stripVietnameseAccents(normalizeVietnameseText(raw)).toLowerCase();

  if (STRICT_NEGATIVE_REGEX.test(raw) || STRICT_NEGATIVE_REGEX.test(norm)) {
    return true;
  }

  if (
    norm.startsWith('khong ') ||
    norm.startsWith('thoi ') ||
    norm.startsWith('dung ') ||
    norm.startsWith('chua ') ||
    norm.startsWith('huy ') ||
    norm.startsWith('ko ') ||
    norm.startsWith('k ') ||
    norm === 'ko' ||
    norm === 'k' ||
    norm.includes('khong xoa') ||
    norm.includes('dung xoa') ||
    norm.includes('thoi khong') ||
    norm.includes('chua xoa') ||
    norm.includes('chua hoan thanh') ||
    norm.includes('khong hoan thanh') ||
    norm.includes('khong ket thuc') ||
    norm.includes('chua ket thuc') ||
    norm.includes('khong dong y')
  ) {
    return true;
  }

  return false;
}

export function isAffirmativeResponse(text: string): boolean {
  const raw = text.trim();
  const norm = stripVietnameseAccents(normalizeVietnameseText(raw)).toLowerCase();

  // If it's negative, it can NEVER be affirmative
  if (isNegativeResponse(text)) {
    return false;
  }

  if (STRICT_AFFIRMATIVE_REGEX.test(raw) || STRICT_AFFIRMATIVE_REGEX.test(norm)) {
    return true;
  }

  const AFFIRMATIVE_PHRASES = [
    'dong y',
    'dong y xoa',
    'xoa di',
    'xoa giup',
    'xoa luon',
    'ok xoa',
    'u xoa di',
    'chac chan',
    'hoan thanh di',
    'ket thuc di',
    'dung roi',
    'chinh xac',
    'tien hanh di',
    'lam di',
    'tao di',
    'tao giup',
    'tao luon',
  ];

  return AFFIRMATIVE_PHRASES.some((phrase) => norm === phrase || norm.startsWith(phrase + ' '));
}

export interface PendingResolution {
  resolved: boolean;
  appAction?: AppAction;
  agentActions?: AgentAction[];
  reply?: string;
  clearPending: boolean;
  newPending?: PendingInteraction;
}

export async function resolvePendingInteraction(
  userText: string,
  pending: PendingInteraction | null,
  opts?: { addressing?: string; me?: string; da?: string }
): Promise<PendingResolution> {
  if (!pending) {
    return { resolved: false, clearPending: false };
  }

  // Check expiry (e.g. valid within 3 minutes)
  const isExpired = pending.expiresAt && Date.now() > pending.expiresAt;
  if (isExpired) {
    return { resolved: false, clearPending: true };
  }

  const trimmed = userText.trim();

  if (pending.type === 'create_session') {
    // 1. Negative first
    if (isNegativeResponse(trimmed)) {
      return {
        resolved: true,
        reply: 'Dạ vâng, khi nào cần hỗ trợ việc gì bạn cứ nói với Lovira nhé!',
        clearPending: true,
      };
    }

    // 2. Strict affirmative second
    if (isAffirmativeResponse(trimmed)) {
      return {
        resolved: true,
        appAction: {
          type: 'CREATE_SESSION',
          payload: { goal: pending.data.goal },
        },
        reply: `Dạ, con tạo phiên hỗ trợ "${pending.data.goal}" cho bạn ngay bây giờ nhé!`,
        clearPending: true,
      };
    }
  }

  if (pending.type === 'confirm_action') {
    // 1. NEGATIVE FIRST (Safeguards "không xóa", "chưa hoàn thành", "không kết thúc")
    if (isNegativeResponse(trimmed)) {
      return {
        resolved: true,
        reply: pending.data.cancelReply || 'Dạ vâng, con đã giữ nguyên cho chú rồi ạ.',
        clearPending: true,
      };
    }

    // 2. STRICT AFFIRMATIVE SECOND (Only explicit affirmative phrases)
    if (isAffirmativeResponse(trimmed)) {
      const appAction: AppAction | undefined = pending.data.action;
      const agentActions: AgentAction[] | undefined =
        pending.data.agentActions || (pending.data.payload?.agentActions as AgentAction[]);
      return {
        resolved: true,
        appAction,
        agentActions,
        reply: pending.data.successReply || 'Dạ vâng, con đã thực hiện thao tác rồi ạ!',
        clearPending: true,
      };
    }
  }

  if (pending.type === 'clarification') {
    // 1. Negative first
    if (isNegativeResponse(trimmed)) {
      return {
        resolved: true,
        reply: 'Dạ vâng, con đã hủy rồi ạ.',
        clearPending: true,
      };
    }

    // 2. Action-specific resolvers FIRST

    // Weather clarification
    if (pending.data.actionType === 'GET_WEATHER') {
      const origQuery = pending.data.payload?.originalQuery || '';
      const combinedText = origQuery ? `${origQuery} ${trimmed}` : trimmed;
      const weatherResult = await fetchCurrentWeatherReport({
        rawText: combinedText,
        addressing: opts?.addressing,
        me: opts?.me,
        da: opts?.da,
      });

      if (weatherResult.needsClarification) {
        return {
          resolved: true,
          reply: weatherResult.reply,
          clearPending: false,
        };
      }

      return {
        resolved: true,
        reply: weatherResult.reply,
        clearPending: true,
      };
    }

    // Reminder CRUD operations clarification (when ambiguous candidates exist)
    const op = pending.data.actionType || pending.data.payload?.operation;
    if (op === 'DELETE_REMINDER' || op === 'SNOOZE_REMINDER' || op === 'COMPLETE_REMINDER' || op === 'UPDATE_REMINDER') {
      const rawCandidates = pending.data.payload?.candidates || pending.data.candidates || [];
      const candidateList: Array<{ id?: string; title: string }> = rawCandidates.map((c: any) =>
        typeof c === 'string' ? { title: c } : { id: c.id, title: c.title }
      );

      const normInput = stripVietnameseAccents(normalizeVietnameseText(trimmed)).toLowerCase();
      let matchedCandidate: { id?: string; title: string } | undefined;

      // 1. Check numeric / ordinal selection
      const numMatch = normInput.match(/(?:cai\s+thu|so|thu|cai)?\s*(\d+)/i);
      if (numMatch && numMatch[1]) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (idx >= 0 && idx < candidateList.length) {
          matchedCandidate = candidateList[idx];
        }
      } else if (normInput.includes('dau tien') || normInput.includes('thu nhat') || normInput === '1') {
        if (candidateList.length > 0) matchedCandidate = candidateList[0];
      } else if (normInput.includes('thu hai') || normInput.includes('thu 2') || normInput === '2') {
        if (candidateList.length > 1) matchedCandidate = candidateList[1];
      } else if (normInput.includes('thu ba') || normInput.includes('thu 3') || normInput === '3') {
        if (candidateList.length > 2) matchedCandidate = candidateList[2];
      }

      // 2. Check title / keyword match against candidate list
      if (!matchedCandidate) {
        const cleanInput = extractReminderTargetKeyword(trimmed);
        const normClean = stripVietnameseAccents(normalizeVietnameseText(cleanInput)).toLowerCase();

        for (const cand of candidateList) {
          const candNorm = stripVietnameseAccents(normalizeVietnameseText(cand.title)).toLowerCase();
          const candClean = stripVietnameseAccents(normalizeVietnameseText(extractReminderTargetKeyword(cand.title))).toLowerCase();
          if (
            candNorm === normInput ||
            candNorm.includes(normInput) ||
            normInput.includes(candNorm) ||
            (normClean && (candNorm.includes(normClean) || candClean.includes(normClean) || normClean.includes(candClean)))
          ) {
            matchedCandidate = cand;
            break;
          }
        }
      }

      // 3. Fallback: check active reminders in reminderService
      if (!matchedCandidate && candidateList.length > 0) {
        const activeReminders = reminderService.getReminders().filter((r) => r.status === 'active');
        const cleanInput = extractReminderTargetKeyword(trimmed);
        const normClean = stripVietnameseAccents(normalizeVietnameseText(cleanInput)).toLowerCase();

        for (const rem of activeReminders) {
          const remNorm = stripVietnameseAccents(normalizeVietnameseText(rem.title)).toLowerCase();
          const remClean = stripVietnameseAccents(normalizeVietnameseText(extractReminderTargetKeyword(rem.title))).toLowerCase();
          if (
            remNorm === normInput ||
            remNorm.includes(normInput) ||
            normInput.includes(remNorm) ||
            (normClean && (remNorm.includes(normClean) || remClean.includes(normClean) || normClean.includes(remClean)))
          ) {
            matchedCandidate = { id: rem.id, title: rem.title };
            break;
          }
        }
      }

      if (matchedCandidate) {
        const remTitle = matchedCandidate.title;
        const reminderId = matchedCandidate.id;

        if (op === 'DELETE_REMINDER') {
          // P0 SAFETY: Ambiguity selection resolved the target, but user must still confirm deletion!
          const confirmPrompt = `Chú có chắc muốn xóa lịch nhắc "${remTitle}" không ạ?`;
          return {
            resolved: true,
            reply: confirmPrompt,
            clearPending: false,
            newPending: {
              type: 'confirm_action',
              data: {
                action: {
                  type: 'DELETE_REMINDER',
                  payload: { reminderId, title: remTitle, skipConfirmation: true },
                },
                intentId: 'reminder.delete',
                payload: { reminderId, title: remTitle, skipConfirmation: true },
                question: confirmPrompt,
                successReply: `Dạ vâng, con đã xóa lịch nhắc "${remTitle}" cho chú rồi ạ.`,
                cancelReply: `Dạ vâng, con giữ nguyên lịch nhắc "${remTitle}" cho chú nhé ạ.`,
                suggestedReplies: ['Đồng ý xóa', 'Thôi không xóa'],
              },
              createdAt: new Date().toISOString(),
              expiresAt: Date.now() + 180000,
            },
          };
        }

        if (op === 'SNOOZE_REMINDER') {
          const inheritedPreset = pending.data.payload?.snoozePreset || '10m';
          const inheritedLabel = pending.data.payload?.snoozeLabel || '10 phút';
          const querySnooze = extractSnoozePreset(trimmed);
          const finalPreset = querySnooze.preset !== '10m' ? querySnooze.preset : inheritedPreset;
          const finalLabel = querySnooze.preset !== '10m' ? querySnooze.label : inheritedLabel;

          return {
            resolved: true,
            appAction: {
              type: 'SNOOZE_REMINDER',
              payload: { reminderId, title: remTitle, snoozePreset: finalPreset },
            },
            reply: `Dạ, con đã hoãn lịch nhắc "${remTitle}" ${finalLabel === '10 phút' || finalLabel === '30 phút' || finalLabel === '1 tiếng' ? `thêm ${finalLabel}` : `sang ${finalLabel}`} cho chú rồi ạ.`,
            clearPending: true,
          };
        }

        if (op === 'COMPLETE_REMINDER') {
          return {
            resolved: true,
            appAction: {
              type: 'COMPLETE_REMINDER',
              payload: { reminderId, title: remTitle },
            },
            reply: `Dạ, con đã đánh dấu hoàn thành lịch nhắc "${remTitle}" rồi ạ.`,
            clearPending: true,
          };
        }

        if (op === 'UPDATE_REMINDER') {
          // Stage 2: Prompt for new time with selected reminder
          const promptQuestion = `Dạ, chú muốn đổi lịch nhắc "${remTitle}" sang lúc mấy giờ ạ?`;
          return {
            resolved: true,
            reply: promptQuestion,
            clearPending: false,
            newPending: {
              type: 'clarification',
              data: {
                actionType: 'UPDATE_REMINDER',
                payload: {
                  reminderId,
                  title: remTitle,
                },
                question: promptQuestion,
                suggestedReplies: ['7 giờ sáng', '8 giờ tối', 'ngày mai 9 giờ'],
              },
              createdAt: new Date().toISOString(),
              expiresAt: Date.now() + 180000,
            },
          };
        }
      }
    }

    if (pending.data.actionType === 'UPDATE_REMINDER') {
      const targetDateStr = pending.data.payload?.targetDateStr;
      const resolvedDate = parseClarifiedTime(trimmed, targetDateStr);
      if (resolvedDate && !isNaN(resolvedDate.getTime())) {
        const reminderId = pending.data.payload?.reminderId;
        const title = pending.data.payload?.title || 'Nhắc nhở';
        const scheduledAt = resolvedDate.toISOString();
        const timeFormatted = resolvedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = resolvedDate.toLocaleDateString('vi-VN');

        return {
          resolved: true,
          appAction: {
            type: 'UPDATE_REMINDER',
            payload: {
              reminderId,
              title,
              scheduledAt,
            },
          },
          reply: `Dạ, con đã cập nhật lịch nhắc "${title}" sang lúc ${timeFormatted} (${dateFormatted}) rồi ạ.`,
          clearPending: true,
        };
      }
    }

    if (pending.data.actionType === 'CREATE_REMINDER') {
      const targetDateStr = pending.data.payload?.targetDateStr;
      const resolvedDate = parseClarifiedTime(trimmed, targetDateStr);

      if (resolvedDate && !isNaN(resolvedDate.getTime())) {
        const title = pending.data.payload?.title || 'Nhắc nhở';
        const scheduledAt = resolvedDate.toISOString();
        const category = pending.data.payload?.category || 'general';
        const repeat = pending.data.payload?.repeat || 'once';
        const priority = pending.data.payload?.priority || 'normal';
        const sessionId = pending.data.payload?.sessionId;

        const timeFormatted = resolvedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = resolvedDate.toLocaleDateString('vi-VN');

        return {
          resolved: true,
          appAction: {
            type: 'CREATE_REMINDER',
            payload: {
              title,
              scheduledAt,
              category,
              repeat,
              priority,
              sessionId,
            },
          },
          reply: `Dạ, con đã lên lịch nhắc nhở "${title}" vào lúc ${timeFormatted} (${dateFormatted}) rồi ạ.`,
          clearPending: true,
        };
      } else {
        // If user gave an unclear time response, retain pending clarification and ask again nicely
        return {
          resolved: true,
          reply: "Dạ, con chưa nghe rõ giờ. Chú có thể nói ví dụ '7 giờ 30 sáng' giúp con nhé.",
          clearPending: false,
        };
      }
    }

    // 3. Generic navigation fallback ONLY if no specific pending action/operation was set
    if (!pending.data.actionType && !pending.data.payload?.operation) {
      const norm = trimmed.toLowerCase();
      if (norm.includes('camera') || norm.includes('máy ảnh') || norm.includes('chụp')) {
        return {
          resolved: true,
          appAction: { type: 'OPEN_CAMERA' },
          reply: 'Dạ, con mở camera cho chú ngay đây ạ!',
          clearPending: true,
        };
      }
      if (norm.includes('nhắc nhở') || norm.includes('lịch hẹn') || norm.includes('lịch')) {
        return {
          resolved: true,
          appAction: { type: 'OPEN_REMINDERS' },
          reply: 'Dạ, con mở trang lịch nhắc nhở cho chú đây ạ!',
          clearPending: true,
        };
      }
      if (norm.includes('trang chủ') || norm.includes('về nhà') || norm.includes('màn hình chính')) {
        return {
          resolved: true,
          appAction: { type: 'GO_HOME' },
          reply: 'Dạ, con đưa chú về trang chủ ạ!',
          clearPending: true,
        };
      }
    }
  }

  return { resolved: false, clearPending: false };
}
