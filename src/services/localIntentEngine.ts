import {
  LifeSession,
  AgentAction,
  UserProfile,
} from '../types';
import {
  findBestMatchingTask,
  resolveCurrentStep,
  calculateNextRecommendedAction,
  resolveCompletionTarget,
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
  session: LifeSession,
  userProfile?: UserProfile | null
): LocalIntentResult | null {
  if (!text || !text.trim() || !session) return null;

  const tTrimmed = text.trim();
  const tLower = tTrimmed.toLowerCase();
  const honorifics = deduceHonorifics(userProfile, text);
  const { addressing, me, praise, da, a } = honorifics;

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

  // 3. Universal "Xong rồi" / "Làm xong rồi" / "Chuẩn bị rồi" / "Hoàn thành bước này"
  if (
    tLower === 'xong rồi' ||
    tLower === 'xong' ||
    tLower === 'đã xong' ||
    tLower === 'hoàn thành' ||
    tLower === 'hoàn thành rồi' ||
    tLower === 'làm xong rồi' ||
    tLower.includes('chuẩn bị rồi') ||
    tLower.includes('chuẩn bị xong') ||
    tLower.includes('sẵn sàng rồi') ||
    tLower.includes('xong rồi nhé') ||
    tLower.includes('xong rồi nha') ||
    tLower.startsWith('xong rồi ') ||
    tLower.startsWith('đã làm xong') ||
    tLower.startsWith('xong bước') ||
    tLower.startsWith('hoàn thành bước') ||
    tLower.endsWith('chuẩn bị rồi') ||
    tLower.endsWith('chuẩn bị rồi nhé') ||
    tLower.endsWith('chuẩn bị rồi nha')
  ) {
    const compResult = resolveCompletionTarget(session, text);
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

      // Dynamically calculate new state and next step
      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      let replyText = '';
      if (nextRec && nextRec.title && !nextRec.title.includes('Hoàn thành tất cả')) {
        const softGuidance = formatSoftNextStepGuidance(nextRec, honorifics, session.goal);
        replyText = `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} đã đánh dấu hoàn thành xong rồi ạ.\n\n${softGuidance}`;
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

    // Default active task completion if no specific target found
    const currentStep = resolveCurrentStep(session);
    if (currentStep && (currentStep.subtask || currentStep.task)) {
      const target = currentStep.subtask || currentStep.task;
      const actions: AgentAction[] = [
        {
          type: currentStep.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId: currentStep.task?.id,
            subtaskId: currentStep.subtask?.id,
          },
        },
      ];

      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      let replyText = `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} đã ghi nhận xong bước "${target?.title}" rồi nhé${a}!`;
      if (nextRec && nextRec.title && !nextRec.title.includes('Hoàn thành tất cả')) {
        const softGuidance = formatSoftNextStepGuidance(nextRec, honorifics, session.goal);
        replyText += `\n\n${softGuidance}`;
      }

      return {
        reply: replyText,
        speech: replyText.replace(/👉/g, '').replace(/\n/g, ' '),
        actions,
        confidence: 0.95,
        suggestedReplies: ['Xong rồi', 'Tôi tới nơi rồi'],
      };
    }
  }

  // 4. Universal Arrival / Movement ("Tôi tới rồi", "Đã đến nơi", "Bác đến rồi", "Đến quầy rồi")
  if (
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
    tLower.includes('đến ngân hàng') ||
    tLower.includes('tới ngân hàng')
  ) {
    const isMovementTitle = (title: string) => {
      const tl = title.toLowerCase();
      return (
        tl.startsWith('đến') ||
        tl.startsWith('di chuyển') ||
        tl.includes('sang phòng') ||
        tl.includes('đến phòng') ||
        tl.includes('đến quầy') ||
        tl.includes('tới nơi')
      );
    };

    const resolvedStep = resolveCurrentStep(session);
    const currentTaskOrSub = resolvedStep?.subtask || resolvedStep?.task;

    if (currentTaskOrSub && isMovementTitle(currentTaskOrSub.title) && currentTaskOrSub.status !== 'completed') {
      const actions: AgentAction[] = [
        {
          type: resolvedStep?.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId: resolvedStep?.task?.id || currentTaskOrSub.id,
            subtaskId: resolvedStep?.subtask?.id,
          },
        },
      ];

      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      let replyText = `${da}, ${addressing} đã đến nơi an toàn rồi, mừng quá ạ!`;
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
