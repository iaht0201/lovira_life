export interface ClarificationCheck {
  isSpecificEnough: boolean;
  missingInfo?: string[];        // ví dụ: ["hình thức phỏng vấn", "giờ giấc/địa điểm"]
  clarifyingQuestion?: string;   // 1 câu hỏi ngắn, gộp tối đa 2 điều cần hỏi
}
