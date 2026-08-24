import {
  LifeSession,
  AgentAction,
  UserProfile,
} from '../types';
import { reminderService } from './reminderService';
import {
  findBestMatchingTask,
  resolveCurrentStep,
  calculateNextRecommendedAction,
  resolveCompletionTarget,
  resolveMultiTaskCompletionTargets,
  resolveSemanticTaskMatches,
  applyAgentActionBatch,
} from './actionEngine';
import { deduceHonorifics, formatSoftNextStepGuidance } from './conversationStyle';

export { deduceHonorifics, formatSoftNextStepGuidance };

export interface LocalIntentResult {
  reply: string;
  speech?: string;
  actions: AgentAction[];
  confidence: number;
  suggestedReplies?: string[];
}

/**
 * Pure Deterministic Command Parser for Lovira Life Copilot.
 * Strictly handles instant operational commands without intercepting natural language or advice.
 */
export function parseLocalIntent(
  text: string,
  session?: LifeSession | null,
  userProfile?: UserProfile | null
): LocalIntentResult | null {
  if (!text || !text.trim()) return null;

  const tTrimmed = text.trim();
  const tLower = tTrimmed.toLowerCase();
  const honorifics = deduceHonorifics(userProfile, text);
  const { addressing, me, praise, da, a } = honorifics;

  // 0. Query Reminders / Schedule ("Lịch nhắc của chú thế nào?", "Hôm nay chú có hẹn gì không?", "Xem lịch nhắc")
  const isReminderQuery =
    (tLower.includes('lịch nhắc') ||
      tLower.includes('nhắc nhở') ||
      tLower.includes('lịch hẹn') ||
      tLower.includes('có hẹn') ||
      tLower.includes('danh sách nhắc') ||
      tLower.includes('việc cần làm')) &&
    (tLower.includes('gì') ||
      tLower.includes('nào') ||
      tLower.includes('xem') ||
      tLower.includes('thế nào') ||
      tLower.includes('kiểm tra') ||
      tLower.includes('danh sách') ||
      tLower.includes('hôm nay') ||
      tLower.includes('sắp tới') ||
      tLower.includes('chưa'));

  if (isReminderQuery) {
    const upcoming = reminderService.getUpcomingReminders();
    if (upcoming.length === 0) {
      return {
        reply: `${da}, hiện tại ${addressing} chưa có lịch nhắc nhở hay lịch hẹn nào sắp tới ạ. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} có muốn ${me} tạo nhắc nhở mới không ạ?`,
        speech: `${da}, hiện tại ${addressing} chưa có lịch nhắc nhở nào ạ.`,
        actions: [],
        confidence: 0.95,
        suggestedReplies: ['Tạo nhắc nhở uống thuốc', 'Tạo lịch hẹn khám bệnh'],
      };
    }

    const itemsText = upcoming
      .slice(0, 4)
      .map((r) => {
        const timeStr = reminderService.formatReminderDateTime(r.scheduledAt);
        const icon = r.category === 'medication' ? '💊' : r.category === 'appointment' ? '🩺' : '🔔';
        return `• ${icon} ${r.title}: ${timeStr}`;
      })
      .join('\n');

    const reply = `${da}, đây là lịch nhắc nhở sắp tới của ${addressing} ạ:\n${itemsText}`;
    const speech = `${da}, ${addressing} có ${upcoming.length} lịch nhắc sắp tới. Đầu tiên là "${upcoming[0].title}" lúc ${reminderService.formatReminderDateTime(upcoming[0].scheduledAt)} ạ.`;

    return {
      reply,
      speech,
      actions: [],
      confidence: 0.95,
      suggestedReplies: ['Tạo nhắc nhở mới', 'Xem tất cả lịch nhắc'],
    };
  }

  if (!session) return null;

  // 1. Pause / Resume / Complete session
  if (tLower.includes('tạm dừng phiên') || tLower.includes('nghỉ tay') || tLower === 'tạm dừng') {
    return {
      reply: `${da}, ${me} đã tạm dừng phiên hỗ trợ rồi nha. Khi nào ${addressing} muốn tiếp tục, chỉ cần nhắn "tiếp tục" cho ${me} nhé${a}!`,
      actions: [{ type: 'PAUSE_SESSION', payload: {} }],
      confidence: 0.95,
      suggestedReplies: ['Tiếp tục phiên', 'Xem lại danh sách việc'],
    };
  }

  if (tLower.includes('tiếp tục phiên') || tLower === 'tiếp tục' || tLower === 'làm tiếp') {
    return {
      reply: `${da}, ${me} cùng ${addressing} tiếp tục công việc nhé${a}. Bước hiện tại là: "` + (session.nextRecommendedAction?.title || 'tiếp tục công việc') + `".`,
      actions: [{ type: 'RESUME_SESSION', payload: {} }],
      confidence: 0.95,
      suggestedReplies: ['Xong bước này rồi', 'Cần làm gì tiếp theo?'],
    };
  }

  if (tLower.includes('hoàn thành phiên') || tLower.includes('kết thúc phiên') || tLower.includes('xong cả phiên')) {
    return {
      reply: `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} chúc mừng ${addressing} đã hoàn thành xuất sắc toàn bộ phiên "${session.title}" nhé! 🎉`,
      actions: [{ type: 'COMPLETE_SESSION', payload: {} }],
      confidence: 0.95,
    };
  }

  // 1.1 Terminal Real-World Goal Outcomes (Outcome overrides workflow: "Chú ăn xong rồi", "Chú phỏng vấn xong rồi", "Máy sửa xong rồi"...)
  const isGoalOutcomePhrase = (txt: string) => {
    const tl = txt.toLowerCase().trim();
    return (
      tl.includes('ăn xong rồi') ||
      tl.includes('ăn xong rồi nhé') ||
      tl.includes('ăn xong rồi nha') ||
      tl.includes('ăn xong rồi nè') ||
      tl.includes('ăn xong rồi ạ') ||
      tl.includes('phỏng vấn xong rồi') ||
      tl.includes('phỏng vấn xong rồi nhé') ||
      tl.includes('phỏng vấn xong rồi nè') ||
      tl.includes('đậu phỏng vấn rồi') ||
      tl.includes('làm giấy tờ xong rồi') ||
      tl.includes('nộp hồ sơ xong rồi') ||
      tl.includes('làm thủ tục xong rồi') ||
      tl.includes('xong thủ tục rồi') ||
      tl.includes('xong thủ tục về') ||
      tl.includes('sửa máy xong rồi') ||
      tl.includes('máy sửa xong rồi') ||
      tl.includes('khám bệnh xong rồi') ||
      tl.includes('khám xong rồi') ||
      tl.includes('khám xong đi về') ||
      tl.includes('mua sắm xong rồi') ||
      tl.includes('mua đồ xong rồi') ||
      tl.includes('mua xong rồi') ||
      tl.includes('về đến nhà rồi') ||
      tl.includes('về tới nhà rồi') ||
      tl.includes('về nhà rồi') ||
      tl.includes('lấy thuốc về rồi') ||
      tl.includes('mua xong đem về rồi') ||
      tl.includes('lấy được hộ chiếu về')
    );
  };

  if (isGoalOutcomePhrase(text)) {
    return {
      reply: `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} chúc mừng ${addressing} đã hoàn thành xuất sắc mục tiêu "${session.title}" rồi ạ! ${me} đã đối chiếu và hoàn tất toàn bộ các công việc trong phiên. Chúc ${addressing} có những trải nghiệm thật tuyệt vời! 🎉`,
      speech: `${praise} Chúc mừng ${addressing} đã hoàn thành mục tiêu rồi ạ. ${me} rất vui được đồng hành cùng ${addressing}!`,
      actions: [{ type: 'COMPLETE_SESSION', payload: {} }],
      confidence: 0.98,
      suggestedReplies: ['Cảm ơn Lovira', 'Tạo phiên việc mới'],
    };
  }

  // 1.2 Emotional Support & Anxiety Handling (Theme 3: "Chú hơi run", "Không biết có làm được không", "Ngại quá con ơi", "Hồi hộp quá"...)
  if (
    tLower.includes('hơi run') ||
    tLower.includes('run quá') ||
    tLower.includes('hồi hộp quá') ||
    tLower.includes('ngại quá') ||
    tLower.includes('lo quá') ||
    tLower.includes('sợ không làm được') ||
    tLower.includes('sợ bị la') ||
    tLower.includes('không biết có làm được không') ||
    tLower.includes('đông người quá') ||
    tLower.includes('lần đầu đi nên') ||
    tLower.includes('lo lo trong người') ||
    tLower.includes('tim đập nhanh')
  ) {
    return {
      reply: `Dạ ${addressing}, ${addressing} cứ hít một hơi thật sâu nhen! Lần đầu ai cũng có chút hồi hộp cả, đó là hoàn toàn bình thường ạ. ${me.charAt(0).toUpperCase() + me.slice(1)} luôn ở đây đồng hành cùng ${addressing}, mọi thứ đều đã chuẩn bị sẵn sàng rồi. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} cứ tự tin và thong thả thực hiện nhé!`,
      speech: `Dạ ${addressing}, ${addressing} cứ hít thở sâu và yên tâm nhen. ${me.charAt(0).toUpperCase() + me.slice(1)} luôn ở đây đồng hành cùng ${addressing}!`,
      actions: [],
      confidence: 0.98,
      suggestedReplies: ['Cảm ơn Lovira', 'Giờ làm gì tiếp theo?'],
    };
  }

  // 2. Query Next Step ("Giờ làm gì?", "Bước tiếp theo là gì?", "Làm gì tiếp?")
  if (
    tLower.includes('giờ làm gì') ||
    tLower.includes('làm gì tiếp') ||
    tLower.includes('tiếp theo là gì') ||
    tLower.includes('bước tiếp theo') ||
    tLower.includes('tiếp theo làm gì') ||
    tLower === 'tiếp theo'
  ) {
    const nextAction = session.nextRecommendedAction;
    if (!nextAction || !nextAction.title) {
      return {
        reply: `${praise} ${addressing} đã hoàn thành tất cả các bước trong phiên "${session.title}" rồi ạ! 🎉`,
        actions: [],
        confidence: 0.95,
      };
    }

    const softGuidance = formatSoftNextStepGuidance(nextAction, honorifics, session.goal);
    return {
      reply: softGuidance,
      speech: softGuidance.replace(/\n/g, ' '),
      actions: [],
      confidence: 0.95,
      suggestedReplies: ['Xong rồi', 'Tôi tới nơi rồi', 'Cần trợ giúp bước này'],
    };
  }

  // 3. Universal "Xong rồi" / "Làm xong rồi" / "Chuẩn bị rồi" / "Hoàn thành bước này" / Specific task completions / Dialect confirmations ("rùi nè", "xong xuôi rùi nhen", "có ví rồi")
  if (
    tLower === 'xong rồi' ||
    tLower === 'xong' ||
    tLower === 'đã xong' ||
    tLower === 'hoàn thành' ||
    tLower === 'hoàn thành rồi' ||
    tLower === 'làm xong rồi' ||
    tLower.includes('chuẩn bị rồi') ||
    tLower.includes('chuẩn bị xong') ||
    tLower.includes('chuẩn bị đủ') ||
    tLower.includes('sẵn sàng rồi') ||
    tLower.includes('xong rồi nhé') ||
    tLower.includes('xong rồi nha') ||
    tLower.includes('xong xuôi') ||
    tLower.includes('có ví rồi') ||
    tLower.includes('lấy rùi') ||
    tLower.includes('đem theo rùi') ||
    tLower.includes('rùi nè') ||
    tLower.includes('rùi nhen') ||
    tLower.includes('rùi nha') ||
    tLower.includes('sẵn rồi') ||
    tLower.includes('lấy số rồi') ||
    tLower.includes('bốc số rồi') ||
    tLower.startsWith('xong rồi ') ||
    tLower.startsWith('đã làm xong') ||
    tLower.startsWith('xong bước') ||
    tLower.startsWith('hoàn thành bước') ||
    tLower.endsWith('chuẩn bị rồi') ||
    tLower.endsWith('chuẩn bị rồi nhé') ||
    tLower.endsWith('chuẩn bị rồi nha') ||
    tLower.endsWith('xong rồi') ||
    tLower.endsWith('xong rồi ạ') ||
    tLower.endsWith('xong rồi nè') ||
    tLower.endsWith('xong rồi nghen') ||
    tLower.endsWith('xong rùi nè') ||
    tLower.endsWith('xong rùi nhen')
  ) {
    // Check for multi-task completion first
    const multiResults = resolveMultiTaskCompletionTargets(session, text);

    if (multiResults.length > 0) {
      const actions: AgentAction[] = multiResults.map((res) => {
        const isSubtask = !!res.subtask;
        const taskId = res.parentTask?.id || res.task?.id || '';
        const subtaskId = res.subtask?.id;
        return {
          type: isSubtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId,
            subtaskId,
          },
        };
      });

      // Dynamically calculate new state and next step
      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      const taskNames = multiResults
        .map((r) => `"${(r.subtask || r.task)?.title}"`)
        .join(', ');

      let replyText = '';
      if (nextRec && nextRec.title && !nextRec.title.includes('Hoàn thành tất cả')) {
        const softGuidance = formatSoftNextStepGuidance(nextRec, honorifics, session.goal);
        replyText = `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} đã ghi nhận hoàn thành ${taskNames} rồi ạ.\n\n${softGuidance}`;
      } else {
        replyText = `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} đã ghi nhận xong ${taskNames}. Tất cả các công việc trong phiên "${session.title}" đã hoàn thành trọn vẹn rồi ${addressing} ơi! 🎉`;
      }

      return {
        reply: replyText,
        speech: replyText.replace(/👉/g, '').replace(/\n/g, ' '),
        actions,
        confidence: 0.95,
        suggestedReplies: ['Xong bước tiếp theo rồi', 'Tôi tới nơi rồi', 'Cần tư vấn thêm'],
      };
    }

    const compResult = resolveCompletionTarget(session, text);

    if (compResult.isAmbiguous && compResult.candidateTasks && compResult.candidateTasks.length > 1) {
      const options = compResult.candidateTasks.map((t) => `"${t.title}"`).join(' hay ');
      return {
        reply: `Dạ ${addressing}, ${addressing} vừa hoàn thành ${options} ạ? ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nói rõ để ${me} đánh dấu chính xác nhé!`,
        speech: `Dạ ${addressing}, ${addressing} vừa hoàn thành việc nào ạ?`,
        actions: [],
        confidence: 0.9,
        suggestedReplies: compResult.candidateTasks.map((t) => `Xong "${t.title}"`),
      };
    }

    const target = compResult.subtask || compResult.task;
    if (target) {
      const isSubtask = !!compResult.subtask;
      const taskId = compResult.parentTask?.id || compResult.task?.id || '';
      const subtaskId = compResult.subtask?.id;
      const actions: AgentAction[] = [
        {
          type: isSubtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId,
            subtaskId,
          },
        },
      ];

      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      let replyText = '';
      if (nextRec && nextRec.title && !nextRec.title.includes('Hoàn thành tất cả')) {
        const softGuidance = formatSoftNextStepGuidance(nextRec, honorifics, session.goal);
        replyText = `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} đã đánh dấu xong "${target.title}" rồi ạ.\n\n${softGuidance}`;
      } else {
        replyText = `${praise} Tất cả các công việc trong phiên "${session.title}" đã hoàn thành trọn vẹn rồi ${addressing} ơi! 🎉`;
      }

      return {
        reply: replyText,
        speech: replyText.replace(/👉/g, '').replace(/\n/g, ' '),
        actions,
        confidence: 0.95,
        suggestedReplies: ['Xong bước tiếp theo rồi', 'Tôi tới nơi rồi', 'Cần tư vấn thêm'],
      };
    }
  }

  // 4. Universal Arrival / Movement ("Tôi tới rồi", "Đã đến nơi", "Bác đến rồi", "Đến quầy rồi", "Tới quán rồi")
  const isArrivalStatement =
    tLower.includes('tới rồi') ||
    tLower.includes('đến rồi') ||
    tLower.includes('đến nơi') ||
    tLower.includes('đã tới') ||
    tLower.includes('đã đến') ||
    tLower.includes('đến quầy') ||
    tLower.includes('tới quầy') ||
    tLower.includes('vào quầy') ||
    tLower.includes('vào phòng') ||
    tLower.includes('sang phòng') ||
    tLower.includes('tới phòng') ||
    tLower.includes('đến cửa hàng') ||
    tLower.includes('tới cửa hàng') ||
    tLower.includes('đến ngân hàng') ||
    tLower.includes('tới ngân hàng') ||
    tLower.includes('tới quán') ||
    tLower.includes('đến quán') ||
    tLower.includes('đến bệnh viện') ||
    tLower.includes('tới bệnh viện') ||
    tLower.includes('tới nhà thuốc') ||
    tLower.includes('đến nhà thuốc') ||
    tLower.includes('tới siêu thị') ||
    tLower.includes('đến siêu thị');

  if (isArrivalStatement) {
    const isMovementTitle = (title: string) => {
      const tl = title.toLowerCase();
      return (
        tl.startsWith('đến') ||
        tl.startsWith('di chuyển') ||
        tl.startsWith('đi') ||
        tl.startsWith('tới') ||
        tl.includes('sang phòng') ||
        tl.includes('đến phòng') ||
        tl.includes('đến quầy') ||
        tl.includes('tới quầy') ||
        tl.includes('tới nơi') ||
        tl.includes('đến nơi') ||
        tl.includes('quán') ||
        tl.includes('cửa hàng') ||
        tl.includes('ngân hàng') ||
        tl.includes('bệnh viện') ||
        tl.includes('nhà thuốc') ||
        tl.includes('siêu thị')
      );
    };

    const isGenericArrival = (input: string): boolean => {
      const clean = input
        .toLowerCase()
        .trim()
        .replace(/[.!?,;~^]+$/g, '')
        .replace(/^(dạ|vâng|ừ|ok|ừm)\s*/i, '')
        .trim();

      const genericArrivalPhrases = [
        'tới rồi',
        'tới rồi nhé',
        'tới rồi nha',
        'tới rồi ạ',
        'đến rồi',
        'đến rồi nhé',
        'đến rồi nha',
        'đến rồi ạ',
        'đến nơi rồi',
        'đến nơi',
        'tới nơi rồi',
        'tới nơi',
        'đã tới nơi',
        'đã đến nơi',
        'đã tới rồi',
        'đã đến rồi',
        'đã tới',
        'đã đến',
        'bác tới rồi',
        'chú tới rồi',
        'cô tới rồi',
        'ông tới rồi',
        'bà tới rồi',
        'anh tới rồi',
        'chị tới rồi',
        'tôi tới rồi',
        'mình tới rồi',
        'con tới rồi',
        'bác đến rồi',
        'chú đến rồi',
        'cô đến rồi',
        'ông đến rồi',
        'bà đến rồi',
        'anh đến rồi',
        'chị đến rồi',
        'tôi đến rồi',
        'mình đến rồi',
        'con đến rồi',
      ];
      return genericArrivalPhrases.includes(clean);
    };

    let matchedMovementTarget: { task?: any; subtask?: any; parentTask?: any } | null = null;
    const generic = isGenericArrival(text);

    if (!generic) {
      // 1. Specific destination utterance (e.g. "Tôi tới nhà thuốc rồi", "Tới quầy số 2 rồi")
      // Search ALL movement tasks across the entire session semantically
      const semanticMatches = resolveSemanticTaskMatches(session, text);
      for (const m of semanticMatches) {
        const cand = m.subtask || m.task;
        if (cand && cand.status !== 'completed' && isMovementTitle(cand.title)) {
          matchedMovementTarget = m;
          break;
        }
      }

      // CRITICAL: If specific destination was NOT found in any movement task,
      // DO NOT fallback to any arbitrary pending task! Return clarification without mutation.
      if (!matchedMovementTarget) {
        return {
          reply: `Dạ ${addressing}, ${addressing} đã đến nơi an toàn rồi ạ! ${me.charAt(0).toUpperCase() + me.slice(1)} chưa tìm thấy mục di chuyển tương ứng trong danh sách để đánh dấu, ${addressing} xem lại danh sách hoặc cho ${me} biết bước tiếp theo nhé!`,
          speech: `Dạ ${addressing}, ${addressing} đã đến nơi an toàn rồi ạ!`,
          actions: [],
          confidence: 0.85,
          suggestedReplies: ['Kiểm tra danh sách công việc', 'Giờ tôi cần làm gì tiếp?'],
        };
      }
    } else {
      // 2. Purely generic deictic arrival ("Tôi tới rồi", "Đến nơi rồi")
      // ONLY check if current step (or its subtask) is a movement task
      const resolvedStep = resolveCurrentStep(session);
      const currentTaskOrSub = resolvedStep?.subtask || resolvedStep?.task;
      if (currentTaskOrSub && currentTaskOrSub.status !== 'completed' && isMovementTitle(currentTaskOrSub.title)) {
        matchedMovementTarget = resolvedStep;
      }
    }

    if (matchedMovementTarget) {
      const target = matchedMovementTarget.subtask || matchedMovementTarget.task;
      const isSubtask = !!matchedMovementTarget.subtask;
      const taskId = matchedMovementTarget.parentTask?.id || matchedMovementTarget.task?.id || target?.id;
      const subtaskId = matchedMovementTarget.subtask?.id;

      const actions: AgentAction[] = [
        {
          type: isSubtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId,
            subtaskId,
          },
        },
      ];

      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      let replyText = `${da}, ${addressing} đã đến nơi an toàn rồi, mừng quá ạ! ${me.charAt(0).toUpperCase() + me.slice(1)} đã đánh dấu xong "${target?.title}".`;
      if (nextRec && nextRec.title && !nextRec.title.includes('Hoàn thành tất cả')) {
        const softGuidance = formatSoftNextStepGuidance(nextRec, honorifics, session.goal);
        replyText += `\n\n${softGuidance}`;
      }

      return {
        reply: replyText,
        speech: replyText.replace(/👉/g, '').replace(/\n/g, ' '),
        actions,
        confidence: 0.95,
        suggestedReplies: ['Xong bước tiếp theo rồi', 'Nhờ Lovira tư vấn'],
      };
    }
  }

  // 5. Explicit "Thêm việc: ..." / "Thêm nhiệm vụ: ..."
  if (tLower.startsWith('thêm việc:') || tLower.startsWith('thêm việc ') || tLower.startsWith('thêm nhiệm vụ:')) {
    const taskTitle = tTrimmed.replace(/^(thêm việc|thêm nhiệm vụ):?\s*/i, '').trim();
    if (taskTitle) {
      return {
        reply: `${da}, ${me} đã thêm việc: "${taskTitle}" vào danh sách công việc của phiên rồi nha ${addressing}!`,
        actions: [
          {
            type: 'ADD_TASK',
            payload: {
              title: taskTitle,
              important: false,
            },
          },
        ],
        confidence: 0.95,
        suggestedReplies: ['Xem lại danh sách', 'Cần làm gì tiếp theo?'],
      };
    }
  }

  // 6. Explicit "Lưu lại: ..." / "Ghi nhớ: ..."
  if (
    tLower.startsWith('lưu lại:') ||
    tLower.startsWith('lưu lại ') ||
    tLower.startsWith('ghi nhớ:') ||
    tLower.startsWith('ghi nhớ ') ||
    tLower.startsWith('lưu thông tin:')
  ) {
    const cleanVal = tTrimmed.replace(/^(lưu lại|ghi nhớ|lưu thông tin):?\s*/i, '').trim();
    if (cleanVal) {
      return {
        reply: `${da}, ${me} đã ghi nhớ thông tin: "${cleanVal}" vào mục Thông tin quan trọng rồi ạ!`,
        actions: [
          {
            type: 'ADD_FACT',
            payload: {
              category: 'note',
              title: 'Ghi chú đã lưu',
              value: cleanVal,
            },
          },
        ],
        confidence: 0.95,
      };
    }
  }

  // 7. Explicit "Đổi mục tiêu: ..."
  if (tLower.startsWith('đổi mục tiêu:') || tLower.startsWith('thay đổi mục tiêu:')) {
    const newGoal = tTrimmed.replace(/^(đổi mục tiêu|thay đổi mục tiêu):?\s*/i, '').trim();
    if (newGoal) {
      return {
        reply: `${da}, ${me} đã cập nhật mục tiêu mới cho phiên: "${newGoal}".`,
        actions: [
          {
            type: 'CHANGE_GOAL',
            payload: { goal: newGoal },
          },
        ],
        confidence: 0.95,
      };
    }
  }

  // 8. Explicit Fact Lookup Query (e.g. "Phòng mấy", "Bác sĩ tên gì", "Mã hồ sơ")
  if (session.importantFacts && session.importantFacts.length > 0) {
    if (tLower.includes('phòng mấy') || tLower.includes('ở phòng nào') || tLower.includes('phòng khám nào')) {
      const locFact = session.importantFacts.find((f) => f.type === 'location');
      if (locFact) {
        return {
          reply: `${da}, theo thông tin đã lưu thì phòng của ${addressing} là: "${locFact.value}" ạ.`,
          actions: [],
          confidence: 0.95,
          suggestedReplies: ['Tôi tới phòng rồi', 'Giờ làm gì tiếp theo?'],
        };
      }
    }

    if (tLower.includes('mã hồ sơ') || tLower.includes('số thứ tự') || tLower.includes('mã tra cứu')) {
      const idFact = session.importantFacts.find(
        (f) => f.title.toLowerCase().includes('mã') || f.title.toLowerCase().includes('số thứ tự') || f.title.toLowerCase().includes('phiếu')
      );
      if (idFact) {
        return {
          reply: `${da}, ${idFact.title} của ${addressing} là: "${idFact.value}".`,
          actions: [],
          confidence: 0.95,
        };
      }
    }
  }

  // NOT a deterministic operational command -> Pass to Groq / LLM for natural dialogue & advice
  return null;
}
