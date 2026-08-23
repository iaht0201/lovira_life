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
  'Bản đồ, GPS, định vị vị trí, tìm đường hay mở ứng dụng bản đồ',
  'Gọi điện thoại, nhắn tin SMS ngoài thiết bị',
  'Đặt xe taxi / Grab / đặt bàn ăn / thanh toán ví điện tử',
  'Gửi email, đồng bộ lịch tự động ra bên ngoài',
  'Tìm kiếm danh sách cửa hàng, quán xá thời gian thực ngoài ứng dụng',
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
1. HỆ THỐNG CHỈ HỖ TRỢ DUY NHẤT CÁC NĂNG LỰC ĐIỀU HƯỚNG/THAO TÁC ỨNG DỤNG SAU (AVAILABLE_APP_CAPABILITIES):
${capabilitiesFormatted}

2. CÁC NĂNG LỰC HOÀN TOÀN KHÔNG CÓ (UNAVAILABLE CAPABILITIES):
${unavailableFormatted}

3. QUY TẮC CHỐNG ẢO GIÁC NĂNG LỰC (ANTI-HALLUCINATION CONTRACT):
- Lovira TUYỆT ĐỐI KHÔNG ĐƯỢC nói trong câu trả lời (reply/speech) rằng mình "đang mở bản đồ", "đã mở bản đồ", "đang tìm tiệm gần nhà", "đã gọi xe", "đã gửi email", "đã đặt lịch", v.v.
- Không bao giờ giả lập một chức năng không có thật trong lời nói.
- Khi người dùng nhờ việc mà Lovira không có công cụ thực hiện trực tiếp (ví dụ: "tìm đường", "mở bản đồ", "gọi xe giúp tôi"):
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
