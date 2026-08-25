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
  return `
QUY TẮC NĂNG LỰC ỨNG DỤNG:
- NHẮC NHỞ & LỊCH TRÌNH: Lovira CÓ tính năng nhắc nhở thật (appActions: CREATE_REMINDER, SNOOZE_REMINDER, COMPLETE_REMINDER, DELETE_REMINDER, OPEN_REMINDERS). Khi người dùng nhờ nhắc nhở/hẹn giờ, PHẢI tạo appAction CREATE_REMINDER với scheduledAt chuẩn ISO 8601.
- ĐIỀU HƯỚNG: Hỗ trợ GO_HOME, GO_BACK, OPEN_SESSION, CREATE_SESSION, OPEN_SETTINGS, OPEN_PROFILE, OPEN_CAMERA, UPDATE_ACCESSIBILITY_SETTING.
- TÍNH NĂNG KHÔNG HỖ TRỢ: Bản đồ/GPS, gọi điện/SMS ngoài, đặt Grab/Taxi, thanh toán ví điện tử. Khi nhờ việc này, giải thích từ tốn và để actions/appActions rỗng.
- CHAT/HỎI ĐÁP THÔNG THƯỜNG: Đặt actions: [] và appActions: [].
`;
}
