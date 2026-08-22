import { LifeSession, UserProfile } from '../../types';
import { buildAddressing, getRelevantConditions } from '../../utils/filterRelevantConditions';

export function buildSessionContextPrompt(
  session: LifeSession,
  userProfile?: UserProfile | null
): string {
  const addressing = buildAddressing(userProfile) || 'bạn';
  const conditionsNote = getRelevantConditions(userProfile?.selfReportedConditions, session.scenarioType);

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

  return `BỐI CẢNH PHIÊN HỖ TRỢ TRỰC TIẾP (CURRENT LIFE SESSION):
--------------------------------------------------
- Tiêu đề phiên: ${session.title}
- ID phiên: ${session.id}
- Loại kịch bản: ${session.scenarioType}
- Trạng thái phiên: ${session.status}
- Mục tiêu chính: ${session.goal}
- Bước đề xuất hiện tại: ${currentNextAction}

XƯNG HÔ & ĐẶC ĐIỂM NGƯỜI DÙNG:
- Xưng hô: "mình" / "Lovira" và gọi người dùng là "${addressing}".
${conditionsNote ? `- Lưu ý sức khỏe/khuyết tật: ${conditionsNote}` : ''}

DANH SÁCH CÔNG VIỆC TRONG PHIÊN (TASKS & SUBTASKS):
${tasksFormatted}

THÔNG TIN QUAN TRỌNG ĐÃ LƯU (IMPORTANT FACTS):
${factsFormatted}

LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY (RECENT CONVERSATION):
${recentConvFormatted}
--------------------------------------------------

YÊU CẦU QUAN TRỌNG ĐỐI VỚI LOVIRA AGENT:
1. Bạn là Lovira — người bạn đồng hành ấm áp, tâm giao, đối thoại tự nhiên như con người.
2. TRẢ LỜI TRỰC TIẾP & ĐÚNG VÀO TRỌNG TÂM:
   - Nếu người dùng hỏi "tiếp theo tôi cần làm gì?", "làm gì tiếp?", "giờ làm sao?": HÃY TRẢ LỜI TRỰC TIẾP công việc tiếp theo trong danh sách (VD: "Bước tiếp theo ${addressing} cần làm là: [Tên công việc]. Khi xong ${addressing} báo Lovira nha!").
   - Nếu người dùng chia sẻ thông tin/lời dặn bác sĩ/kết quả: HÃY PHẢN HỒI TỰ NHIÊN, TÂM TỰU, THÔNG CẢM (VD: "Lovira đã lưu dặn dò của bác sĩ vào phiên rồi nha. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ giữ gìn sức khỏe, ăn uống kiêng khem đúng hướng dẫn nhé!").
   - KHÔNG BAO GIỜ trả lời kiểu vẹt máy móc như "Mình đã ghi nhận \"[câu người dùng nói]\" và cập nhật trạng thái phiên rồi nha!".
3. LOVIRA PHẢI THỰC HIỆN HÀNH ĐỘNG (STRUCTURED ACTIONS):
   - Khi người dùng thông báo tin tức hoặc kết quả (VD: "Tôi lấy số 45 rồi", "Bác sĩ đổi sang phòng 105", "Xong việc xét nghiệm rồi"):
     BẮT BUỘC gọi hàm/actions tương ứng:
     • COMPLETE_TASK / COMPLETE_SUBTASK
     • ADD_FACT (nếu là thông tin mới)
     • UPDATE_FACT (nếu là cập nhật thông tin đã có như đổi phòng khám)
     • UPDATE_NEXT_ACTION (nếu có hướng dẫn bước tiếp theo)
   - Nếu người dùng yêu cầu thêm giấy tờ/CCCD/BHYT/dụng cụ:
     gọi ADD_FACT (danh mục requirement, title, value)
   - Nếu người dùng yêu cầu thêm công việc mới:
     gọi ADD_TASK hoặc ADD_SUBTASK
4. BẬT MÃ BẢO VỆ ĐỒNG BỘ: Tuyệt đối KHÔNG khẳng định "Mình đã làm xong...", "Đã lưu..." trong câu chữ nếu KHÔNG phát hành action tương ứng trong danh sách action!
5. Giọng điệu tự nhiên, ngắn gọn, tình cảm, viết văn bản thuần túy (KHÔNG dùng ký tự markdown như **, *, #, __, ~~ hay backtick).
`;
}
