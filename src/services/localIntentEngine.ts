import {
  LifeSession,
  AgentAction,
  GeneratedSessionPlan,
  ImportantFactType,
  UserProfile,
} from '../types';
import { SCENARIO_REGISTRY } from './scenarioRegistry';
import { routeScenario, extractKnownFacts } from './scenarioRouter';
import {
  findBestMatchingTask,
  resolveCurrentStep,
  calculateNextRecommendedAction,
  resolveCompletionTarget,
} from './actionEngine';
import { normalizeGeneratedLifePlan } from './planValidator';
import { buildAddressing } from '../utils/filterRelevantConditions';

export interface LocalIntentResult {
  reply: string;
  speech?: string;
  actions: AgentAction[];
  confidence: number;
}


/**
 * Universal fallback plan generator for completely offline or demo scenarios
 * Generates grounded tasks and extracts only real facts from prompt
 */
export function generateFallbackCustomSessionPlan(prompt: string): GeneratedSessionPlan {
  const routing = routeScenario(prompt);
  const knownFacts = extractKnownFacts(prompt);
  const registry = SCENARIO_REGISTRY[routing.family] || SCENARIO_REGISTRY.custom;
  const pLower = prompt.toLowerCase();

  // 1. Phỏng vấn / Tìm việc (Work / Interview)
  if (routing.family === 'work' || pLower.includes('phỏng vấn') || pLower.includes('xin việc')) {
    const isTomorrow = pLower.includes('mai');
    const title = isTomorrow ? '💼 Chuẩn bị buổi phỏng vấn ngày mai' : '💼 Kế hoạch chuẩn bị phỏng vấn';

    const plan: GeneratedSessionPlan = {
      title,
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'work',
      subtype: 'job_interview',
      modules: ['appointment', 'checklist', 'documents', 'deadline'],
      tasks: [
        {
          title: 'Chuẩn bị hồ sơ xin việc',
          description: 'Soạn sẵn CV và các giấy tờ cần thiết cho buổi phỏng vấn',
          order: 1,
          important: true,
          subtasks: [
            { title: 'Chuẩn bị CV & hồ sơ ứng tuyển', order: 1 },
            { title: 'Mang theo giấy tờ cá nhân cần thiết', order: 2 },
          ],
        },
        {
          title: 'Tìm hiểu thông tin công ty & vị trí ứng tuyển',
          description: 'Xem lại mô tả công việc (JD) và các câu hỏi phỏng vấn thường gặp',
          order: 2,
          important: true,
          subtasks: [
            { title: 'Đọc lại mô tả công việc (JD)', order: 1 },
            { title: 'Chuẩn bị 2-3 câu hỏi dành cho nhà tuyển dụng', order: 2 },
          ],
        },
        {
          title: 'Chuẩn bị trang phục phỏng vấn',
          description: 'Lựa chọn trang phục lịch sự, chỉnh chu',
          order: 3,
        },
        {
          title: 'Xác định địa điểm & phương tiện di chuyển',
          description: 'Dự trù thời gian xuất phát để đến sớm 10 - 15 phút',
          order: 4,
          important: true,
        },
        {
          title: 'Tham gia phỏng vấn đúng giờ',
          description: 'Giữ tinh thần tự tin, trao đổi rõ ràng và chuyên nghiệp',
          order: 5,
          important: true,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Chuẩn bị CV & hồ sơ ứng tuyển',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 2. Bảo hành thiết bị / Laptop (Technology & Warranty)
  if (routing.family === 'technology' || pLower.includes('bảo hành') || pLower.includes('laptop') || pLower.includes('sửa')) {
    const plan: GeneratedSessionPlan = {
      title: '💻 Đem thiết bị đi bảo hành / sửa chữa',
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'technology',
      subtype: 'device_repair',
      modules: ['documents', 'followUp', 'notes'],
      tasks: [
        {
          title: 'Sao lưu dữ liệu quan trọng',
          description: 'Chuyển dữ liệu cá nhân sang ổ cứng ngoài hoặc đám mây trước khi gửi máy',
          order: 1,
          important: true,
        },
        {
          title: 'Chuẩn bị máy & Phụ kiện liên quan',
          description: 'Mang theo củ sạc, dây cáp và phiếu/hóa đơn bảo hành',
          order: 2,
          important: true,
          subtasks: [
            { title: 'Lấy củ sạc và cáp kết nối', order: 1 },
            { title: 'Tìm phiếu bảo hành hoặc hóa đơn mua hàng', order: 2 },
          ],
        },
        {
          title: 'Đến trung tâm bảo hành',
          description: 'Mô tả rõ lỗi gặp phải cho nhân viên kỹ thuật',
          order: 3,
        },
        {
          title: 'Nhận phiếu tiếp nhận & Lưu mã biên nhận',
          description: 'Kiểm tra kỹ thông tin tình trạng máy và ngày hẹn trả máy',
          order: 4,
          important: true,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Sao lưu dữ liệu quan trọng trước khi đem máy đi',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 3. Đón người thân / Sân bay (Travel / Trips)
  if (routing.family === 'travel' || pLower.includes('sân bay') || pLower.includes('đón mẹ') || pLower.includes('đón người')) {
    const plan: GeneratedSessionPlan = {
      title: '🧳 Đón người thân tại sân bay / nhà ga',
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'travel',
      subtype: 'airport_pickup',
      modules: ['appointment', 'checklist', 'navigation', 'notes'],
      tasks: [
        {
          title: 'Xác nhận thông tin chuyến bay / giờ hạ cánh',
          description: 'Kiểm tra mã hiệu chuyến bay và nhà ga đến (Quốc nội / Quốc tế)',
          order: 1,
          important: true,
        },
        {
          title: 'Xuất phát đến sân bay / điểm đón',
          description: 'Dự trù thời gian di chuyển để có mặt trước giờ hạ cánh 15-20 phút',
          order: 2,
          important: true,
        },
        {
          title: 'Đến đúng cửa đón và liên hệ người thân',
          description: 'Chờ tại khu vực sảnh đón và gọi điện thoại khi người thân nhận xong hành lý',
          order: 3,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Xác nhận thông tin chuyến bay & giờ hạ cánh',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 4. Mặc định theo Scenario Registry
  const tasks = registry.suggestedTasks.map((t, idx) => ({
    title: t.title,
    description: t.description,
    order: t.order || idx + 1,
    important: t.important || idx === 0,
    subtasks: t.subtasks,
  }));

  const facts = knownFacts.map((f) => ({
    type: f.type,
    title: f.title,
    value: f.value,
  }));

  const plan: GeneratedSessionPlan = {
    title: `${registry.label.split(' ')[0]} ${prompt.slice(0, 30)}`,
    goal: prompt,
    scenarioType: 'custom',
    scenarioFamily: routing.family,
    modules: registry.defaultModules,
    tasks,
    importantFacts: facts,
    firstRecommendedAction: tasks[0]?.subtasks?.[0]?.title || tasks[0]?.title || 'Bắt đầu bước đầu tiên',
  };

  return normalizeGeneratedLifePlan(plan, prompt, routing);
}

/**
 * Universal Local Intent Parser:
 * Evaluates user input against structured session state without hardcoded single-scenario assumptions
 */
export function parseLocalIntent(
  userInput: string,
  session: LifeSession,
  userProfile?: UserProfile | null
): LocalIntentResult | null {
  if (!userInput || !userInput.trim() || !session) return null;

  const text = userInput.trim();
  const tLower = text.toLowerCase();
  const resolvedStep = resolveCurrentStep(session);
  const currentTaskOrSub = resolvedStep?.subtask || resolvedStep?.task;

  const addressing = buildAddressing(userProfile) || 'bạn';
  const pronoun = userProfile?.pronounStyle;
  const isElderly = pronoun === 'ong' || pronoun === 'ba' || addressing.startsWith('bác') || addressing.startsWith('ông') || addressing.startsWith('bà') || addressing.startsWith('cô') || addressing.startsWith('chú');
  const isYoungerSenior = pronoun === 'anh' || pronoun === 'chi' || addressing.startsWith('anh') || addressing.startsWith('chị');

  const da = isElderly ? `Dạ thưa ${addressing}` : isYoungerSenior ? `Dạ ${addressing}` : 'Dạ';
  const me = isElderly ? 'con' : isYoungerSenior ? 'em' : 'mình';
  const a = isElderly ? 'ạ' : '';

  // 1. Pause / Resume / Complete session
  if (tLower.includes('tạm dừng phiên') || tLower.includes('nghỉ tay') || tLower === 'tạm dừng') {
    return {
      reply: `${da}, ${me} đã tạm dừng phiên hỗ trợ rồi nha. Khi nào ${addressing} muốn tiếp tục, chỉ cần nhắn "tiếp tục" cho ${me} nhé${a}!`,
      actions: [{ type: 'PAUSE_SESSION', payload: {} }],
      confidence: 0.95,
    };
  }

  if (tLower.includes('tiếp tục phiên') || tLower === 'tiếp tục' || tLower === 'làm tiếp') {
    return {
      reply: `${da}, ${me} cùng ${addressing} tiếp tục công việc nhé${a}. Bước hiện tại của ${addressing} là: "` + (session.nextRecommendedAction?.title || 'xem lại danh sách') + `".`,
      actions: [{ type: 'RESUME_SESSION', payload: {} }],
      confidence: 0.95,
    };
  }

  if (tLower.includes('hoàn thành phiên') || tLower.includes('xong hết rồi') || tLower.includes('kết thúc phiên')) {
    return {
      reply: `Chúc mừng ${addressing} đã hoàn thành trọn vẹn phiên hôm nay! 🎉 ${da}, ${me} đã đánh dấu phiên này hoàn thành rồi ${a}.`,
      actions: [{ type: 'COMPLETE_SESSION', payload: {} }],
      confidence: 0.95,
    };
  }

  // 2. Universal "Tiếp theo làm gì?" / "Giờ tôi phải làm gì?" / "Làm gì tiếp?"
  if (
    tLower.includes('tiếp theo') ||
    tLower.includes('làm gì tiếp') ||
    tLower.includes('giờ làm sao') ||
    tLower.includes('giờ tôi làm gì') ||
    tLower.includes('bước tiếp theo') ||
    tLower.includes('bây giờ phải làm gì') ||
    tLower.includes('giờ tôi phải làm gì')
  ) {
    const nextAction = calculateNextRecommendedAction(session);
    if (!nextAction || !nextAction.title) {
      return {
        reply: `${da}, tất cả các công việc trong phiên đã hoàn thành rồi ${addressing} ơi! 🎉 ${addressing} có cần ${me} hỗ trợ thêm điều gì không ${a}?`,
        actions: [],
        confidence: 0.95,
      };
    }

    const reply = nextAction.description
      ? `${da}, bước tiếp theo ${addressing} cần làm là: "${nextAction.title}".\n(${nextAction.description})\n\nKhi làm xong ${addressing} báo ${me} nha${a}!`
      : `${da}, bước tiếp theo ${addressing} cần làm là: "${nextAction.title}".\n\nKhi hoàn thành ${addressing} cứ nhắn "xong rồi" cho ${me} nhé${a}!`;

    return {
      reply,
      actions: [],
      confidence: 0.95,
    };
  }

  // 3. Universal "Nhiều quá / Rối quá / Không biết bắt đầu từ đâu"
  if (
    tLower.includes('nhiều quá') ||
    tLower.includes('rối quá') ||
    tLower.includes('không nhớ hết') ||
    tLower.includes('nhiều việc quá') ||
    tLower.includes('lo quá') ||
    tLower.includes('chóng mặt')
  ) {
    if (currentTaskOrSub) {
      return {
        reply: `${da} đừng lo lắng ${a}, có ${me} đồng hành cùng ${addressing} mà! Bây giờ ${addressing} chỉ cần tập trung làm DUY NHẤT một việc này thôi nhé:\n\n👉 "${currentTaskOrSub.title}"\n\nLàm xong bước này rồi ${me} cùng ${addressing} tính tiếp, không cần lo nghĩ nhiều đâu ${a}!`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: `${da} đừng lo lắng ${a}, ${me} sẽ cùng ${addressing} giải quyết từng việc một. ${addressing} cứ thong thả làm xong bước đầu tiên trước nhé!`,
      actions: [],
      confidence: 0.9,
    };
  }

  // 4. Universal "Xong rồi" / "Làm xong rồi" / "Hoàn thành bước này"
  if (
    tLower === 'xong rồi' ||
    tLower === 'xong' ||
    tLower === 'đã xong' ||
    tLower === 'hoàn thành rồi' ||
    tLower === 'làm xong rồi' ||
    tLower.startsWith('xong rồi ') ||
    tLower.startsWith('đã làm xong') ||
    tLower.startsWith('xong bước') ||
    tLower.startsWith('hoàn thành bước')
  ) {
    const compResult = resolveCompletionTarget(session, text);

    if (compResult.isAmbiguous) {
      const candidates = compResult.candidateTasks || session.tasks.filter((t) => t.status !== 'completed');
      if (candidates.length > 0) {
        const taskListStr = candidates.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
        return {
          reply: `${da}, ${addressing} vừa hoàn thành công việc nào vậy ${a}? Nhắn tên hoặc số thứ tự công việc cho ${me} để ${me} đánh dấu nhé:\n\n${taskListStr}`,
          actions: [],
          confidence: 0.95,
        };
      }
    }

    const target = compResult.subtask || compResult.task;
    if (target) {
      const parentId = compResult.parentTask?.id || (compResult.task ? compResult.task.id : target.id);
      const actions: AgentAction[] = [
        {
          type: compResult.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId: parentId,
            subtaskId: compResult.subtask?.id,
          },
        },
      ];

      const compliment = isElderly ? `Dạ mừng quá ${addressing} ơi!` : isYoungerSenior ? `Dạ tuyệt vời ${addressing} ơi!` : 'Giỏi quá!';
      return {
        reply: `${compliment} ${me.charAt(0).toUpperCase() + me.slice(1)} đã đánh dấu hoàn thành bước: "${target.title}" rồi nha ${a}. Giờ tụi mình chuyển sang bước tiếp theo nhé!`,
        actions,
        confidence: 0.95,
      };
    }

    const pending = session.tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
    if (pending.length > 0) {
      const taskListStr = pending.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
      return {
        reply: `${da}, ${addressing} vừa hoàn thành công việc nào vậy ${a}? Nhắn tên công việc cho ${me} để ${me} đánh dấu nhé:\n\n${taskListStr}`,
        actions: [],
        confidence: 0.9,
      };
    }

    return {
      reply: `Tuyệt vời! Tất cả các công việc trong phiên đều đã hoàn thành rồi ${addressing} ơi! 🎉`,
      actions: [],
      confidence: 0.9,
    };
  }

  // 5. Universal "Tôi tới rồi" / "Đã đến nơi" / "Đến địa điểm rồi"
  if (
    tLower.includes('tôi tới rồi') ||
    tLower.includes('tôi đến nơi rồi') ||
    tLower.includes('đã tới nơi') ||
    tLower.includes('đến nơi rồi') ||
    tLower === 'tới rồi' ||
    tLower === 'đến rồi'
  ) {
    const isMovementTitle = (title: string) => {
      const tl = title.toLowerCase();
      return (
        tl.includes('đến') ||
        tl.includes('tới') ||
        tl.includes('di chuyển') ||
        tl.includes('xuất phát') ||
        tl.includes('ra') ||
        tl.includes('vào') ||
        tl.includes('ghé') ||
        tl.includes('sang') ||
        tl.includes('đi')
      );
    };

    // Check if current active step is a movement task
    if (currentTaskOrSub && isMovementTitle(currentTaskOrSub.title) && currentTaskOrSub.status !== 'completed') {
      return {
        reply: `${da}, ${addressing} đã đến nơi an toàn rồi, mừng quá ${a}! ${me.charAt(0).toUpperCase() + me.slice(1)} đánh dấu hoàn thành bước "${currentTaskOrSub.title}" rồi nha. Bây giờ ${addressing} vào việc tiếp theo nhé!`,
        actions: [
          {
            type: resolvedStep?.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
            payload: {
              taskId: resolvedStep?.task?.id || currentTaskOrSub.id,
              subtaskId: resolvedStep?.subtask?.id,
            },
          },
        ],
        confidence: 0.95,
      };
    }

    // Otherwise find all pending movement tasks
    const movementCandidates: { task: any; subtask?: any }[] = [];
    for (const t of session.tasks) {
      if (t.status === 'completed' || t.status === 'skipped') continue;
      if (t.subtasks) {
        for (const st of t.subtasks) {
          if (st.status !== 'completed' && isMovementTitle(st.title)) {
            movementCandidates.push({ task: t, subtask: st });
          }
        }
      }
      if (isMovementTitle(t.title)) {
        movementCandidates.push({ task: t });
      }
    }

    if (movementCandidates.length === 1) {
      const candidate = movementCandidates[0];
      const targetItem = candidate.subtask || candidate.task;
      return {
        reply: `${da}, ${addressing} đã đến nơi an toàn rồi, mừng quá ${a}! ${me.charAt(0).toUpperCase() + me.slice(1)} đánh dấu hoàn thành bước "${targetItem.title}" rồi nha. Bây giờ ${addressing} vào việc tiếp theo nhé!`,
        actions: [
          {
            type: candidate.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
            payload: {
              taskId: candidate.task.id,
              subtaskId: candidate.subtask?.id,
            },
          },
        ],
        confidence: 0.95,
      };
    } else if (movementCandidates.length > 1) {
      const listStr = movementCandidates.map((m, idx) => `${idx + 1}. ${(m.subtask || m.task).title}`).join('\n');
      return {
        reply: `${da}, mừng ${addressing} đã đến nơi ${a}! ${addressing} vừa đến địa điểm nào trong các bước sau nè?\n\n${listStr}`,
        actions: [],
        confidence: 0.95,
      };
    }

    return {
      reply: `${da}, mừng ${addressing} đã đến nơi an toàn nhé ${a}! Bây giờ ${addressing} xem bước tiếp theo cần làm gì trong danh sách hoặc bảo ${me} nha.`,
      actions: [],
      confidence: 0.9,
    };
  }


  // 6. Fact Questions (Universal fact lookup)
  // "Phòng mấy?"
  if (tLower.includes('phòng') && (tLower.includes('mấy') || tLower.includes('ở đâu') || tLower.includes('nào') || tLower.includes('lúc nãy'))) {
    const roomFact = session.importantFacts.find(
      (f) =>
        f.title.toLowerCase().includes('phòng') ||
        f.value.toLowerCase().includes('phòng') ||
        (f.type === 'location' && f.value.toLowerCase().includes('phòng'))
    );
    if (roomFact) {
      return {
        reply: `Thông tin phòng khám/làm việc đã lưu là: ${roomFact.value} (${roomFact.title}).`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa lưu thông tin số phòng trong phiên này bạn ơi. Khi nào biết số phòng, bạn nhắn để mình lưu lại giúp bạn nhé!',
      actions: [],
      confidence: 0.9,
    };
  }

  // "Bác sĩ tên gì?" / "Gặp ai?"
  if (tLower.includes('bác sĩ') && (tLower.includes('tên gì') || tLower.includes('ai') || tLower.includes('nào'))) {
    const docFact = session.importantFacts.find(
      (f) => f.title.toLowerCase().includes('bác sĩ') || f.value.toLowerCase().includes('bác sĩ')
    );
    if (docFact) {
      return {
        reply: `Tên bác sĩ đã lưu là: ${docFact.value}.`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa có thông tin tên bác sĩ trong phiên này. Bạn có thể nhắn tên bác sĩ để mình lưu vào phiên nha!',
      actions: [],
      confidence: 0.9,
    };
  }

  // "Tái khám ngày nào?"
  if (tLower.includes('tái khám') && (tLower.includes('ngày nào') || tLower.includes('khi nào') || tLower.includes('mấy giờ'))) {
    const dateFact = session.importantFacts.find(
      (f) =>
        f.title.toLowerCase().includes('tái khám') ||
        f.title.toLowerCase().includes('lịch hẹn') ||
        (f.type === 'date' && f.title.toLowerCase().includes('khám'))
    );
    if (dateFact) {
      return {
        reply: `Lịch hẹn tái khám của bạn là: ${dateFact.value} (${dateFact.title}).`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa lưu lịch tái khám trong phiên này bạn ơi. Khi bác sĩ hẹn ngày, bạn nhắn mình lưu ngay nhé!',
      actions: [],
      confidence: 0.9,
    };
  }

  // "Mã hồ sơ của tôi là gì?" / "Mã tra cứu"
  if (tLower.includes('mã hồ sơ') || tLower.includes('mã biên nhận') || tLower.includes('mã tra cứu')) {
    const codeFact = session.importantFacts.find(
      (f) =>
        f.type === 'identifier' ||
        f.title.toLowerCase().includes('mã') ||
        f.title.toLowerCase().includes('hồ sơ')
    );
    if (codeFact) {
      return {
        reply: `Mã hồ sơ đã lưu của bạn là: ${codeFact.value}.`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa lưu mã hồ sơ của bạn trong phiên này. Khi có giấy hẹn hoặc mã tra cứu, bạn nhắn mình lưu lại ngay nhé!',
      actions: [],
      confidence: 0.9,
    };
  }

  // 7. Adding new fact or task from explicit requests
  // "Thêm việc: ..." or "Thêm công việc: ..."
  if (tLower.startsWith('thêm việc:') || tLower.startsWith('thêm việc ') || tLower.startsWith('thêm nhiệm vụ:')) {
    const taskName = text.replace(/^thêm\s*(việc|nhiệm vụ|công việc):?\s*/i, '').trim();
    if (taskName) {
      return {
        reply: `Mình đã thêm công việc: "${taskName}" vào danh sách rồi nhé!`,
        actions: [
          {
            type: 'ADD_TASK',
            payload: { title: taskName, important: false },
          },
        ],
        confidence: 0.95,
      };
    }
  }

  // "Lưu lại: ..." or "Ghi nhớ: ..."
  if (tLower.startsWith('lưu lại:') || tLower.startsWith('ghi nhớ:') || tLower.startsWith('lưu thông tin:')) {
    const factContent = text.replace(/^(lưu lại|ghi nhớ|lưu thông tin):?\s*/i, '').trim();
    if (factContent) {
      return {
        reply: `Mình đã ghi nhớ thông tin: "${factContent}" vào phiên rồi nha!`,
        actions: [
          {
            type: 'ADD_FACT',
            payload: {
              category: 'note',
              title: 'Ghi chú đã lưu',
              value: factContent,
            },
          },
        ],
        confidence: 0.95,
      };
    }
  }

  // "Đổi mục tiêu thành: ..."
  if (tLower.startsWith('đổi mục tiêu thành:') || tLower.startsWith('đổi mục tiêu:')) {
    const newGoal = text.replace(/^đổi mục tiêu( thành)?:?\s*/i, '').trim();
    if (newGoal) {
      return {
        reply: `Mình đã cập nhật mục tiêu mới của phiên thành: "${newGoal}" rồi nhé!`,
        actions: [{ type: 'CHANGE_GOAL', payload: { goal: newGoal } }],
        confidence: 0.95,
      };
    }
  }

  // 8. Polite greetings & conversational thanks
  if (tLower === 'cảm ơn' || tLower === 'cảm ơn bạn' || tLower === 'cảm ơn lovira' || tLower === 'cảm ơn nha' || tLower === 'thanks') {
    return {
      reply: 'Không có chi nè! Có mình luôn ở đây đồng hành cùng bạn nha. Bạn cần làm gì tiếp cứ nhắn mình nhé! ❤️',
      actions: [],
      confidence: 0.95,
    };
  }

  if (tLower === 'chào bạn' || tLower === 'alo' || tLower === 'hi lovira' || tLower === 'xin chào' || tLower === 'hello') {
    return {
      reply: `Chào bạn nha! Tụi mình đang thực hiện phiên "${session.title}". Bạn cần mình hỗ trợ điều gì tiếp theo nè?`,
      actions: [],
      confidence: 0.9,
    };
  }

  return null;
}
