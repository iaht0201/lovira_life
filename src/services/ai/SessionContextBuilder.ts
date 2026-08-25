import { LifeSession, UserProfile, InteractionInputMode, AppInteractionContext } from '../../types';
import { getRelevantConditions } from '../../utils/filterRelevantConditions';
import { resolveCurrentStep } from '../actionEngine';
import { getCapabilityGroundingPrompt } from '../interaction/CapabilityRegistry';
import { deduceHonorifics } from '../conversationStyle';
import { BehaviorService } from '../behaviorService';
import { reminderService } from '../reminderService';

export interface PromptContextOptions {
  session?: LifeSession | null;
  userProfile?: UserProfile | null;
  inputMode?: InteractionInputMode;
  appContext?: AppInteractionContext;
  message?: string;
}

export function buildSessionContextPrompt(
  sessionOrOptions: LifeSession | null | PromptContextOptions,
  legacyUserProfile?: UserProfile | null
): string {
  let session: LifeSession | null | undefined = null;
  let userProfile: UserProfile | null | undefined = null;
  let inputMode: InteractionInputMode = 'text';
  let appContext: AppInteractionContext | undefined = undefined;
  let currentMessage: string | undefined = undefined;

  if (sessionOrOptions && 'id' in sessionOrOptions && 'tasks' in sessionOrOptions) {
    session = sessionOrOptions as LifeSession;
    userProfile = legacyUserProfile;
  } else if (sessionOrOptions) {
    const opts = sessionOrOptions as PromptContextOptions;
    session = opts.session;
    userProfile = opts.userProfile || legacyUserProfile;
    inputMode = opts.inputMode || 'text';
    appContext = opts.appContext;
    currentMessage = opts.message;
  }

  const now = new Date();
  const timeVNString = now.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const nowISO = now.toISOString();

  // Active reminders
  const activeReminders = reminderService.getUpcomingReminders();
  const remindersFormatted =
    activeReminders
      .map(
        (r, idx) =>
          `${idx + 1}. "${r.title}" (ID: ${r.id}, Lúc: ${reminderService.formatReminderDateTime(r.scheduledAt)}, Lặp: ${r.repeat}, Danh mục: ${r.category})`
      )
      .join('\n') || 'Hiện chưa có nhắc nhở nào sắp tới.';

  // Deduce real-time honorific pair based on user's active message & profile
  const honorificContext = deduceHonorifics(userProfile, currentMessage);
  const { addressing, me, isElderly, isYoungerSenior } = honorificContext;

  let honorificGuide = '';
  if (isElderly) {
    honorificGuide = `- Đối tượng: "${addressing}".\n- Xưng hô nhất quán: Lovira xưng "${me}" hoặc "Lovira" — gọi "${addressing}".\n- Giọng điệu: Lễ phép, tự nhiên, ân cần. Mở đầu bằng "Dạ ${addressing}, để ${me}/Lovira..."`;
  } else if (isYoungerSenior) {
    honorificGuide = `- Đối tượng: "${addressing}".\n- Xưng hô nhất quán: Lovira xưng "${me}" hoặc "Lovira" — gọi "${addressing}".\n- Giọng điệu: Tôn trọng, chu đáo, tự nhiên. Mở đầu bằng "Dạ ${addressing}, để ${me}/Lovira..."`;
  } else {
    honorificGuide = `- Đối tượng: "${addressing}".\n- Xưng hô: "Lovira" hoặc "mình" — gọi "${addressing}". Thân thiện, tâm tình, tự nhiên.`;
  }

  // Voice Input instructions
  let voiceGuide = '';
  if (inputMode === 'voice') {
    voiceGuide = `
CHẾ ĐỘ NHẬP LIỆU: GIỌNG NÓI (VOICE INPUT)
- Tin nhắn đến từ nhận diện giọng nói tiếng Việt.
- Sử dụng ngữ cảnh để hiểu đúng ý người dùng dù có lỗi nhận dạng nhỏ.
- Đối với các câu hỏi tự nhiên, phản hồi ngắn gọn, tự nhiên và dễ nghe khi đọc qua loa (TTS).
- Khi người dùng muốn chuyển trang hoặc thao tác (nhắc nhở, cài đặt, camera), phát hành appActions tương ứng.`;
  }

  const fewShotSnippet = BehaviorService.getFewShotPromptSnippet(currentMessage || '');

  const timeContextBlock = `THỜI GIAN THỰC HIỆN TẠI (REAL-TIME CLOCK):
- Giờ địa phương Việt Nam (GMT+7): ${timeVNString}
- Chuẩn ISO 8601 hiện tại: ${nowISO}
- LƯU Ý KHI TẠO NHẮC NHỞ (CREATE_REMINDER):
  + Khi người dùng yêu cầu hẹn giờ/nhắc nhở (ví dụ "ngày mai 7 giờ sáng", "30 phút nữa", "tối nay 8h"), HÃY TÍNH TOÁN chính xác mốc thời gian ISO 8601 dựa trên mốc hiện tại (${nowISO}).
  + Trả lời ấm áp: "Dạ, con đã lên lịch nhắc ${addressing} [nội dung] lúc [giờ] rồi ạ!"
  + appActions: [{ "type": "CREATE_REMINDER", "payload": { "title": "...", "scheduledAt": "ISO_STRING", "category": "medication"|"appointment"|"family"|"general", "repeat": "once"|"daily"|"weekly"|"monthly" } }]

DANH SÁCH NHẮC NHỞ HIỆN CÓ:
${remindersFormatted}`;

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

${timeContextBlock}

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
3. ĐIỀU HƯỚNG ỨNG DỤNG & CÀI ĐẶT (APP NAVIGATION & ACCESSIBILITY):
   - "Về trang chủ" -> appActions: [{ type: "GO_HOME" }]
   - "Mở cài đặt" -> appActions: [{ type: "OPEN_SETTINGS" }]
   - "Mở hồ sơ" -> appActions: [{ type: "OPEN_PROFILE" }]
   - "Mở camera" / "Quét ảnh" -> appActions: [{ type: "OPEN_CAMERA" }]
   - "Mở nhắc nhở" / "Xem lịch trình" -> appActions: [{ type: "OPEN_REMINDERS" }]
   - "Mở phiên [tên phiên]" -> Nếu tìm thấy 1 phiên khớp rõ ràng -> appActions: [{ type: "OPEN_SESSION", payload: { sessionId: "...", sessionTitle: "..." } }].
   - "Chữ to lên" / "Cỡ chữ lớn" -> appActions: [{ type: "UPDATE_ACCESSIBILITY_SETTING", payload: { setting: "fontScale", value: 1.5 } }]
   - "Bật tương phản cao" -> appActions: [{ type: "UPDATE_ACCESSIBILITY_SETTING", payload: { setting: "highContrast", value: true } }]
   - "Bật đọc to câu trả lời" -> appActions: [{ type: "UPDATE_ACCESSIBILITY_SETTING", payload: { setting: "speakResponse", value: true } }]
4. TRÒ CHUYỆN & TƯ VẤN ĐỜI SỐNG THÔNG THƯỜNG:
   - Nếu hỏi đáp chung (ẩm thực, giải thích, mẹo vặt), trả lời ấm áp, thân thiện, actions: [], appActions: [].

HƯỚNG DẪN BẮT BUỘC KHÔNG BỊA CHỨC NĂNG (CAPABILITY CONTRACT):
${getCapabilityGroundingPrompt()}

${fewShotSnippet}
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

  const recentMessages = (session.messages || []).slice(-5);
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

  return `BỐI CẢNH PHIÊN ĐỒNG HÀNH (SESSION):
- Tiêu đề: ${session.title} (ID: ${session.id})
- Trạng thái: ${session.status} | Mục tiêu: ${session.goal}
- Bước hiện tại: ${currentStepTitle} | Bước kế tiếp: ${currentNextAction}

${timeContextBlock}

XƯNG HÔ & NGƯỜI DÙNG:
${honorificGuide}
${conditionsNote ? `- Lưu ý sức khỏe: ${conditionsNote}` : ''}
${voiceGuide}

DANH SÁCH CÔNG VIỆC (TASKS):
${tasksFormatted}

THÔNG TIN ĐÃ LƯU (FACTS):
${factsFormatted}

LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
${recentConvFormatted}

QUY TẮC PHẢN HỒI:
1. 100% TIẾNG VIỆT tự nhiên, thân thiện.
2. Trò chuyện trước, chỉ thay đổi state (actions) khi người dùng hoàn thành/thay đổi nhiệm vụ thực sự.
3. Khi người dùng xác nhận "Xong rồi", "Đã xong", khớp với công việc đang trao đổi -> COMPLETE_TASK.
4. Khi mục tiêu đời thực hoàn tất (đã ăn xong, khám xong, làm xong thủ tục) -> COMPLETE_SESSION.
5. Khi người dùng nhờ hẹn giờ/nhắc nhở -> phát hành appActions: CREATE_REMINDER với scheduledAt chuẩn ISO 8601.

${getCapabilityGroundingPrompt()}
${fewShotSnippet}
`;
}
