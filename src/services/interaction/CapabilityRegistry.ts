import { AppActionType } from './appActionTypes';

export interface AppCapability {
  name: string;
  actionType: AppActionType;
  description: string;
  parametersDescription?: string;
}

/**
 * Single Source of Truth for all executable app capabilities in Lovira.
 */
export const AVAILABLE_APP_CAPABILITIES: AppCapability[] = [
  {
    name: 'Về trang chủ',
    actionType: 'GO_HOME',
    description: 'Quay lại màn hình trang chủ / danh sách phiên làm việc.',
  },
  {
    name: 'Quay lại màn hình trước',
    actionType: 'GO_BACK',
    description: 'Quay lại màn hình vừa truy cập trước đó.',
  },
  {
    name: 'Mở phiên làm việc',
    actionType: 'OPEN_SESSION',
    description: 'Mở một phiên hỗ trợ đã lưu theo sessionId hoặc tiêu đề.',
    parametersDescription: 'payload: { sessionId?: string, sessionTitle?: string }',
  },
  {
    name: 'Tạo phiên làm việc mới',
    actionType: 'CREATE_SESSION',
    description: 'Tạo một phiên đồng hành mới với mục tiêu cụ thể.',
    parametersDescription: 'payload: { goal: string }',
  },
  {
    name: 'Mở trang nhắc nhở & lịch trình',
    actionType: 'OPEN_REMINDERS',
    description: 'Mở trang quản lý lịch trình, nhắc nhở uống thuốc và cuộc hẹn.',
  },
  {
    name: 'Tạo nhắc nhở / Lên lịch hẹn',
    actionType: 'CREATE_REMINDER',
    description: 'Tạo một nhắc nhở mới với thời gian, tiêu đề, danh mục và lặp lại.',
    parametersDescription: 'payload: { title: string, scheduledAt: string (ISO 8601), category?: "medication"|"appointment"|"family"|"general", repeat?: "once"|"daily"|"weekly"|"monthly", priority?: "normal"|"high", notes?: string }',
  },
  {
    name: 'Cập nhật nhắc nhở',
    actionType: 'UPDATE_REMINDER',
    description: 'Chỉnh sửa thông tin nhắc nhở (tiêu đề, giờ hẹn, ghi chú).',
    parametersDescription: 'payload: { reminderId: string, title?: string, scheduledAt?: string, notes?: string }',
  },
  {
    name: 'Xóa nhắc nhở (hệ thống sẽ hỏi xác nhận)',
    actionType: 'DELETE_REMINDER',
    description: 'Xóa nhắc nhở khỏi hệ thống sau khi được người dùng xác nhận.',
    parametersDescription: 'payload: { reminderId: string, title?: string }',
  },
  {
    name: 'Hoãn nhắc nhở / Báo lại sau',
    actionType: 'SNOOZE_REMINDER',
    description: 'Hoãn nhắc nhở thêm 10 phút, 30 phút, 1 giờ hoặc sang ngày mai.',
    parametersDescription: 'payload: { reminderId: string, snoozePreset?: "10m"|"30m"|"1h"|"tonight"|"tomorrow" }',
  },
  {
    name: 'Đánh dấu hoàn thành nhắc nhở',
    actionType: 'COMPLETE_REMINDER',
    description: 'Đánh dấu nhắc nhở đã thực hiện xong.',
    parametersDescription: 'payload: { reminderId: string }',
  },
  {
    name: 'Ghim / Bỏ ghim phiên',
    actionType: 'PIN_SESSION',
    description: 'Ghim phiên hỗ trợ lên đầu danh sách hoặc bỏ ghim.',
    parametersDescription: 'payload: { sessionId: string }',
  },
  {
    name: 'Lưu trữ / Bỏ lưu trữ phiên',
    actionType: 'ARCHIVE_SESSION',
    description: 'Chuyển phiên đã hoàn thành vào mục lưu trữ hoặc khôi phục.',
    parametersDescription: 'payload: { sessionId: string }',
  },
  {
    name: 'Mở cài đặt',
    actionType: 'OPEN_SETTINGS',
    description: 'Mở trang cài đặt trợ năng, tuỳ chọn âm thanh và giao diện.',
  },
  {
    name: 'Mở hồ sơ cá nhân',
    actionType: 'OPEN_PROFILE',
    description: 'Mở trang thông tin người dùng và tình trạng sức khỏe.',
  },
  {
    name: 'Mở camera / Trợ lý thị giác',
    actionType: 'OPEN_CAMERA',
    description: 'Mở camera trợ lý thị giác để quét văn bản, toa thuốc hoặc bảng hiệu.',
  },
  {
    name: 'Cập nhật cài đặt trợ năng',
    actionType: 'UPDATE_ACCESSIBILITY_SETTING',
    description: 'Bật/tắt chế độ tương phản cao, đọc to, ngôn ngữ ký hiệu, v.v.',
    parametersDescription: 'payload: { setting: "highContrast"|"speakResponse"|"vslEnabled"|"reducedMotion", value: boolean }',
  },
];

export const UNAVAILABLE_CAPABILITIES_LIST: string[] = [
  'Bản đồ, GPS, định vị vị trí, tìm đường hay mở ứng dụng Google Maps trực tiếp',
  'Gọi điện thoại, gửi tin nhắn SMS ra ngoài thiết bị',
  'Đặt xe taxi / Grab / đặt bàn ăn nhà hàng / thanh toán tiền qua ví điện tử bên ngoài',
  'Gửi email tự động ra bên ngoài',
];

/**
 * Returns strict system instructions on app capabilities to prevent AI hallucination.
 */
export function getCapabilityGroundingPrompt(): string {
  const capabilitiesFormatted = AVAILABLE_APP_CAPABILITIES.map(
    (c) => `- ${c.actionType}: ${c.description}${c.parametersDescription ? ` (${c.parametersDescription})` : ''}`
  ).join('\n');

  const unavailableFormatted = UNAVAILABLE_CAPABILITIES_LIST.map((u) => `- ${u}`).join('\n');

  return `
==================================================
CAPABILITY GROUNDING CONTRACT — QUY TẮC NĂNG LỰC BẮT BUỘC (CRITICAL):
--------------------------------------------------
1. HỆ THỐNG HỖ TRỢ ĐẦY ĐỦ CÁC NĂNG LỰC ĐIỀU HƯỚNG/THAO TÁC ỨNG DỤNG SAU (AVAILABLE_APP_CAPABILITIES):
${capabilitiesFormatted}

2. CÁC NĂNG LỰC NGOÀI HỆ THỐNG KHÔNG CÓ (UNAVAILABLE CAPABILITIES):
${unavailableFormatted}

3. QUY TẮC CHỐNG ẢO GIÁC NĂNG LỰC & XỬ LÝ NHẮC NHỞ (ANTI-HALLUCINATION CONTRACT):
- ĐỐI VỚI NHẮC NHỞ & LỊCH TRÌNH: Ứng dụng Lovira ĐÃ CÓ TÍNH NĂNG NHẮC NHỞ & LỊCH TRÌNH THẬT SỰ (CREATE_REMINDER, SNOOZE_REMINDER, COMPLETE_REMINDER, DELETE_REMINDER, OPEN_REMINDERS).
  Khi người dùng nhờ nhắc nhở (ví dụ: "Mai 7h sáng nhắc tôi mang CCCD đi khám", "30 phút nữa nhắc tôi uống thuốc"), bạn HÃY PHÁT HÀNH appActions CREATE_REMINDER tương ứng và trả lời xác nhận rõ ràng, ấm áp.
- ĐỐI VỚI XÓA NHẮC NHỞ: Luôn hỏi xác nhận trước khi xóa, phát hành DELETE_REMINDER.
- TUYỆT ĐỐI KHÔNG giả lập tính năng ngoài hệ thống như "đang mở Google Maps", "đã gọi xe Grab", "đã chuyển khoản ngân hàng", "đã gửi email".
- Khi người dùng nhờ việc ngoài hệ thống (ví dụ: "tìm đường", "gọi xe giúp tôi"):
  + Hãy giải thích ngắn gọn, từ tốn rằng Lovira chưa hỗ trợ mở bản đồ hoặc gọi xe trực tiếp.
  + Sau đó tiếp tục đồng hành bằng lời khuyên, gợi ý các việc cần chuẩn bị hoặc dặn dò người dùng.
  + ĐỂ "actions": [] VÀ "appActions": [].
- GỢI Ý NHANH (suggestedReplies) TUÂN THỦ NGHIÊM NGẶT NGUYÊN TẮC NÀY:
  + Tuyệt đối không sinh nút gợi ý như "Xem bản đồ", "Xem danh sách cửa hàng", "Chọn cửa hàng này".
  + Chỉ gợi ý những câu nói tự nhiên của người dùng (ví dụ: "Đã chuẩn bị xong", "Giờ làm gì tiếp", "Nhờ tư vấn thêm").
- KHI NGƯỜI DÙNG CHỈ CHAT, XIN Ý KIẾN HOẶC HỎI GỢI Ý (ví dụ: "bạn gợi ý cho mình đi", "cháu 10 tuổi thích gì"):
  + Trả lời đầy đủ, gợi ý chi tiết, ấm áp và thực tế.
  + BẮT BUỘC để "actions": [] và "appActions": [] (Tuyệt đối không phát hành action rỗng hoặc action không hợp lệ).
==================================================
`;
}
