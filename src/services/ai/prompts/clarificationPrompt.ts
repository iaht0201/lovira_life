export function buildClarificationPrompt(userInput: string): string {
  return `Người dùng vừa mô tả mục tiêu: "${userInput}"

QUY TẮC NGÔN NGỮ: BẮT BUỘC 100% TIẾNG VIỆT (VIETNAMESE).

Đánh giá xem mô tả này đã đủ cụ thể để lập kế hoạch hành động thật sự chưa.
Một kế hoạch tốt cần biết: việc gì, khi nào, ở đâu/hình thức nào, có yêu cầu
đặc biệt gì không.

Nếu THIẾU thông tin quan trọng để đưa ra các bước hành động cụ thể (không phải
các bước meta như "rà soát", "lập danh sách", "chuẩn bị điều kiện"), hãy đặt
1 câu hỏi ngắn bằng tiếng Việt, thân thiện, gộp tối đa 2 điều cần hỏi nhất — không hỏi dồn
danh sách dài, không hỏi những gì có thể suy luận hợp lý từ ngữ cảnh chung.

Nếu đã đủ để hành động cụ thể, trả về isSpecificEnough: true và không cần hỏi gì thêm.

Trả về DUY NHẤT JSON đúng schema ClarificationCheck, không thêm chữ nào khác.`;
}
