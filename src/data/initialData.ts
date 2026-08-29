import { LifeSession, ModelProfile } from '../types.js';

export const MODEL_POOL: ModelProfile[] = [
  { id: "openai/gpt-oss-20b", provider: "groq", capability: "fast", supportsVision: false, supportsToolCalling: true },
  { id: "openai/gpt-oss-120b", provider: "groq", capability: "reasoning", supportsVision: false, supportsToolCalling: true },
  { id: "qwen/qwen3.6-27b", provider: "groq", capability: "conversation", supportsVision: false, supportsToolCalling: true },
  { id: "groq/compound-mini", provider: "groq", capability: "fast", supportsVision: false, supportsToolCalling: true },
  { id: "groq/compound", provider: "groq", capability: "reasoning", supportsVision: false, supportsToolCalling: true },
  { id: "gemini-3.7-flash", provider: "gemini", capability: "fast", supportsVision: true, supportsToolCalling: true },
  { id: "gemini-2.5-flash", provider: "gemini", capability: "conversation", supportsVision: true, supportsToolCalling: true },
  { id: "gemini-2.5-pro", provider: "gemini", capability: "reasoning", supportsVision: true, supportsToolCalling: true },
];

export const DEMO_MEDICAL_SESSION: LifeSession = {
  id: "session-medical-2208",
  title: "🏥 Đi khám bệnh",
  scenarioType: "medical",
  scenarioFamily: "healthcare",
  subtype: "general_medical",
  modules: ["appointment", "documents", "navigation", "queue", "instructions", "followUp"],
  status: "active",
  goal: "Hoàn thành buổi khám, biết đúng phòng khám, ghi nhớ lời dặn của bác sĩ và lịch tái khám.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentStepId: "task-get-number",
  nextRecommendedAction: {
    title: "Lấy số thứ tự",
    description: "Đến quầy tiếp nhận hoặc cây bốc số tự động",
    taskId: "task-get-number"
  },
  importantFacts: [],
  tasks: [
    {
      id: "task-get-number",
      title: "Lấy số thứ tự",
      description: "Đến quầy tiếp nhận hoặc cây bốc số tự động",
      order: 1,
      status: "pending",
      important: true
    },
    {
      id: "task-go-room",
      title: "Đến phòng khám được chỉ định",
      description: "Đến đúng phòng khám và chờ gọi số thứ tự",
      order: 2,
      status: "pending"
    },
    {
      id: "task-doctor",
      title: "Khám bác sĩ",
      description: "Gặp bác sĩ, mô tả triệu chứng và lắng nghe chẩn đoán",
      order: 3,
      status: "pending"
    },
    {
      id: "task-test",
      title: "Thực hiện xét nghiệm nếu được yêu cầu",
      description: "Lấy máu, xét nghiệm hoặc chụp X-Quang theo chỉ định",
      order: 4,
      status: "pending"
    },
    {
      id: "task-result",
      title: "Nhận kết quả",
      description: "Lấy kết quả xét nghiệm và quay lại phòng khám",
      order: 5,
      status: "pending"
    },
    {
      id: "task-medicine",
      title: "Nhận đơn thuốc",
      description: "Mua thuốc hoặc nhận thuốc BHYT theo đơn",
      order: 6,
      status: "pending"
    },
    {
      id: "task-revisit",
      title: "Lưu lịch tái khám",
      description: "Ghi nhớ ngày và giờ tái khám do bác sĩ hẹn",
      order: 7,
      status: "pending"
    }
  ],
  resources: [],
  messages: [
    {
      id: "msg-1",
      sender: "lovira",
      text: "Xin chào! Tôi là Lovira. Tôi sẽ đồng hành cùng bạn trong buổi khám bệnh hôm nay. Bây giờ bạn hãy lấy số thứ tự nhé!",
      timestamp: new Date().toISOString()
    }
  ],
  actionLog: [
    {
      id: "log-1",
      timestamp: new Date().toISOString(),
      actionType: "INIT_SESSION",
      summary: "Khởi tạo phiên Đi khám bệnh",
      triggeredBy: "system"
    }
  ]
};

export const SCENARIO_TEMPLATES = [
  {
    type: "medical" as const,
    title: "🏥 Đi khám bệnh",
    subtitle: "Tạo danh mục chuẩn bị, nhắc số phòng, chụp đơn thuốc & lưu dặn dò bác sĩ",
    icon: "Stethoscope",
    defaultGoal: "Hoàn thành buổi khám bệnh, chuẩn bị đầy đủ giấy tờ, nghe dặn dò và theo dõi lịch hẹn tái khám.",
    defaultTasks: [
      "Quét phiếu khám hoặc lấy số thứ tự",
      "Đến phòng khám được chỉ định",
      "Nghe và ghi lại lời dặn của bác sĩ",
      "Lấy máu / xét nghiệm theo chỉ định",
      "Nhận kết quả & mua thuốc",
      "Lưu lịch tái khám"
    ],
    defaultFacts: []
  },
  {
    type: "administrative" as const,
    title: "🏛️ Làm thủ tục hành chính",
    subtitle: "Làm CCCD, đăng ký thường trú, xác nhận tài khoản, nộp hồ sơ bộ phận 1 cửa",
    icon: "Landmark",
    defaultGoal: "Làm xong thủ tục hành chính đúng quầy, đầy đủ giấy tờ photo & bản chính.",
    defaultTasks: [
      "Kiểm tra danh mục giấy tờ bản chính & bản sao",
      "Bốc số thứ tự quầy giải quyết",
      "Khai form / mẫu đơn theo hướng dẫn",
      "Nộp hồ sơ & nộp lệ phí",
      "Lưu giấy hẹn lấy kết quả"
    ],
    defaultFacts: []
  },
  {
    type: "shopping" as const,
    title: "🛒 Đi mua sắm & Siêu thị",
    subtitle: "Soạn danh sách cần mua, dùng camera xem nhãn giá & hạn sử dụng, tính tiền",
    icon: "ShoppingBag",
    defaultGoal: "Mua đúng danh sách cần thiết, kiểm tra giá & hạn dùng đồ yếu phẩm.",
    defaultTasks: [
      "Soạn danh sách món đồ cần mua",
      "Đến gian hàng rau củ / thực phẩm tươi",
      "Kiểm tra hạn sử dụng & giá tiền",
      "Thanh toán tại quầy thu ngân"
    ],
    defaultFacts: []
  },
  {
    type: "document" as const,
    title: "📄 Đọc & Hiểu tài liệu",
    subtitle: "Chụp ảnh hợp đồng, đơn thuốc, thư từ, thông báo để Lovira đọc to & tóm tắt",
    icon: "FileText",
    defaultGoal: "Tóm tắt các điểm cốt lõi, nghĩa vụ và mốc thời gian quan trọng trong tài liệu.",
    defaultTasks: [
      "Chụp ảnh hoặc chọn tệp tài liệu",
      "Lovira đọc & trích xuất nội dung",
      "Xem thông tin quan trọng & cảnh báo",
      "Lưu các ngày hạn chót"
    ],
    defaultFacts: []
  },
  {
    type: "custom" as const,
    title: "🌟 Phiên tùy chỉnh",
    subtitle: "Mô tả bất kỳ việc gì bạn cần làm (Phỏng vấn, bảo hành, du lịch, ngân hàng, sinh hoạt...)",
    icon: "Sparkles",
    defaultGoal: "",
    defaultTasks: [],
    defaultFacts: []
  }
];
