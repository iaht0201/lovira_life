import { PendingInteraction } from './interactionTypes.js';
import { AppAction } from './appActionTypes.js';
import { AgentAction } from '../../types.js';
import {
  parseClarifiedTime,
  extractSpecificGoal,
  formatActionVerbDisplay,
  extractDateFromText,
  extractTimeFromText,
  extractLeadTimeFromText,
} from '../../utils/dateTimeResolver.js';
import { fetchCurrentWeatherReport } from '../weatherService.js';
import { reminderService } from '../reminderService.js';
import { normalizeVietnameseText, stripVietnameseAccents } from './VietnameseNormalizer.js';
import { extractSnoozePreset, extractReminderTargetKeyword } from '../localBrain/ReminderTargetResolver.js';

const STRICT_AFFIRMATIVE_REGEX =
  /^(có|co|ừ|u|um|ừm|ừ nè|u ne|ờ|o|uh|ok|oke|okie|dạ có|da co|dạ được|da duoc|dạ vâng|da vang|được|duoc|được chứ|duoc chu|được nha|duoc nha|tạo đi|tao di|tạo giúp|tao giup|tạo luôn|tao luon|đồng ý|dong y|đồng ý nha|dong y nha|nhất trí|nhat tri|tạo giúp chú|tạo giúp bác|tạo giúp tôi|tạo giúp cô|tạo giúp anh|tạo giúp chị|làm đi|lam di|làm luôn|lam luon|tiến hành đi|tien hanh di|triển luôn|trien luon|mở đi|mo di|mở giúp|mo giup|xóa đi|xoa di|xóa giúp|xoa giup|xóa luôn|xoa luon|xóa luôn đi|xoa luon di|chắc chắn|chac chan|chắc cú|chac cu|đồng ý xóa|dong y xoa|ừ xóa đi|u xoa di|ok xóa|ok xoa|hoàn thành đi|hoan thanh di|kết thúc đi|ket thuc di|đúng rồi|dung roi|đúng rùi|dung rui|chuẩn|chuan|chính xác|chinh xac)$/i;

const STRICT_NEGATIVE_REGEX =
  /^(không|thôi|hủy|hủy bỏ|hủy kèo|khỏi|không cần|thôi khỏi|bỏ qua|đừng|đừng làm|không tạo|không xóa|đừng xóa|khỏi xóa|giữ lại|giữ lại giúp|thôi nha|thôi nghen|thôi đừng|chưa|chưa đâu|chưa muốn|chưa hoàn thành|không hoàn thành|chưa kết thúc|không kết thúc|ko|k|thôi không xóa|không đồng ý|hổng phải|hổng cần|hổng muốn)$/i;

export function isNegativeResponse(text: string): boolean {
  const raw = text.trim();
  const norm = stripVietnameseAccents(normalizeVietnameseText(raw)).toLowerCase();

  if (STRICT_NEGATIVE_REGEX.test(raw) || STRICT_NEGATIVE_REGEX.test(norm)) {
    return true;
  }

  if (
    norm.startsWith('khong ') ||
    norm.startsWith('thoi ') ||
    (norm.startsWith('dung ') && !raw.toLowerCase().startsWith('đúng') && !norm.startsWith('dung roi') && !norm.startsWith('dung rui') && !norm.startsWith('dung v') && !norm.startsWith('dung th')) ||
    norm.startsWith('chua ') ||
    norm.startsWith('huy ') ||
    norm.startsWith('ko ') ||
    norm.startsWith('k ') ||
    norm.startsWith('hong ') ||
    norm === 'ko' ||
    norm === 'k' ||
    norm === 'hong' ||
    norm.includes('khong xoa') ||
    norm.includes('dung xoa') ||
    norm.includes('thoi khong') ||
    norm.includes('chua xoa') ||
    norm.includes('chua hoan thanh') ||
    norm.includes('khong hoan thanh') ||
    norm.includes('khong ket thuc') ||
    norm.includes('chua ket thuc') ||
    norm.includes('khong dong y') ||
    norm.includes('huy bo') ||
    norm.includes('huy keo') ||
    norm.includes('khoi xoa') ||
    norm.includes('giu lai')
  ) {
    return true;
  }

  return false;
}

export function isAffirmativeResponse(text: string): boolean {
  if (!text || !text.trim()) return false;

  const raw = text.trim();
  const nfc = raw.normalize('NFC').toLowerCase();
  const norm = stripVietnameseAccents(normalizeVietnameseText(raw)).toLowerCase();
  const unaccentedRaw = stripVietnameseAccents(nfc);

  // If it's negative, it can NEVER be affirmative
  if (isNegativeResponse(text)) {
    return false;
  }

  if (
    STRICT_AFFIRMATIVE_REGEX.test(raw) ||
    STRICT_AFFIRMATIVE_REGEX.test(nfc) ||
    STRICT_AFFIRMATIVE_REGEX.test(norm) ||
    STRICT_AFFIRMATIVE_REGEX.test(unaccentedRaw)
  ) {
    return true;
  }

  const AFFIRMATIVE_PHRASES = [
    'dong y',
    'dong y nha',
    'dong y xoa',
    'xoa di',
    'xoa giup',
    'xoa luon',
    'xoa luon di',
    'ok xoa',
    'u xoa di',
    'chac chan',
    'chac cu',
    'hoan thanh di',
    'ket thuc di',
    'dung roi',
    'chinh xac',
    'chuan',
    'tien hanh di',
    'trien luon',
    'lam di',
    'lam luon',
    'tao di',
    'tao giup',
    'tao luon',
    'da co',
    'da duoc',
    'da vang',
    'duoc chu',
    'duoc nha',
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

  const addressing = opts?.addressing || 'bạn';
  const me = opts?.me || (addressing === 'bạn' ? 'Lovira' : 'con');
  const da = opts?.da || 'Dạ';
  const a = addressing !== 'bạn' ? ' ạ' : '';

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
        reply: `${da} vâng, khi nào cần hỗ trợ việc gì ${addressing} cứ nói với ${me} nhé!`,
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
        reply: `${da}, ${me} tạo phiên hỗ trợ "${pending.data.goal}" cho ${addressing} ngay bây giờ nhé!`,
        clearPending: true,
      };
    }
  }

  if (pending.type === 'confirm_action') {
    // 1. NEGATIVE FIRST (Safeguards "không xóa", "chưa hoàn thành", "không kết thúc")
    if (isNegativeResponse(trimmed)) {
      return {
        resolved: true,
        reply: pending.data.cancelReply || `${da} vâng, ${me} đã giữ nguyên cho ${addressing} rồi${a}.`,
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
        reply: pending.data.successReply || `${da} vâng, ${me} đã thực hiện thao tác cho ${addressing} rồi${a}!`,
        clearPending: true,
      };
    }
  }

  if (pending.type === 'clarification') {
    // 1. Negative first
    if (isNegativeResponse(trimmed)) {
      return {
        resolved: true,
        reply: `${da} vâng, ${me} đã hủy rồi${a}.`,
        clearPending: true,
      };
    }

    // 2. Action-specific resolvers FIRST

    // Life Event Reminder multi-step clarification
    if (pending.data.actionType === 'CLARIFY_LIFE_EVENT_REMINDER') {
      const payload = pending.data.payload || {};
      const proposedGoal = payload.proposedGoal || 'Công việc này';

      if (isNegativeResponse(trimmed)) {
        return {
          resolved: true,
          reply: `${da} vâng, khi nào cần hỗ trợ ${addressing} cứ nói với ${me} nhé!`,
          clearPending: true,
        };
      }

      const inputDate = extractDateFromText(trimmed);
      const inputTime = extractTimeFromText(trimmed);
      const inputLead = extractLeadTimeFromText(trimmed);

      const hasDate = Boolean(payload.hasDate || inputDate.hasDate);
      const dateLabel = inputDate.hasDate ? inputDate.dateLabel : (payload.dateLabel || 'ngày mai');
      const dateIso = inputDate.hasDate ? inputDate.dateObj.toISOString() : payload.dateIso;

      const hasEventTime = Boolean(payload.hasEventTime || inputTime.hasTime);
      const eventTimeStr = inputTime.hasTime ? inputTime.timeStr : (payload.eventTimeStr || '');
      const eventHour = inputTime.hasTime ? inputTime.hour : (payload.eventHour ?? null);
      const eventMinute = inputTime.hasTime ? inputTime.minute : (payload.eventMinute || 0);

      const hasLeadTime = Boolean(payload.hasLeadTime || inputLead.hasLeadTime);
      const leadMinutes = inputLead.hasLeadTime ? inputLead.leadMinutes : (payload.leadMinutes ?? 0);

      const updatedState = {
        proposedGoal,
        hasDate,
        dateLabel,
        dateIso,
        hasEventTime,
        eventTimeStr,
        eventHour,
        eventMinute,
        hasLeadTime,
        leadMinutes,
        scenarioFamily: payload.scenarioFamily,
      };

      // Helper to evaluate steps
      return evaluateLifeEventReminderStep(updatedState, addressing, me, da, a);
    }

    // Support choice clarification (Life Event support mode selection)
    if (pending.data.actionType === 'CHOOSE_SUPPORT_MODE' || pending.data.actionType === 'support_choice') {
      const normInput = stripVietnameseAccents(normalizeVietnameseText(trimmed)).toLowerCase();
      const payload = pending.data.payload || {};
      const proposedGoal = payload.proposedGoal || payload.originalText || 'Công việc này';
      const scenarioFamily = payload.scenarioFamily || 'general';

      // Negative response
      if (isNegativeResponse(trimmed)) {
        return {
          resolved: true,
          reply: `${da} vâng, khi nào cần hỗ trợ ${addressing} cứ nói với ${me} nhé!`,
          clearPending: true,
        };
      }

      // Check if user chose Reminder (or mentioned reminder keywords)
      if (normInput.includes('nhac nho') || normInput.includes('nhac') || normInput.includes('lich hen')) {
        const inputDate = extractDateFromText(trimmed);
        const inputTime = extractTimeFromText(trimmed);
        const inputLead = extractLeadTimeFromText(trimmed);

        const hasDate = Boolean(payload.hasDate || inputDate.hasDate);
        const dateLabel = inputDate.hasDate ? inputDate.dateLabel : (payload.dateLabel || '');
        const dateIso = inputDate.hasDate ? inputDate.dateObj.toISOString() : payload.dateIso;

        const hasEventTime = Boolean(payload.hasEventTime || inputTime.hasTime);
        const eventTimeStr = inputTime.hasTime ? inputTime.timeStr : (payload.eventTimeStr || '');
        const eventHour = inputTime.hasTime ? inputTime.hour : (payload.eventHour ?? null);
        const eventMinute = inputTime.hasTime ? inputTime.minute : (payload.eventMinute || 0);

        const hasLeadTime = Boolean(payload.hasLeadTime || inputLead.hasLeadTime);
        const leadMinutes = inputLead.hasLeadTime ? inputLead.leadMinutes : (payload.leadMinutes ?? 0);

        const state = {
          proposedGoal,
          hasDate,
          dateLabel,
          dateIso,
          hasEventTime,
          eventTimeStr,
          eventHour,
          eventMinute,
          hasLeadTime,
          leadMinutes,
          scenarioFamily,
        };

        return evaluateLifeEventReminderStep(state, addressing, me, da, a);
      }

      // Otherwise, assume user chose Step-by-Step Support -> Ask for explicit confirmation to create session
      const confirmPrompt = `${da}, ${me} sẽ tạo một mục hỗ trợ "${proposedGoal}" để cùng ${addressing} chuẩn bị và thực hiện từng bước. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} đồng ý tạo chứ ạ?`;
      return {
        resolved: true,
        reply: confirmPrompt,
        clearPending: false,
        newPending: {
          type: 'confirm_action',
          data: {
            action: {
              type: 'CREATE_SESSION',
              payload: {
                goal: proposedGoal,
                sessionTitle: proposedGoal,
                scenarioKey: scenarioFamily,
                creationMode: 'template',
                appConfirmed: true,
                skipConfirmation: true,
              },
            },
            actionType: 'CREATE_SESSION',
            payload: {
              goal: proposedGoal,
              scenarioKey: scenarioFamily,
              appConfirmed: true,
              skipConfirmation: true,
            },
            question: confirmPrompt,
            successReply: `${da}, ${me} tạo ngay mục hỗ trợ "${proposedGoal}" cho ${addressing} đây ạ!`,
            cancelReply: `${da} vâng, khi nào cần hỗ trợ ${addressing} cứ nói với ${me} nhé!`,
            suggestedReplies: ['Đồng ý', 'Không cần'],
          },
          createdAt: new Date().toISOString(),
          expiresAt: Date.now() + 180000,
        },
      };
    }

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
                successReply: `${da} vâng, ${me} đã xóa lịch nhắc "${remTitle}" cho ${addressing} rồi${a}.`,
                cancelReply: `${da} vâng, ${me} giữ nguyên lịch nhắc "${remTitle}" cho ${addressing} nhé${a}.`,
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
            reply: `${da}, ${me} đã hoãn lịch nhắc "${remTitle}" ${finalLabel === '10 phút' || finalLabel === '15 phút' || finalLabel === '30 phút' || finalLabel === '1 tiếng' ? `thêm ${finalLabel}` : `sang ${finalLabel}`} cho ${addressing} rồi${a}.`,
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
            reply: `${da}, ${me} đã đánh dấu hoàn thành lịch nhắc "${remTitle}" rồi${a}.`,
            clearPending: true,
          };
        }

        if (op === 'UPDATE_REMINDER') {
          // Stage 2: Prompt for new time with selected reminder
          const promptQuestion = `${da}, ${addressing} muốn đổi lịch nhắc "${remTitle}" sang lúc mấy giờ${a}?`;
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
          reply: `${da}, ${me} đã cập nhật lịch nhắc "${title}" sang lúc ${timeFormatted} (${dateFormatted}) rồi${a}.`,
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
          reply: `${da}, ${me} đã lên lịch nhắc nhở "${title}" vào lúc ${timeFormatted} (${dateFormatted}) rồi${a}.`,
          clearPending: true,
        };
      } else {
        // If user gave an unclear time response, retain pending clarification and ask again nicely
        return {
          resolved: true,
          reply: `${da}, ${me} chưa nghe rõ giờ. ${addressing} có thể nói ví dụ '7 giờ 30 sáng' giúp ${me} nhé.`,
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
          reply: `${da}, ${me} mở camera cho ${addressing} ngay đây${a}!`,
          clearPending: true,
        };
      }
      if (norm.includes('nhắc nhở') || norm.includes('lịch hẹn') || norm.includes('lịch')) {
        return {
          resolved: true,
          appAction: { type: 'OPEN_REMINDERS' },
          reply: `${da}, ${me} mở trang lịch nhắc nhở cho ${addressing} đây${a}!`,
          clearPending: true,
        };
      }
      if (norm.includes('trang chủ') || norm.includes('về nhà') || norm.includes('màn hình chính')) {
        return {
          resolved: true,
          appAction: { type: 'GO_HOME' },
          reply: `${da}, ${me} đưa ${addressing} về trang chủ${a}!`,
          clearPending: true,
        };
      }
    }
  }

  return { resolved: false, clearPending: false };
}

function evaluateLifeEventReminderStep(
  state: {
    proposedGoal: string;
    hasDate: boolean;
    dateLabel: string;
    dateIso?: string;
    hasEventTime: boolean;
    eventTimeStr: string;
    eventHour: number | null;
    eventMinute: number;
    hasLeadTime: boolean;
    leadMinutes: number;
    scenarioFamily?: string;
  },
  addressing: string,
  me: string,
  da: string,
  a: string
): PendingResolution {
  const actionVerb = formatActionVerbDisplay(state.proposedGoal);

  // Step 1: Check Date
  if (!state.hasDate) {
    const askDatePrompt = `${da}, ${addressing} ${actionVerb} vào ngày nào ạ?`;
    return {
      resolved: true,
      reply: askDatePrompt,
      clearPending: false,
      newPending: {
        type: 'clarification',
        data: {
          actionType: 'CLARIFY_LIFE_EVENT_REMINDER',
          payload: { ...state, missingStep: 'date' },
          question: askDatePrompt,
          suggestedReplies: ['Hôm nay', 'Ngày mai', 'Ngày kia'],
        },
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 180000,
      },
    };
  }

  // Step 2: Check Event Time
  if (!state.hasEventTime || state.eventHour === null) {
    const askTimePrompt = `${da}, ${state.dateLabel || 'ngày mai'} ${addressing} ${actionVerb} lúc mấy giờ ạ?`;
    return {
      resolved: true,
      reply: askTimePrompt,
      clearPending: false,
      newPending: {
        type: 'clarification',
        data: {
          actionType: 'CLARIFY_LIFE_EVENT_REMINDER',
          payload: { ...state, missingStep: 'eventTime' },
          question: askTimePrompt,
          suggestedReplies: ['7:00 sáng', '8:00 sáng', '9:00 sáng', '2:00 chiều'],
        },
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 180000,
      },
    };
  }

  // Step 3: Check Lead Time (Thời gian nhắc trước)
  if (!state.hasLeadTime) {
    const eventTimeDisplay = state.eventTimeStr || `${state.eventHour}:00`;
    const askLeadPrompt = `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} muốn ${me} nhắc đúng ${eventTimeDisplay}, hay nhắc trước để ${addressing} có thời gian chuẩn bị ạ?`;
    return {
      resolved: true,
      reply: askLeadPrompt,
      clearPending: false,
      newPending: {
        type: 'clarification',
        data: {
          actionType: 'CLARIFY_LIFE_EVENT_REMINDER',
          payload: { ...state, missingStep: 'leadTime' },
          question: askLeadPrompt,
          suggestedReplies: [
            `Đúng ${eventTimeDisplay}`,
            'Trước 15 phút',
            'Trước 30 phút',
            'Trước 1 giờ',
          ],
        },
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 180000,
      },
    };
  }

  // Step 4: ALL 3 ARE KNOWN! -> Issue CREATE_REMINDER
  const baseDate = state.dateIso ? new Date(state.dateIso) : new Date();
  const eventDateTime = new Date(baseDate.getTime());
  eventDateTime.setHours(state.eventHour, state.eventMinute, 0, 0);

  // If eventDateTime is in the past, roll forward 1 day
  if (eventDateTime.getTime() <= Date.now() && !state.dateLabel.includes('hôm nay')) {
    eventDateTime.setDate(eventDateTime.getDate() + 1);
  }

  // reminderDateTime = eventDateTime - safeLeadMinutes
  const safeLeadMinutes = Math.min(Math.max(0, state.leadMinutes || 0), 180);
  const reminderDateTime = new Date(eventDateTime.getTime() - safeLeadMinutes * 60 * 1000);

  const timeFormatted = reminderDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = reminderDateTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const dateDisplay = state.dateLabel || dateFormatted;

  const replyText = safeLeadMinutes > 0
    ? `${da}, ${me} đã tạo nhắc nhở "${state.proposedGoal}" cho ${addressing} vào lúc ${timeFormatted} ${dateDisplay} (trước ${safeLeadMinutes} phút so với giờ đi lúc ${state.eventTimeStr}) rồi${a}.`
    : `${da}, ${me} đã tạo nhắc nhở "${state.proposedGoal}" cho ${addressing} vào lúc ${state.eventTimeStr} ${dateDisplay} rồi${a}.`;

  return {
    resolved: true,
    appAction: {
      type: 'CREATE_REMINDER',
      payload: {
        title: state.proposedGoal,
        scheduledAt: reminderDateTime.toISOString(),
        eventTime: state.eventTimeStr,
        eventDate: dateDisplay,
        leadTimeMinutes: safeLeadMinutes,
        category: 'appointment',
        repeat: 'once',
        notes: safeLeadMinutes > 0 ? `Giờ đi: ${state.eventTimeStr} (Nhắc trước ${safeLeadMinutes} phút)` : `Giờ đi: ${state.eventTimeStr}`,
      },
    },
    reply: replyText,
    clearPending: true,
  };
}
