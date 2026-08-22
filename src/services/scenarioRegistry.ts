import { ScenarioFamily, LifeModule, ImportantFactType } from '../types';

export interface ScenarioRegistryEntry {
  family: ScenarioFamily;
  label: string;
  icon: string;
  description: string;
  defaultModules: LifeModule[];
  keywords: string[];
  suggestedTasks: {
    title: string;
    description?: string;
    order: number;
    important?: boolean;
    subtasks?: { title: string; order: number }[];
  }[];
  suggestedRequirements?: {
    type: ImportantFactType;
    title: string;
    value: string;
  }[];
}

export const SCENARIO_REGISTRY: Record<ScenarioFamily, ScenarioRegistryEntry> = {
  healthcare: {
    family: 'healthcare',
    label: '🏥 Sức khỏe & Đi khám',
    icon: 'Hospital',
    description: 'Khám bệnh, xét nghiệm, lấy thuốc, theo dõi chỉ dẫn bác sĩ và tái khám.',
    defaultModules: ['appointment', 'documents', 'navigation', 'queue', 'instructions', 'followUp'],
    keywords: ['khám', 'bệnh', 'bác sĩ', 'bệnh viện', 'phòng khám', 'xét nghiệm', 'lấy máu', 'thuốc', 'đơn thuốc', 'tái khám', 'bhyt', 'sức khỏe'],
    suggestedTasks: [
      { title: 'Lấy số thứ tự', description: 'Đến quầy tiếp nhận hoặc cây bốc số tự động', order: 1, important: true },
      { title: 'Đến phòng khám được chỉ định', description: 'Đến đúng phòng khám và chờ gọi số', order: 2, important: true },
      { title: 'Khám bác sĩ', description: 'Gặp bác sĩ, mô tả triệu chứng và lắng nghe chẩn đoán', order: 3, important: true },
      { title: 'Thực hiện xét nghiệm nếu được yêu cầu', description: 'Lấy máu, xét nghiệm hoặc chụp X-Quang theo chỉ định', order: 4 },
      { title: 'Nhận kết quả', description: 'Lấy kết quả xét nghiệm và quay lại phòng khám', order: 5 },
      { title: 'Nhận đơn thuốc', description: 'Mua thuốc hoặc nhận thuốc BHYT theo đơn', order: 6 },
      { title: 'Lưu lịch tái khám', description: 'Ghi nhớ ngày và giờ tái khám do bác sĩ hẹn', order: 7 }
    ],
    suggestedRequirements: [
      { type: 'requirement', title: 'Giấy tờ tham khảo', value: 'CCCD gắn chip & Thẻ BHYT' }
    ]
  },
  administrative: {
    family: 'administrative',
    label: '🏛️ Thủ tục & Dịch vụ công',
    icon: 'Building2',
    description: 'Làm CCCD, hộ chiếu, khai sinh, hồ sơ bảo hiểm, thuế, thủ tục hành chính.',
    defaultModules: ['documents', 'navigation', 'queue', 'deadline', 'followUp'],
    keywords: ['hành chính', 'thủ tục', 'cccd', 'hộ chiếu', 'khai sinh', 'giấy tờ', 'bảo hiểm', 'thuế', 'phường', 'quận', 'mã hồ sơ', 'giấy hẹn'],
    suggestedTasks: [
      { title: 'Kiểm tra giấy tờ và yêu cầu thủ tục', description: 'Đảm bảo mang đủ bản chính, bản sao và tờ khai', order: 1, important: true },
      { title: 'Đến cơ quan tiếp nhận hồ sơ', description: 'Đến đúng trụ sở hoặc bộ phận 1 cửa', order: 2, important: true },
      { title: 'Lấy số thứ tự', description: 'Bốc số tại quầy tiếp nhận', order: 3 },
      { title: 'Nộp hồ sơ & Chờ đối chiếu', description: 'Gặp cán bộ tiếp nhận để kiểm tra giấy tờ', order: 4 },
      { title: 'Nhận giấy hẹn kết quả hoặc mã hồ sơ', description: 'Lưu mã tra cứu hoặc ngày trả kết quả', order: 5, important: true }
    ],
    suggestedRequirements: [
      { type: 'requirement', title: 'Giấy tờ tham khảo', value: 'CCCD bản gốc & Tờ khai theo mẫu' }
    ]
  },
  shopping: {
    family: 'shopping',
    label: '🛒 Mua sắm & Đi chợ',
    icon: 'ShoppingCart',
    description: 'Lập danh sách mua hàng, siêu thị, thực phẩm, đồ gia dụng, mua sắm.',
    defaultModules: ['shoppingList', 'checklist', 'notes'],
    keywords: ['mua', 'sắm', 'chợ', 'siêu thị', 'thực phẩm', 'đồ dùng', 'danh sách', 'sữa', 'thịt', 'rau'],
    suggestedTasks: [
      { title: 'Kiểm tra danh sách đồ cần mua', description: 'Xác định các món ưu tiên trước', order: 1, important: true },
      { title: 'Di chuyển đến cửa hàng / siêu thị', description: 'Đến địa điểm mua sắm', order: 2 },
      { title: 'Đánh dấu từng món đã chọn', description: 'Nhặt đồ và tích vào danh sách', order: 3 },
      { title: 'Thanh toán & Kiểm tra hóa đơn', description: 'Thanh toán tại quầy và kiểm tra lại đồ', order: 4 }
    ]
  },
  documents: {
    family: 'documents',
    label: '📄 Giấy tờ & Hiểu tài liệu',
    icon: 'FileText',
    description: 'Đọc hiểu hóa đơn, thông báo, hợp đồng, phiếu khám, giấy hẹn.',
    defaultModules: ['documents', 'instructions', 'notes'],
    keywords: ['giấy tờ', 'hóa đơn', 'thông báo', 'hợp đồng', 'phiếu', 'tài liệu', 'giấy hẹn', 'đọc', 'hiểu'],
    suggestedTasks: [
      { title: 'Chụp hoặc tải lên văn bản', description: 'Dùng camera hoặc chọn file để Lovira phân tích', order: 1, important: true },
      { title: 'Xem các thông tin quan trọng đã trích xuất', description: 'Kiểm tra ngày, số tiền, địa điểm và mã tra cứu', order: 2 },
      { title: 'Lưu lịch hẹn hoặc nhiệm vụ liên quan', description: 'Tự động tạo nhắc nhở từ văn bản', order: 3 }
    ]
  },
  mobility: {
    family: 'mobility',
    label: '🚌 Đi lại & Di chuyển',
    icon: 'Bus',
    description: 'Tìm đường, xe buýt, xe lăn, lối tiếp cận, di chuyển an toàn.',
    defaultModules: ['navigation', 'warnings', 'notes'],
    keywords: ['đi lại', 'di chuyển', 'xe buýt', 'xe lăn', 'tìm đường', 'chuyến', 'đến nơi', 'bến xe', 'ga'],
    suggestedTasks: [
      { title: 'Xác định điểm đến & phương tiện', description: 'Chọn lộ trình phù hợp', order: 1, important: true },
      { title: 'Kiểm tra điều kiện tiếp cận', description: 'Xem lối đi xe lăn, thang máy nếu cần', order: 2 },
      { title: 'Bắt đầu di chuyển & Theo dõi chặng', description: 'Di chuyển theo hướng dẫn', order: 3 },
      { title: 'Xác nhận đã đến nơi', description: 'Kiểm tra xung quanh khi tới nơi', order: 4 }
    ]
  },
  finance: {
    family: 'finance',
    label: '🏦 Ngân hàng & Tài chính',
    icon: 'CreditCard',
    description: 'Đi ngân hàng, làm thẻ, khóa thẻ, chuyển khoản, thanh toán.',
    defaultModules: ['documents', 'queue', 'followUp'],
    keywords: ['ngân hàng', 'thẻ', 'tài khoản', 'khóa thẻ', 'chuyển tiền', 'giao dịch', 'mã giao dịch'],
    suggestedTasks: [
      { title: 'Chuẩn bị CCCD & Giấy tờ liên quan', description: 'Đảm bảo mang đủ CCCD gốc', order: 1, important: true },
      { title: 'Đến chi nhánh / quầy giao dịch', description: 'Đến đúng ngân hàng', order: 2 },
      { title: 'Lấy số thứ tự & Gặp giao dịch viên', description: 'Trình bày yêu cầu hỗ trợ', order: 3 },
      { title: 'Lưu mã giao dịch / Giấy hẹn', description: 'Lưu lại biên nhận', order: 4 }
    ]
  },
  work: {
    family: 'work',
    label: '💼 Công việc & Phỏng vấn',
    icon: 'Briefcase',
    description: 'Phỏng vấn xin việc, đi làm, cuộc họp, hồ sơ, nhiệm vụ công ty.',
    defaultModules: ['appointment', 'checklist', 'documents', 'deadline'],
    keywords: ['công việc', 'phỏng vấn', 'xin việc', 'cv', 'đi làm', 'họp', 'công ty', 'nhiệm vụ', 'deadline'],
    suggestedTasks: [
      { title: 'Chuẩn bị hồ sơ / CV / Tài liệu', description: 'In sẵn CV và các giấy tờ cần thiết', order: 1, important: true },
      { title: 'Xác định thời gian & địa điểm', description: 'Dự phòng thời gian di chuyển', order: 2 },
      { title: 'Tham gia cuộc họp / phỏng vấn', description: 'Thực hiện công việc đúng giờ', order: 3 },
      { title: 'Ghi lại kết quả & Bước tiếp theo', description: 'Lưu ý lời dặn hoặc kết quả', order: 4 }
    ]
  },
  education: {
    family: 'education',
    label: '🎓 Học tập & Khóa học',
    icon: 'GraduationCap',
    description: 'Đi học, đăng ký lớp, thi cử, làm bài, nộp bài.',
    defaultModules: ['deadline', 'instructions', 'checklist'],
    keywords: ['học', 'lớp', 'trường', 'thi', 'bài tập', 'nộp bài', 'đăng ký'],
    suggestedTasks: [
      { title: 'Kiểm tra lịch học / lịch thi', description: 'Ghi nhớ phòng học và giờ bắt đầu', order: 1, important: true },
      { title: 'Chuẩn bị dụng cụ & Tài liệu', description: 'Mang bút, thẻ sinh viên, tài liệu', order: 2 },
      { title: 'Thực hiện buổi học / bài thi', description: 'Tập trung hoàn thành', order: 3 }
    ]
  },
  home: {
    family: 'home',
    label: '🏠 Sinh hoạt & Chuyển nhà',
    icon: 'Home',
    description: 'Dọn dẹp, sửa chữa, chuyển nhà, chuẩn bị đồ đạc sinh hoạt.',
    defaultModules: ['checklist', 'notes', 'people'],
    keywords: ['nhà', 'dọn', 'chuyển nhà', 'sửa', 'điều hòa', 'điện', 'nước', 'đóng gói'],
    suggestedTasks: [
      { title: 'Liệt kê việc cần chuẩn bị', description: 'Phân loại đồ đạc hoặc dụng cụ', order: 1, important: true },
      { title: 'Lên lịch & Liên hệ người hỗ trợ / thợ', description: 'Chốt thời gian thực hiện', order: 2 },
      { title: 'Thực hiện công việc từng bước', description: 'Tích hoàn thành các mục', order: 3 }
    ]
  },
  communication: {
    family: 'communication',
    label: '💬 Giao tiếp & Chuẩn bị câu hỏi',
    icon: 'MessageSquare',
    description: 'Chuẩn bị nội dung nói chuyện, câu hỏi gặp bác sĩ, trao đổi thủ tục.',
    defaultModules: ['notes', 'instructions'],
    keywords: ['giao tiếp', 'hỏi', 'nói', 'trao đổi', 'chuẩn bị câu hỏi', 'ghi nhớ'],
    suggestedTasks: [
      { title: 'Soạn sẵn danh sách câu hỏi cần trao đổi', description: 'Ghi rõ các ý chính', order: 1, important: true },
      { title: 'Mở lại danh sách khi gặp người đối thoại', description: 'Đảm bảo không bị quên ý', order: 2 },
      { title: 'Ghi lại câu trả lời hoặc dặn dò', description: 'Lưu thông tin vừa nghe', order: 3 }
    ]
  },
  technology: {
    family: 'technology',
    label: '💻 Thiết bị & Bảo hành',
    icon: 'Laptop',
    description: 'Bảo hành điện thoại, laptop, cài ứng dụng, xử lý sự cố thiết bị.',
    defaultModules: ['documents', 'followUp', 'notes'],
    keywords: ['laptop', 'điện thoại', 'máy tính', 'bảo hành', 'sửa', 'thiết bị', 'cài đặt', 'wifi'],
    suggestedTasks: [
      { title: 'Sao lưu dữ liệu quan trọng', description: 'Lưu giữ dữ liệu cá nhân trước khi sửa', order: 1, important: true },
      { title: 'Chuẩn bị thiết bị & Phụ kiện', description: 'Mang theo sạc, phiếu bảo hành', order: 2, important: true },
      { title: 'Đến trung tâm bảo hành / cửa hàng', description: 'Gửi máy và miêu tả sự cố', order: 3 },
      { title: 'Nhận biên nhận & Mã hồ sơ bảo hành', description: 'Lưu mã tra cứu kết quả', order: 4, important: true }
    ]
  },
  travel: {
    family: 'travel',
    label: '🧳 Du lịch & Chuyến đi',
    icon: 'Plane',
    description: 'Đi xa, du lịch, đón người thân ở sân bay, ga tàu, hành lý.',
    defaultModules: ['appointment', 'checklist', 'documents', 'navigation'],
    keywords: ['du lịch', 'chuyến đi', 'sân bay', 'đón', 'vé', 'máy bay', 'khách sạn', 'hành lý'],
    suggestedTasks: [
      { title: 'Kiểm tra vé & Giấy tờ tùy thân', description: 'Xác nhận CCCD/Hộ chiếu và vé', order: 1, important: true },
      { title: 'Soạn hành lý & Đồ dùng cá nhân', description: 'Chuẩn bị túi thuốc và đồ dùng', order: 2 },
      { title: 'Xác nhận giờ khởi hành / hạ cánh', description: 'Kiểm tra nhà ga và thời gian', order: 3, important: true },
      { title: 'Di chuyển đến địa điểm', description: 'Xuất phát đúng giờ', order: 4 }
    ]
  },
  safety: {
    family: 'safety',
    label: '⚠️ An toàn & Khẩn cấp',
    icon: 'AlertTriangle',
    description: 'Mất ví, sự cố khẩn cấp, hướng dẫn an toàn, hỗ trợ nhanh.',
    defaultModules: ['warnings', 'instructions', 'notes'],
    keywords: ['mất ví', 'khẩn cấp', 'an toàn', 'mất đồ', 'cứu hộ', 'nguy hiểm'],
    suggestedTasks: [
      { title: 'Xác định các giấy tờ / thẻ bị ảnh hưởng', description: 'Liệt kê thẻ ATM, CCCD, BHYT', order: 1, important: true },
      { title: 'Thực hiện biện pháp bảo vệ ngay', description: 'Khóa thẻ ngân hàng qua app/tổng đài', order: 2, important: true },
      { title: 'Lập danh sách việc làm lại giấy tờ', description: 'Lên kế hoạch xin cấp lại', order: 3 }
    ]
  },
  caregiving: {
    family: 'caregiving',
    label: '🤝 Chăm sóc người thân',
    icon: 'HeartHandshake',
    description: 'Hỗ trợ cha mẹ, con cái, đưa người thân đi khám, việc người khác.',
    defaultModules: ['appointment', 'checklist', 'instructions'],
    keywords: ['chăm sóc', 'bố', 'mẹ', 'con', 'người thân', 'đưa đi', 'giúp'],
    suggestedTasks: [
      { title: 'Xác nhận yêu cầu của người thân', description: 'Ghi rõ lịch hẹn và đồ cần mang', order: 1, important: true },
      { title: 'Chuẩn bị vật dụng & Giấy tờ cho người thân', description: 'Kiểm tra đầy đủ trước khi đi', order: 2 },
      { title: 'Đồng hành & Thực hiện lịch trình', description: 'Hỗ trợ người thân tại nơi đến', order: 3 }
    ]
  },
  planning: {
    family: 'planning',
    label: '📅 Kế hoạch & Việc tổng hợp',
    icon: 'Calendar',
    description: 'Tổ chức sự kiện, sắp xếp công việc nhiều bước, mục tiêu tổng quát.',
    defaultModules: ['checklist', 'deadline', 'notes'],
    keywords: ['kế hoạch', 'sắp xếp', 'nhiều việc', 'tổ chức', 'sự kiện', 'mục tiêu'],
    suggestedTasks: [
      { title: 'Phân chia các công việc chính', description: 'Sắp xếp theo thứ tự ưu tiên', order: 1, important: true },
      { title: 'Xác định mốc thời gian hoàn thành', description: 'Đặt deadline cho từng mục', order: 2 },
      { title: 'Thực hiện từng công việc', description: 'Tích hoàn thành tiến độ', order: 3 }
    ]
  },
  custom: {
    family: 'custom',
    label: '✨ Việc khác (Custom)',
    icon: 'Sparkles',
    description: 'Tự động tạo kế hoạch linh hoạt cho bất kỳ yêu cầu đời sống nào.',
    defaultModules: ['checklist', 'notes', 'followUp'],
    keywords: [],
    suggestedTasks: [
      { title: 'Xác nhận yêu cầu & Giấy tờ liên quan', description: 'Kiểm tra các vật dụng hoặc thông tin cần thiết', order: 1, important: true },
      { title: 'Xác định thời gian & Địa điểm', description: 'Chốt mốc thời gian thực hiện', order: 2 },
      { title: 'Thực hiện công việc từng bước', description: 'Lần lượt hoàn thành', order: 3 }
    ]
  }
};
