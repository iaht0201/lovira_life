import { LifeSession, UserProfile, InteractionInputMode, AppInteractionContext } from '../../types';
import { buildAddressing, getRelevantConditions } from '../../utils/filterRelevantConditions';
import { resolveCurrentStep } from '../actionEngine';

export interface PromptContextOptions {
  session?: LifeSession | null;
  userProfile?: UserProfile | null;
  inputMode?: InteractionInputMode;
  appContext?: AppInteractionContext;
}

export function buildSessionContextPrompt(
  sessionOrOptions: LifeSession | null | PromptContextOptions,
  legacyUserProfile?: UserProfile | null
): string {
  let session: LifeSession | null | undefined = null;
  let userProfile: UserProfile | null | undefined = null;
  let inputMode: InteractionInputMode = 'text';
  let appContext: AppInteractionContext | undefined = undefined;

  if (sessionOrOptions && 'id' in sessionOrOptions && 'tasks' in sessionOrOptions) {
    session = sessionOrOptions as LifeSession;
    userProfile = legacyUserProfile;
  } else if (sessionOrOptions) {
    const opts = sessionOrOptions as PromptContextOptions;
    session = opts.session;
    userProfile = opts.userProfile || legacyUserProfile;
    inputMode = opts.inputMode || 'text';
    appContext = opts.appContext;
  }

  const addressing = buildAddressing(userProfile) || 'bạn';

  // Determine honorific pair
  const pronoun = userProfile?.pronounStyle;
  const isElderly =
    pronoun === 'ong' ||
    pronoun === 'ba' ||
    addressing.startsWith('bác') ||
    addressing.startsWith('ông') ||
    addressing.startsWith('bà') ||
    addressing.startsWith('cô') ||
    addressing.startsWith('chú');
  const isYoungerSenior =
    pronoun === 'anh' ||
    pronoun === 'chi' ||
    addressing.startsWith('anh') ||
    addressing.startsWith('chị');

  let honorificGuide = '';
  if (isElderly) {
    honorificGuide = `- Đối tượng: ${addressing}.\n- Xưng hô nhất quán: Lovira xưng "con" hoặc "Lovira" — gọi "${addressing}".\n- Giọng điệu: Lễ phép, tự nhiên, ân cần. Dùng "Dạ" khi mở đầu câu nếu hợp ngữ cảnh. Tránh lặp lại danh xưng hay "...ạ" dồn dập trong từng mệnh đề ngắn.`;
  } else if (isYoungerSenior) {
    honorificGuide = `- Đối tượng: ${addressing}.\n- Xưng hô nhất quán: Lovira xưng "em" hoặc "Lovira" — gọi "${addressing}".\n- Giọng điệu: Tôn trọng, ân cần, tự nhiên.`;
  } else {
    honorificGuide = `- Đối tượng: ${addressing}.\n- Xưng hô: "Lovira" hoặc "mình" — gọi "${addressing}". Thân thiện, tâm tình, tự nhiên.`;
  }

  // Voice Input instructions
  let voiceGuide = '';
  if (inputMode === 'voice') {
    voiceGuide = `
CHẾ ĐỘ NHẬP LIỆU: GIỌNG NÓI (VOICE INPUT)
- Tin nhắn đến từ nhận diện giọng nói tiếng Việt.
- Sử dụng ngữ cảnh để hiểu đúng ý người dùng dù có lỗi nhận dạng nhỏ.
- Đối với các câu hỏi tự nhiên, phản hồi ngắn gọn, tự nhiên và dễ nghe khi đọc qua loa (TTS).
- Khi người dùng muốn chuyển trang (về trang chủ, mở cài đặt, mở hồ sơ, mở camera), phát hành appActions tương ứng.`;
  }

  // If outside session (Dashboard or Other page)
  if (!session) {
    const availableSessionsFormatted = (appContext?.availableSessions || [])
      .map((s, idx) => `${idx + 1}. [${s.status.toUpperCase()}] ${s.title} (ID: ${s.id}, Mục tiêu: ${s.goal})`)
      .join('\n') || 'Chưa có phiên nào trong lịch sử.';

    return `BỐI CẢNH ỨNG DỤNG LOVIRA (NGOÀI PHIÊN LÀM VIỆC):
--------------------------------------------------
- Trang hiện tại: ${appContext?.page || 'dashboard'}
- Trạng thái: Người dùng đang ở màn hình chính/tổng quan, chưa vào phiên hỗ trợ cụ thể nào.
- Danh sách các phiên có sẵn:
${availableSessionsFormatted}

XƯNG HÔ & ĐẶC ĐIỂM NGƯỜI DÙNG:
${honorificGuide}
${voiceGuide}

NGUYÊN TẮC KHI Ở NGOÀI PHIÊN (DASHBOARD):
1. BẠN LÀ LOVIRA: AI Copilot đồng hành thông minh, hỗ trợ toàn diện cuộc sống.
2. NẮM BẮT Ý ĐỊNH TẠO PHIÊN MỚI (INTENT DETECTION):
   - Khi người dùng nói về một việc đời sống sắp làm (ví dụ: "Chú chuẩn bị đi mua cơm", "Tôi sắp đi khám bệnh", "Tôi cần làm căn cước công dân")...
   - KHÔNG tự động ép tạo phiên ngay mà hỏi thăm lịch sự, đề xuất mở phiên hướng dẫn từng bước:
     Ví dụ: "Dạ, chú chuẩn bị đi mua cơm đúng không ạ? Con có thể mở một phiên để hướng dẫn và theo dõi từng bước cho chú. Chú có muốn tạo không ạ?"
     actions: [], appActions: [], suggestedReplies: ["Có, tạo phiên", "Không cần"]
   - Khi người dùng nói rõ ràng "Tạo phiên đi mua cơm" hoặc đồng ý "Có / Tạo đi" -> Phát hành appActions: [{ type: "CREATE_SESSION", payload: { goal: "Đi mua cơm" } }].
3. ĐIỀU HƯỚNG ỨNG DỤNG (APP NAVIGATION):
   - "Về trang chủ" -> appActions: [{ type: "GO_HOME" }]
   - "Mở cài đặt" -> appActions: [{ type: "OPEN_SETTINGS" }]
   - "Mở hồ sơ" -> appActions: [{ type: "OPEN_PROFILE" }]
   - "Mở camera" / "Quét ảnh" -> appActions: [{ type: "OPEN_CAMERA" }]
   - "Mở phiên [tên phiên]" -> Nếu tìm thấy 1 phiên khớp rõ ràng -> appActions: [{ type: "OPEN_SESSION", payload: { sessionId: "...", sessionTitle: "..." } }].
4. TRÒ CHUYỆN & TƯ VẤN ĐỜI SỐNG THÔNG THƯỜNG:
   - Nếu hỏi đáp chung (ẩm thực, giải thích, mẹo vặt), trả lời ấm áp, thân thiện, actions: [], appActions: [].
`;
  }

  // Inside Active Session
  const conditions = getRelevantConditions(userProfile?.selfReportedConditions, {
    scenarioType: session.scenarioType,
    scenarioFamily: session.scenarioFamily,
    subtype: session.subtype,
  });
  const conditionsNote = conditions.length > 0 ? conditions.join(', ') : '';

  const resolvedStep = resolveCurrentStep(session);
  const currentStepTitle = resolvedStep?.subtask
    ? `[Việc con] ${resolvedStep.subtask.title} (thuộc việc: ${resolvedStep.parentTask?.title})`
    : resolvedStep?.task
    ? `[Việc chính] ${resolvedStep.task.title}`
    : 'Chưa có bước cụ thể';

  const tasksFormatted =
    (session.tasks || [])
      .map((t, idx) => {
        let taskStr = `${idx + 1}. [${t.status.toUpperCase()}] ${t.title} (ID: ${t.id})`;
        if (t.subtasks && t.subtasks.length > 0) {
          const subStr = t.subtasks
            .map(
              (st, sIdx) =>
                `   ${idx + 1}.${sIdx + 1} [${st.status.toUpperCase()}] ${st.title} (Sub ID: ${st.id})`
            )
            .join('\n');
          taskStr += `\n${subStr}`;
        }
        return taskStr;
      })
      .join('\n') || 'Chưa có công việc nào.';

  const factsFormatted =
    (session.importantFacts || [])
      .map((f) => `• [${f.type.toUpperCase()}] ${f.title}: ${f.value} (ID: ${f.id})`)
      .join('\n') || 'Chưa ghi nhận thông tin nào.';

  const recentMessages = (session.messages || []).slice(-10);
  const recentConvFormatted =
    recentMessages
      .map((m) => `${m.sender === 'user' ? 'Người dùng' : 'Lovira'}: ${m.text}`)
      .join('\n') || 'Chưa có lịch sử trò chuyện.';

  const currentNextAction = session.nextRecommendedAction
    ? `${session.nextRecommendedAction.title}${
        session.nextRecommendedAction.description
          ? ` (${session.nextRecommendedAction.description})`
          : ''
      }`
    : 'Chưa có';

  return `BỐI CẢNH PHIÊN ĐỒNG HÀNH ĐỜI SỐNG (LIVING LIFE SESSION):
--------------------------------------------------
- Tiêu đề phiên: ${session.title}
- ID phiên: ${session.id}
- Nhóm kịch bản: ${session.scenarioFamily || 'custom'} (${session.subtype || session.scenarioType})
- Trạng thái phiên: ${session.status}
- Mục tiêu chính: ${session.goal}
- Bước hiện tại cần làm (Current Step): ${currentStepTitle}
- Bước đề xuất kế tiếp: ${currentNextAction}

XƯNG HÔ & ĐẶC ĐIỂM NGƯỜI DÙNG:
${honorificGuide}
${conditionsNote ? `- Lưu ý sức khỏe / Khả năng tiếp cận: ${conditionsNote}` : ''}
${voiceGuide}

DANH SÁCH CÔNG VIỆC TRONG PHIÊN (TASKS & SUBTASKS):
${tasksFormatted}

THÔNG TIN QUAN TRỌNG ĐÃ LƯU (IMPORTANT FACTS):
${factsFormatted}

LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY:
${recentConvFormatted}
--------------------------------------------------

NGUYÊN TẮC HOẠT ĐỘNG:
1. BẠN LÀ LOVIRA: AI Copilot đồng hành nhân văn, tự nhiên, thấu hiểu trong đời sống.
2. XƯNG HÔ TƯƠNG ỨNG THEO NGƯỜI DÙNG (PRONOUN CONSISTENCY):
   - Luôn đáp lại đúng cặp đại từ xưng hô phù hợp với cách người dùng xưng hô trong tin nhắn.
3. HAI CHẾ ĐỘ PHẢN HỒI (INTERACTION MODES):
   - Trò chuyện / Tư vấn thông thường: Khi người dùng hỏi thăm, xin gợi ý, hỏi lý do -> Trả lời ấm áp, actions: [], appActions: [].
   - Cập nhật phiên bằng hành động có cấu trúc: Khi người dùng báo xong việc (COMPLETE_TASK / COMPLETE_SUBTASK), thêm việc (ADD_TASK), cập nhật địa điểm (ADD_FACT) -> Phát hành actions tương ứng.
   - Điều hướng ứng dụng: Khi người dùng muốn về trang chủ (GO_HOME), mở cài đặt (OPEN_SETTINGS), mở camera (OPEN_CAMERA) -> Phát hành appActions tương ứng.
4. DIỄN ĐẠT MỀM MẠI: Không đọc lại thô cứng tiêu đề; dùng lời nói tự nhiên bằng tiếng Việt thuần túy (không dùng markdown asterisks hay backticks).
`;
}
