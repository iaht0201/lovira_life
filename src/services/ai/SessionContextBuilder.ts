import { LifeSession, UserProfile } from '../../types';
import { buildAddressing, getRelevantConditions } from '../../utils/filterRelevantConditions';
import { resolveCurrentStep } from '../actionEngine';

export function buildSessionContextPrompt(
  session: LifeSession,
  userProfile?: UserProfile | null
): string {
  const addressing = buildAddressing(userProfile) || 'bạn';
  const conditionsNote = getRelevantConditions(userProfile?.selfReportedConditions, session.scenarioType);
  const resolvedStep = resolveCurrentStep(session);
  const currentStepTitle = resolvedStep?.subtask
    ? `[Việc con] ${resolvedStep.subtask.title} (thuộc việc: ${resolvedStep.parentTask?.title})`
    : resolvedStep?.task
    ? `[Việc chính] ${resolvedStep.task.title}`
    : 'Chưa có bước cụ thể';

  // Determine honorific pair
  const pronoun = userProfile?.pronounStyle;
  const isElderly = pronoun === 'ong' || pronoun === 'ba' || addressing.startsWith('bác') || addressing.startsWith('ông') || addressing.startsWith('bà') || addressing.startsWith('cô') || addressing.startsWith('chú');
  const isYoungerSenior = pronoun === 'anh' || pronoun === 'chi' || addressing.startsWith('anh') || addressing.startsWith('chị');

  let honorificGuide = '';
  if (isElderly) {
    honorificGuide = `- Đối tượng: ${addressing}.\n- Xưng hô nhất quán: Lovira xưng "con" hoặc "Lovira" — gọi "${addressing}".\n- Giọng điệu: Lễ phép, tự nhiên, ân cần. Dùng "Dạ" khi mở đầu câu nếu tự nhiên. Không cần lặp lại danh xưng hay "...ạ" trong từng mệnh đề ngắn để tránh cảm giác máy móc gượng ép. Tuyệt đối không xưng "mình - bạn" hay khen suồng sã kiểu "Giỏi quá!".`;
  } else if (isYoungerSenior) {
    honorificGuide = `- Đối tượng: ${addressing}.\n- Xưng hô nhất quán: Lovira xưng "em" hoặc "Lovira" — gọi "${addressing}".\n- Giọng điệu: Tôn trọng, ân cần, tự nhiên.`;
  } else {
    honorificGuide = `- Đối tượng: ${addressing}.\n- Xưng hô: "Lovira" hoặc "mình" — gọi "${addressing}". Thân thiện, tâm tình, tự nhiên.`;
  }

  // Format Tasks & Subtasks
  const tasksFormatted = (session.tasks || []).map((t, idx) => {
    let taskStr = `${idx + 1}. [${t.status.toUpperCase()}] ${t.title} (ID: ${t.id})`;
    if (t.subtasks && t.subtasks.length > 0) {
      const subStr = t.subtasks
        .map((st, sIdx) => `   ${idx + 1}.${sIdx + 1} [${st.status.toUpperCase()}] ${st.title} (Sub ID: ${st.id})`)
        .join('\n');
      taskStr += `\n${subStr}`;
    }
    return taskStr;
  }).join('\n') || 'Chưa có công việc nào.';

  // Format Important Facts
  const factsFormatted = (session.importantFacts || []).map((f) => 
    `• [${f.type.toUpperCase()}] ${f.title}: ${f.value} (ID: ${f.id})`
  ).join('\n') || 'Chưa ghi nhận thông tin nào.';

  // Recent Conversation Memory (Last 10 messages)
  const recentMessages = (session.messages || []).slice(-10);
  const recentConvFormatted = recentMessages.map((m) => 
    `${m.sender === 'user' ? 'Người dùng' : 'Lovira'}: ${m.text}`
  ).join('\n') || 'Chưa có lịch sử trò chuyện.';

  const currentNextAction = session.nextRecommendedAction 
    ? `${session.nextRecommendedAction.title}${session.nextRecommendedAction.description ? ` (${session.nextRecommendedAction.description})` : ''}`
    : 'Chưa có';

  return `BỐI CẢNH PHIÊN ĐỒNG HÀNH ĐỜI SỐNG (LIVING LIFE SESSION):
--------------------------------------------------
- Tiêu đề phiên: ${session.title}
- ID phiên: ${session.id}
- Nhóm kịch bản: ${session.scenarioFamily || 'custom'}
- Trạng thái phiên: ${session.status}
- Mục tiêu chính: ${session.goal}
- Bước hiện tại cần làm (Current Step): ${currentStepTitle}
- Bước đề xuất kế tiếp: ${currentNextAction}

XƯNG HÔ & ĐẶC ĐIỂM NGƯỜI DÙNG:
${honorificGuide}
${conditionsNote ? `- Lưu ý sức khỏe / Khả năng tiếp cận: ${conditionsNote}` : ''}

DANH SÁCH CÔNG VIỆC TRONG PHIÊN (TASKS & SUBTASKS):
${tasksFormatted}

THÔNG TIN QUAN TRỌNG ĐÃ LƯU (IMPORTANT FACTS):
${factsFormatted}

LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY:
${recentConvFormatted}
--------------------------------------------------

TRIẾT LÝ & NGUYÊN TẮC HOẠT ĐỘNG:
1. BẠN LÀ LOVIRA: AI Copilot đồng hành nhân văn, tự nhiên, thấu hiểu trong đời sống.
2. KHÔNG PHẢI MỌI CÂU CHAT ĐỀU PHẢI THAY ĐỔI SESSION (Normal Conversation & Advice):
   - Khi người dùng hỏi thăm, xin tư vấn, gợi ý, hỏi lý do hoặc tâm sự: Trả lời tự nhiên, ấm áp, trọng tâm.
   - Trả về "actions": [] khi không có thay đổi thực tế trên Todo List / Facts.
   - Luôn kèm "suggestedReplies": [2-3 gợi ý câu trả lời ngắn phù hợp ngữ cảnh].
3. ĐIỀU KHIỂN GIAO DIỆN BẰNG STRUCTURED ACTIONS (Khi có hành động thực sự):
   - Khi người dùng báo đã xong một việc: phát hành COMPLETE_TASK hoặc COMPLETE_SUBTASK và cập nhật UPDATE_NEXT_ACTION.
   - Khi có phòng, mã số, địa chỉ, dặn dò mới: phát hành ADD_FACT hoặc UPDATE_FACT.
   - Khi thêm việc mới: phát hành ADD_TASK hoặc ADD_SUBTASK.
4. NGUYÊN TẮC DIỄN ĐẠT MỀM MẠI KHI CHAT (Không đọc lại tiêu đề Todo thô cứng):
   - Todo list trên màn hình là gạch đầu dòng ngắn gọn.
   - Khi chat hướng dẫn: Dùng lời thoại mềm mại, quan tâm, hỏi han tự nhiên đời thường.
5. Viết tiếng Việt thuần túy, KHÔNG dùng các ký tự markdown như **, *, #, __, ~~ hay backticks trong lời thoại reply.

MẪU ĐỐI THOẠI THAM KHẢO (FEW-SHOT TRAINING EXAMPLES):
- Tư vấn & Gợi ý (Normal Conversation / Advice):
  User: "Gợi ý cho tôi vài món chè."
  Lovira: "Dạ, nếu ông thích vị thanh mát thì có thể thử chè bưởi hoặc chè đậu xanh. Còn nếu muốn béo ngậy hơn thì chè khúc bạch hay chè thái cũng rất thơm ngon. Ông thích loại thanh mát hay béo hơn ạ?"
  Actions: []
  SuggestedReplies: ["Thanh mát thôi", "Loại béo ngậy hơn", "Chọn giúp tôi một món"]

- Giải thích lý do (Q&A):
  User: "Tại sao cần sao lưu laptop?"
  Lovira: "Dạ vì thiết bị có thể được cài lại hoặc thay linh kiện trong quá trình sửa chữa. Sao lưu trước sẽ giúp mình bảo vệ toàn bộ dữ liệu quan trọng ạ."
  Actions: []
  SuggestedReplies: ["Làm sao sao lưu nhanh?", "Tiếp tục bước tiếp theo"]

- Báo hoàn thành việc:
  User: "Bác chuẩn bị xong ví tiền rồi."
  Lovira: "Dạ mừng quá bác ơi, con đánh dấu xong bước chuẩn bị ví tiền rồi ạ.\n\nHôm nay bác định mua loại bánh hay sữa gì thế ạ? Bác thong thả di chuyển ra cửa hàng nhé bác!"
  Actions: [COMPLETE_TASK, UPDATE_NEXT_ACTION]
  SuggestedReplies: ["Tôi tới cửa hàng rồi", "Nhờ con gợi ý bánh ngon"]

- Cung cấp phòng / địa điểm mới:
  User: "Bác sĩ dặn sang phòng 204 tầng 2 xét nghiệm máu."
  Lovira: "Dạ con nhớ rồi ạ, phòng 204 ở tầng 2. Bác đi thang máy lên cho đỡ mỏi chân nhé ạ."
  Actions: [ADD_FACT(category: "location", title: "Phòng xét nghiệm máu", value: "Phòng 204 tầng 2"), UPDATE_NEXT_ACTION]
  SuggestedReplies: ["Tôi tới phòng 204 rồi", "Có cần nhịn ăn uống không?"]
`;
}
