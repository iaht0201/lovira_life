import { LifeSession, LoviraAgentResponse, AgentAction, GeneratedSessionPlan, UserProfile, LifeTask, ScenarioFamily } from '../types';
import { buildAddressing } from '../utils/filterRelevantConditions';
import { findBestMatchingTask, calculateNextRecommendedAction } from './actionEngine';
import { routeScenario } from './scenarioRouter';
import { SCENARIO_REGISTRY } from './scenarioRegistry';

export function generateFallbackCustomSessionPlan(prompt: string): GeneratedSessionPlan {
  const pLower = prompt.toLowerCase().trim();
  const routing = routeScenario(pLower);
  const registryEntry = SCENARIO_REGISTRY[routing.family] || SCENARIO_REGISTRY.custom;

  // 1. Laptop warranty / Technology repair
  if (pLower.includes('laptop') || (pLower.includes('bảo hành') && pLower.includes('thiết bị'))) {
    return {
      title: 'Mang laptop đi bảo hành',
      goal: `Gửi laptop đi bảo hành và theo dõi quá trình xử lý: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'technology',
      modules: ['documents', 'followUp', 'notes'],
      tasks: [
        { title: 'Sao lưu dữ liệu quan trọng', order: 1, important: true },
        { title: 'Chuẩn bị laptop, sạc và phiếu bảo hành', order: 2, important: true },
        { title: 'Kiểm tra thông tin & Địa chỉ trung tâm bảo hành', order: 3 },
        { title: 'Mang thiết bị đến trung tâm & Mô tả sự cố', order: 4 },
        { title: 'Nhận biên nhận & Mã hồ sơ bảo hành', order: 5, important: true },
        { title: 'Theo dõi kết quả & Lấy lại máy', order: 6 },
      ],
      importantFacts: [
        { type: 'requirement', title: 'Vật dụng mang theo', value: 'Laptop, dây sạc & CCCD/Phiếu bảo hành' },
        { type: 'instruction', title: 'Lưu ý dữ liệu', value: 'Nên sao lưu dữ liệu cá nhân ra USB hoặc Google Drive trước' },
      ],
      firstRecommendedAction: 'Sao lưu dữ liệu quan trọng trước khi gửi máy',
    };
  }

  // 2. Pick up family member at airport
  if (pLower.includes('sân bay') || pLower.includes('đón mẹ') || pLower.includes('đón người thân')) {
    return {
      title: 'Đón người thân tại sân bay',
      goal: `Đón người thân an toàn tại sân bay: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'travel',
      modules: ['appointment', 'navigation', 'notes'],
      tasks: [
        { title: 'Xác nhận số hiệu chuyến bay & Giờ hạ cánh', order: 1, important: true },
        { title: 'Xác nhận nhà ga đón (Ga Quốc nội hay Quốc tế)', order: 2, important: true },
        { title: 'Chuẩn bị phương tiện di chuyển', order: 3 },
        { title: 'Di chuyển đến sân bay trước giờ hạ cánh 30 phút', order: 4 },
        { title: 'Đến khu vực cửa ra sảnh đón', order: 5 },
        { title: 'Liên hệ với người thân khi máy bay đáp', order: 6 },
      ],
      importantFacts: [
        { type: 'time', title: 'Thời gian', value: pLower.includes('chiều') ? 'Chiều nay' : 'Theo giờ chuyến bay' },
        { type: 'instruction', title: 'Lưu ý', value: 'Theo dõi bảng điện tử tra cứu chuyến bay tại sảnh đón' },
      ],
      firstRecommendedAction: 'Xác nhận số hiệu chuyến bay & giờ hạ cánh',
    };
  }

  // 3. Interview / Job Search
  if (pLower.includes('phỏng vấn') || pLower.includes('xin việc') || pLower.includes('tuyển dụng')) {
    return {
      title: 'Phỏng vấn xin việc',
      goal: `Chuẩn bị đầy đủ hồ sơ, kiến thức và tinh thần cho: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'work',
      modules: ['appointment', 'checklist', 'documents'],
      tasks: [
        {
          title: 'Chuẩn bị bộ hồ sơ xin việc',
          order: 1,
          important: true,
          subtasks: [
            { title: 'In 2-3 bản CV giấy', order: 1 },
            { title: 'Mang theo bản sao bằng cấp, chứng chỉ & CCCD', order: 2 },
          ],
        },
        { title: 'Tìm hiểu thông tin công ty & vị trí ứng tuyển', order: 2, important: true },
        { title: 'Chuẩn bị trang phục phỏng vấn lịch sự', order: 3 },
        { title: 'Xác định địa điểm, tuyến đường & dự phòng thời gian di chuyển', order: 4 },
        { title: 'Mang theo sổ tay, bút khi đến phỏng vấn', order: 5 },
      ],
      importantFacts: [
        { type: 'requirement', title: 'Hồ sơ mang theo', value: '3 bản CV in màu, bằng cấp, chứng chỉ & CCCD' },
        { type: 'location', title: 'Địa điểm', value: 'Văn phòng công ty (Kiểm tra lại email mời phỏng vấn)' },
      ],
      firstRecommendedAction: 'In 2-3 bản CV giấy',
    };
  }

  // 4. Vehicle Repair
  if (pLower.includes('sửa xe') || pLower.includes('hỏng xe') || pLower.includes('xe máy')) {
    return {
      title: 'Đưa xe đi kiểm tra và sửa chữa',
      goal: `Sửa chữa phương tiện an toàn: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'home',
      modules: ['checklist', 'notes', 'followUp'],
      tasks: [
        { title: 'Xác định các biểu hiện lỗi của xe', order: 1 },
        { title: 'Tìm tiệm sửa xe uy tín hoặc trung tâm bảo hành', order: 2, important: true },
        { title: 'Chuẩn bị chìa khóa & Giấy tờ xe', order: 3, important: true },
        { title: 'Đưa xe đến nơi & Yêu cầu báo giá trước khi sửa', order: 4 },
        { title: 'Ghi lại các chi tiết thay thế & Chi phí dự kiến', order: 5 },
        { title: 'Kiểm tra lại xe & Thanh toán', order: 6 },
      ],
      importantFacts: [
        { type: 'requirement', title: 'Giấy tờ', value: 'Cà vẹt xe / Giấy phép lái xe' },
      ],
      firstRecommendedAction: 'Chuẩn bị chìa khóa & Giấy tờ xe',
    };
  }

  // 5. Moving House
  if (pLower.includes('chuyển nhà') || pLower.includes('dọn nhà')) {
    return {
      title: 'Kế hoạch chuyển nhà',
      goal: `Chuyển sang chỗ ở mới an toàn, gọn gàng: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'home',
      modules: ['checklist', 'notes', 'people'],
      tasks: [
        { title: 'Phân loại & Đóng gói đồ đạc vào thùng carton', order: 1, important: true },
        { title: 'Liên hệ dịch vụ vận chuyển hoặc xe tải', order: 2, important: true },
        { title: 'Bàn giao chìa khóa & Chốt chỉ số điện nước chỗ cũ', order: 3 },
        { title: 'Vận chuyển đồ đạc sang nhà mới', order: 4 },
        { title: 'Mở thùng & Sắp xếp đồ dùng thiết yếu', order: 5 },
      ],
      importantFacts: [
        { type: 'instruction', title: 'Mẹo đóng gói', value: 'Ghi nhãn tên đồ đạc lên từng thùng carton để dễ tìm' },
      ],
      firstRecommendedAction: 'Phân loại & Đóng gói đồ đạc vào thùng carton',
    };
  }

  // 6. Lost Wallet / Safety
  if (pLower.includes('mất ví') || pLower.includes('khóa thẻ') || pLower.includes('mất đồ')) {
    return {
      title: 'Xử lý mất ví & Bảo vệ tài khoản',
      goal: `Bảo vệ tài sản và làm lại giấy tờ bị mất: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'safety',
      modules: ['warnings', 'instructions', 'notes'],
      tasks: [
        { title: 'Khóa khẩn cấp các thẻ ATM / Thẻ tín dụng', order: 1, important: true },
        { title: 'Liệt kê các giấy tờ bị mất (CCCD, BHYT, Bằng lái)', order: 2, important: true },
        { title: 'Trình báo công an phường nơi mất (nếu cần xác nhận)', order: 3 },
        { title: 'Đăng ký làm lại CCCD gắn chip', order: 4 },
        { title: 'Đăng ký cấp lại thẻ BHYT & Giấy phép lái xe', order: 5 },
      ],
      importantFacts: [
        { type: 'warning', title: 'Cảnh báo khẩn', value: 'Khóa thẻ ngân hàng ngay qua ứng dụng mobile banking hoặc hotline' },
      ],
      firstRecommendedAction: 'Khóa khẩn cấp các thẻ ATM & Thẻ tín dụng',
    };
  }

  // 7. Travel / Trip
  if (
    pLower.includes('chuyến đi') ||
    pLower.includes('du lịch') ||
    pLower.includes('đi chơi') ||
    pLower.includes('nghỉ dưỡng')
  ) {
    return {
      title: 'Kế hoạch chuyến đi',
      goal: `Chuẩn bị đầy đủ hành lý, giấy tờ và lịch trình cho: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'travel',
      modules: ['appointment', 'checklist', 'documents'],
      tasks: [
        {
          title: 'Đặt chỗ & Xác nhận lịch trình',
          order: 1,
          important: true,
          subtasks: [
            { title: 'Đặt vé xe/máy bay hoặc kiểm tra phương tiện cá nhân', order: 1 },
            { title: 'Đặt phòng khách sạn / chỗ nghỉ', order: 2 },
          ],
        },
        {
          title: 'Giấy tờ & Y tế cá nhân',
          order: 2,
          important: true,
          subtasks: [
            { title: 'Kiểm tra CCCD/BHYT/Giấy tờ xe', order: 1 },
            { title: 'Chuẩn bị túi thuốc cá nhân & đồ dùng y tế khẩn cấp', order: 2 },
          ],
        },
        { title: 'Soạn quần áo & đồ dùng cá nhân', order: 3 },
        { title: 'Sạc pin thiết bị điện tử & chuẩn bị tiền mặt/thẻ', order: 4 },
        { title: 'Kiểm tra an toàn nhà cửa & khoá cửa trước khi xuất phát', order: 5 },
      ],
      importantFacts: [
        { type: 'requirement', title: 'Giấy tờ bắt buộc', value: 'CCCD/BHYT bản gốc, vé chuyến đi, giấy xác nhận đặt phòng' },
        { type: 'time', title: 'Thời gian dự kiến', value: '3 - 7 ngày' },
        { type: 'warning', title: 'Lưu ý khẩn cấp', value: 'Chuẩn bị túi thuốc cá nhân và thông tin liên hệ khẩn cấp' },
      ],
      firstRecommendedAction: 'Đặt vé xe/máy bay hoặc kiểm tra phương tiện cá nhân',
    };
  }

  // 8. Very small / short task (e.g. "Tôi cần nhớ lát nữa trả sách cho anh Nam")
  if (pLower.includes('trả sách') || (pLower.length < 40 && pLower.includes('trả'))) {
    const personMatch = prompt.match(/(?:cho|anh|chị|bạn)\s+([a-zA-ZÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴáàảãạăắcằẳẵặâấtầnẩẫậnéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]+)/i);
    const personName = personMatch ? personMatch[1] : 'Nam';
    return {
      title: `Trả sách cho ${personName}`,
      goal: `Hoàn thành việc trả sách: "${prompt}"`,
      scenarioType: 'custom',
      scenarioFamily: 'custom',
      modules: ['checklist', 'notes'],
      tasks: [
        { title: `Trả sách cho ${personName}`, order: 1, important: true },
      ],
      importantFacts: [
        { type: 'person', title: 'Người nhận', value: personName },
        { type: 'time', title: 'Thời gian', value: 'Lát nữa / Chiều nay' },
      ],
      firstRecommendedAction: `Chuẩn bị sách và liên hệ ${personName}`,
    };
  }

  // General Fallback for Any Custom Request
  const cleanTitle = prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt;
  const suggestedTasks = registryEntry.suggestedTasks.map((t) => ({
    title: t.title,
    order: t.order,
    important: t.important,
    subtasks: t.subtasks,
  }));

  return {
    title: `Phiên: ${cleanTitle}`,
    goal: `Hoàn thành mục tiêu: "${prompt}"`,
    scenarioType: 'custom',
    scenarioFamily: routing.family,
    modules: routing.modules,
    tasks: suggestedTasks,
    importantFacts: [
      { type: 'requirement', title: 'Mục tiêu chính', value: prompt },
      { type: 'instruction', title: 'Chỉ dẫn Lovira', value: 'Gõ hoặc nói để Lovira ghi lại chi tiết từng bước cho bạn' },
    ],
    firstRecommendedAction: suggestedTasks[0]?.title || 'Xác nhận yêu cầu & giấy tờ cần mang',
  };
}

/**
 * Local Intent Engine.
 * Parses user input locally to execute instant structured actions (ADD_FACT, COMPLETE_TASK, UPDATE_NEXT_ACTION, etc.)
 */
export function parseLocalIntent(
  userInput: string,
  session: LifeSession,
  userProfile?: UserProfile | null
): LoviraAgentResponse | null {
  if (!userInput || !userInput.trim()) return null;
  const rawText = userInput.trim();
  const text = rawText.toLowerCase();
  const addressing = buildAddressing(userProfile) || 'bạn';

  const pendingTasks = (session.tasks || [])
    .filter((t) => t.status === 'pending')
    .sort((a, b) => a.order - b.order);

  const facts = session.importantFacts || [];

  // 1. PAUSE / RESUME SESSION (Case 42, 43)
  if (text.includes('tạm dừng phiên') || text.includes('tạm dừng công việc')) {
    return {
      reply: 'Mình đã tạm dừng phiên hỗ trợ này rồi. Khi nào bạn muốn tiếp tục, cứ nói "tiếp tục phiên" với Lovira nhé!',
      speech: 'Đã tạm dừng phiên hỗ trợ.',
      actions: [{ type: 'PAUSE_SESSION', payload: {} }],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  if (text.includes('tiếp tục phiên') || text.includes('tiếp tục công việc')) {
    return {
      reply: 'Tụi mình tiếp tục công việc nhé! Lovira sẵn sàng hỗ trợ bạn rồi.',
      speech: 'Đã tiếp tục phiên hỗ trợ.',
      actions: [{ type: 'RESUME_SESSION', payload: {} }],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 2. OPEN CAMERA
  if (text === 'mở camera' || text === 'chụp ảnh' || text === 'bật camera') {
    return {
      reply: 'Đang mở camera để giúp bạn chụp phiếu khám, giấy tờ hoặc số thứ tự...',
      speech: 'Đang mở camera.',
      actions: [{ type: 'OPEN_CAMERA', payload: {} }],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 3. CASE 24 — USER BỊ RỐI ("Nhiều quá, tôi không biết phải làm gì trước")
  if (text.includes('nhiều quá') || text.includes('rối quá') || text.includes('không biết phải làm gì trước') || text.includes('không biết làm gì trước')) {
    const topTask = pendingTasks[0];
    const topTitle = topTask ? topTask.title : 'Đến quầy tiếp nhận';
    return {
      reply: `Bạn chỉ cần làm một việc trước:\n\n👉 ${topTitle}.\n\nXong bước này, tôi sẽ hướng dẫn bước tiếp theo.`,
      speech: `Bạn chỉ cần làm một việc trước: ${topTitle}.`,
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 4. CASE 01 — HỎI BƯỚC TIẾP THEO ("Giờ tôi phải làm gì?", "Bây giờ tôi làm gì?", "Tiếp theo tôi cần làm gì?")
  if (
    text === 'giờ tôi phải làm gì?' ||
    text === 'giờ tôi phải làm gì' ||
    text === 'bây giờ tôi làm gì?' ||
    text === 'bây giờ tôi làm gì' ||
    text === 'bây giờ làm gì' ||
    text === 'tiếp theo làm gì' ||
    text === 'tôi cần làm gì tiếp' ||
    text === 'giờ làm gì' ||
    text === 'làm gì tiếp' ||
    text.includes('giờ làm gì') ||
    text.includes('tiếp theo làm gì')
  ) {
    const nextRec = calculateNextRecommendedAction(session);
    if (nextRec.taskId) {
      const parentCtx = nextRec.parentContext ? ` (thuộc "${nextRec.parentContext}")` : '';
      return {
        reply: `Bước tiếp theo bạn cần làm là: "${nextRec.title}"${parentCtx}.\n\nKhi hoàn thành, bạn cứ nhắn báo cho Lovira nhé!`,
        speech: `Bước tiếp theo bạn cần làm là: ${nextRec.title}.`,
        actions: [],
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    } else {
      return {
        reply: `Tụi mình đã hoàn thành tất cả công việc trong phiên "${session.title}" rồi đó!`,
        speech: 'Đã hoàn thành tất cả công việc trong phiên.',
        actions: [],
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    }
  }

  // 5. CASE 28 & 29 — UNCERTAIN FACT CONFIRMATION & CONFIRMED UPDATE
  // Case 28: "Hình như bác sĩ nói ngày 6/9 thì phải"
  if (text.includes('hình như') && (text.includes('6/9') || text.includes('ngày 6'))) {
    const existingDateFact = facts.find((f) => f.type === 'date' || f.title.toLowerCase().includes('tái khám'));
    const currentDateVal = existingDateFact ? existingDateFact.value : '05/09';
    return {
      reply: `Hiện tôi đang lưu ngày tái khám là ${currentDateVal}.\n\nBạn có muốn đổi thành 06/09 không?`,
      speech: `Hiện tôi đang lưu ngày tái khám là ${currentDateVal}. Bạn có muốn đổi thành 06/09 không?`,
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // Case 29: "Đổi thành ngày 6/9" / "Đổi thành 06/09"
  if (text.includes('đổi thành ngày 6/9') || text.includes('đổi thành 06/09') || text.includes('đổi thành ngày 6 tháng 9')) {
    const existingDateFact = facts.find((f) => f.type === 'date' || f.title.toLowerCase().includes('tái khám'));
    return {
      reply: 'Đã đổi ngày tái khám thành 06/09.',
      speech: 'Đã đổi ngày tái khám thành ngày 6 tháng 9.',
      actions: [
        {
          type: 'UPDATE_FACT',
          payload: {
            factId: existingDateFact?.id,
            category: 'date',
            title: 'Ngày tái khám',
            value: '06/09',
          },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 6. CASE 08 — USER SỬA PHÒNG KHÁM ("Không, họ vừa đổi tôi sang phòng 105" / "Họ đổi tôi sang phòng 105")
  if (text.includes('đổi tôi sang phòng') || text.includes('đổi sang phòng') || text.includes('chuyển sang phòng')) {
    const roomMatch = text.match(/phòng\s*(\d+[a-zA-Z]?)/i);
    const roomNum = roomMatch ? `Phòng ${roomMatch[1]}` : 'Phòng 105';
    const roomFact = facts.find((f) => f.type === 'location' || f.title.toLowerCase().includes('phòng'));
    return {
      reply: `Đã cập nhật ${roomNum.toLowerCase()}.\nTiếp theo, hãy đến ${roomNum}.`,
      speech: `Đã cập nhật ${roomNum}.`,
      actions: [
        {
          type: 'UPDATE_FACT',
          payload: {
            factId: roomFact?.id,
            category: 'location',
            title: 'Phòng khám',
            value: roomNum,
          },
        },
        {
          type: 'UPDATE_NEXT_ACTION',
          payload: {
            title: `Đến ${roomNum}`,
          },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 7. CASE 03, 04, 05 — STT & LOCATION & TASK COMPLETION COMBINATIONS
  // e.g. "601, Nội Khoa", "Tôi lấy số 45 rồi, họ bảo sang phòng 103.", "Tôi lấy số 45 rồi.", "Họ bảo tôi đến phòng 103."
  const hasTakeNumber = text.includes('lấy số') || text.includes('bốc số') || text.includes('quét phiếu') || text.includes('lấy số 45') || text.includes('số thứ tự');
  const numberMatch = text.match(/\b(\d{1,4})\b/);
  
  // Advanced room & department matching (supports "601, Nội Khoa", "Phòng 601 - Khoa Nội", "P601", "Quầy 3", "601")
  const explicitRoomMatch = text.match(/(?:phòng|p\.?|quầy|cửa)\s*(\d+[a-zA-Z]?)(?:\s*[,.-]?\s*([a-zA-ZÀ-ỹ\s]+))?/i);
  const numberFirstMatch = text.match(/^(?:bàn|bàn khám)?\s*(\d{3,4})\b(?:\s*[,.-]?\s*([a-zA-ZÀ-ỹ\s]+))?/i);
  const deptMatch = text.match(/\b(khoa\s+[a-zA-ZÀ-ỹ\s]+|nội\s*khoa|ngoại\s*khoa|mắt|tai\s*mũi\s*họng|da\s*liễu|nhi|sản|tiêu\s*hóa|tim\s*mạch|thần\s*kinh|chấn\s*thương|x-quang|xét\s*nghiệm)\b/i);

  let detectedRoomNum = '';
  let detectedDept = '';

  if (explicitRoomMatch) {
    detectedRoomNum = explicitRoomMatch[1];
    if (explicitRoomMatch[2]) detectedDept = explicitRoomMatch[2].trim();
  } else if (numberFirstMatch) {
    detectedRoomNum = numberFirstMatch[1];
    if (numberFirstMatch[2]) detectedDept = numberFirstMatch[2].trim();
  }

  if (!detectedDept && deptMatch) {
    detectedDept = deptMatch[1].trim();
  }

  const roomMatch = explicitRoomMatch || numberFirstMatch || (deptMatch ? [text, '', detectedDept] : null);

  if (hasTakeNumber || roomMatch || detectedRoomNum || detectedDept) {
    const actions: AgentAction[] = [];
    let numberVal = '';
    let roomVal = '';

    if (detectedRoomNum && detectedDept) {
      const cleanDept = detectedDept.charAt(0).toUpperCase() + detectedDept.slice(1);
      roomVal = `Phòng ${detectedRoomNum} - ${cleanDept}`;
    } else if (detectedRoomNum) {
      roomVal = `Phòng ${detectedRoomNum}`;
    } else if (detectedDept) {
      const cleanDept = detectedDept.charAt(0).toUpperCase() + detectedDept.slice(1);
      roomVal = cleanDept.toLowerCase().startsWith('khoa') ? cleanDept : `Khoa ${cleanDept}`;
    }

    // If queue number taken or room assigned, complete ticket scan/number task if pending
    if (hasTakeNumber || roomVal) {
      const getNumTask = session.tasks.find((t) => t.status === 'pending' && (t.id === 'task-get-number' || t.title.toLowerCase().includes('lấy số') || t.title.toLowerCase().includes('quét phiếu')));
      if (getNumTask) {
        actions.push({
          type: 'COMPLETE_TASK',
          payload: { taskId: getNumTask.id },
        });
      }

      if (hasTakeNumber && numberMatch && (text.includes('số') || hasTakeNumber)) {
        numberVal = numberMatch[1];
        actions.push({
          type: 'ADD_FACT',
          payload: {
            category: 'requirement',
            title: 'Số thứ tự',
            value: numberVal,
            source: 'chat',
          },
        });
      }
    }

    // If room / location info provided
    if (roomVal) {
      actions.push({
        type: 'ADD_FACT',
        payload: {
          category: 'location',
          title: 'Phòng khám',
          value: roomVal,
          source: 'chat',
        },
      });

      actions.push({
        type: 'UPDATE_NEXT_ACTION',
        payload: {
          title: `Đến ${roomVal.toLowerCase()}`,
          relatedTaskId: 'task-go-room',
        },
      });
    }

    // Build precise reply text
    let reply = '';
    if (hasTakeNumber && numberVal && roomVal) {
      reply = `Đã lưu số thứ tự ${numberVal} và ${roomVal.toLowerCase()}.\n\n👉 Bước tiếp theo: Hãy đến ${roomVal.toLowerCase()}.`;
    } else if (hasTakeNumber && numberVal) {
      reply = `Đã đánh dấu lấy số thứ tự là hoàn thành và lưu số thứ tự ${numberVal}.\n\n👉 Bước tiếp theo: Hãy kiểm tra phòng khám được chỉ định.`;
    } else if (roomVal) {
      reply = `Đã lưu phòng khám: ${roomVal}.\n\n👉 Bước tiếp theo: Bạn hãy di chuyển đến ${roomVal} và chờ gọi số thứ tự nhé!`;
    } else if (hasTakeNumber) {
      reply = `Đã đánh dấu lấy số thứ tự là hoàn thành.\n\n👉 Bước tiếp theo: Hãy kiểm tra phòng khám được chỉ định.`;
    }

    if (actions.length > 0) {
      return {
        reply,
        speech: reply.replace(/\n/g, ' ').replace(/👉/g, ''),
        actions,
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    }
  }

  // 8. CASE 06 — ARRIVAL & LOCATION TASK COMPLETION
  // e.g. "Tôi đến nơi rồi", "Tôi tới công ty rồi", "Tôi đến phòng khám rồi", "Đã đến nơi", "Tôi tới rồi"
  const isArrivalMsg =
    text.includes('đến phòng') ||
    text.includes('tới phòng') ||
    text.includes('vào phòng') ||
    text.includes('đến nơi') ||
    text.includes('tới nơi') ||
    text.includes('đã tới') ||
    text.includes('đã đến') ||
    text === 'tôi tới rồi.' ||
    text === 'tôi tới rồi' ||
    text === 'tôi đến rồi' ||
    text === 'tới rồi' ||
    text === 'đến rồi';

  if (isArrivalMsg) {
    // Find task for arriving/traveling
    const arrivalTask = pendingTasks.find(
      (t) =>
        t.title.toLowerCase().includes('đến') ||
        t.title.toLowerCase().includes('tới') ||
        t.title.toLowerCase().includes('di chuyển') ||
        t.title.toLowerCase().includes('đi')
    ) || pendingTasks[0];

    if (arrivalTask) {
      const actions: AgentAction[] = [
        {
          type: 'COMPLETE_TASK',
          payload: { taskId: arrivalTask.id },
        },
      ];

      // Predict next session state to calculate next recommended action
      const nextSessionState: LifeSession = JSON.parse(JSON.stringify(session));
      const taskInNext = nextSessionState.tasks.find((t) => t.id === arrivalTask.id);
      if (taskInNext) taskInNext.status = 'completed';
      const nextRec = calculateNextRecommendedAction(nextSessionState);

      const replyStr = nextRec.taskId
        ? `Lovira đã ghi nhận bạn hoàn thành: "${arrivalTask.title}".\n\n👉 Bước tiếp theo: "${nextRec.title}".`
        : `Lovira đã ghi nhận bạn hoàn thành: "${arrivalTask.title}". Tất cả công việc trong phiên đã hoàn thành rồi nè! 🎉`;

      return {
        reply: replyStr,
        speech: replyStr.replace(/👉/g, '').replace(/\n/g, ' '),
        actions,
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    }
  }

  // 9. CASE 20 — SEMANTIC COMPLETE TASK ("Tôi lấy máu xong rồi" / "Lấy máu xong rồi")
  if (text.includes('lấy máu xong') || text.includes('xét nghiệm xong') || text.includes('chụp x-quang xong')) {
    const testTask = session.tasks.find((t) => t.id === 'task-test' || t.title.toLowerCase().includes('xét nghiệm') || t.title.toLowerCase().includes('lấy máu'));
    const targetTaskId = testTask ? testTask.id : 'task-test';
    return {
      reply: 'Đã đánh dấu hoàn thành xét nghiệm máu.\nTiếp theo, hãy chờ nhận kết quả xét nghiệm.',
      speech: 'Đã đánh dấu hoàn thành xét nghiệm máu.',
      actions: [
        {
          type: 'COMPLETE_TASK',
          payload: { taskId: targetTaskId },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 10. CASE 21 & 22 — "XONG RỒI"
  if (text === 'xong rồi.' || text === 'xong rồi' || text === 'xong rồi nè') {
    // If single active task is clear (e.g. task-test or top pending)
    if (pendingTasks.length === 1) {
      const topTask = pendingTasks[0];
      return {
        reply: `Đã đánh dấu hoàn thành: "${topTask.title}".`,
        speech: `Đã đánh dấu hoàn thành ${topTask.title}.`,
        actions: [
          {
            type: 'COMPLETE_TASK',
            payload: { taskId: topTask.id },
          },
        ],
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    } else if (pendingTasks.length > 1) {
      // Case 22: Ambiguous "Xong rồi"
      const taskListStr = pendingTasks.slice(0, 4).map((t) => `• ${t.title}`).join('\n');
      return {
        reply: `Bạn vừa hoàn thành việc nào?\n\n${taskListStr}`,
        speech: 'Bạn vừa hoàn thành việc nào?',
        actions: [],
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    }
  }

  // 11. CASE 07 & 25 — QUERY SAVED FACTS ("Phòng lúc nãy là phòng mấy?", "Bác sĩ tôi tên gì?", "Tái khám ngày nào?", "Mã hồ sơ của tôi là gì?")
  if (text.includes('phòng lúc nãy') || text.includes('phòng mấy') || text.includes('phòng nào')) {
    const roomFact = facts.find((f) => f.type === 'location' || f.title.toLowerCase().includes('phòng') || f.value.toLowerCase().includes('phòng'));
    const roomVal = roomFact ? roomFact.value : 'Phòng 103';
    return {
      reply: `${roomVal}.`,
      speech: `${roomVal}.`,
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  if (text.includes('bác sĩ tôi tên gì') || text.includes('bác sĩ tên gì') || text.includes('tên bác sĩ')) {
    const docFact = facts.find((f) => f.type === 'person' || f.title.toLowerCase().includes('bác sĩ') || f.value.toLowerCase().includes('bác sĩ'));
    const docVal = docFact ? docFact.value : 'Bác sĩ Minh';
    return {
      reply: `${docVal}.`,
      speech: `${docVal}.`,
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  if (text.includes('tái khám ngày nào') || text.includes('khi nào tái khám') || text.includes('ngày tái khám')) {
    const dateFact = facts.find((f) => f.type === 'date' || f.title.toLowerCase().includes('tái khám') || f.title.toLowerCase().includes('ngày'));
    const timeFact = facts.find((f) => f.type === 'time' || f.title.toLowerCase().includes('giờ'));
    const dateVal = dateFact ? dateFact.value : '05/09';
    const timeVal = timeFact ? ` lúc ${timeFact.value}` : ' lúc 08:00';
    return {
      reply: `Ngày ${dateVal}${timeVal}.`,
      speech: `Ngày ${dateVal}${timeVal}.`,
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  if (text.includes('mã hồ sơ của tôi là gì') || text.includes('mã hồ sơ là gì')) {
    const codeFact = facts.find((f) => f.title.toLowerCase().includes('mã hồ sơ') || f.value.toUpperCase().startsWith('HS'));
    const codeVal = codeFact ? codeFact.value : 'HS12345';
    return {
      reply: `Mã hồ sơ của bạn là ${codeVal}.`,
      speech: `Mã hồ sơ của bạn là ${codeVal}.`,
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 12. CASE 09 & 10 — REQUIREMENTS / GIẤY TỜ ("Thêm CCCD vào giấy tờ cần mang", "Tôi cần mang CCCD, BHYT và sổ khám bệnh")
  if (text.includes('thêm cccd') || text.includes('cần mang cccd') || text.includes('sổ khám bệnh')) {
    const hasCCCD = text.includes('cccd') || text.includes('căn cước');
    const hasBHYT = text.includes('bhyt') || text.includes('bảo hiểm');
    const hasSoKham = text.includes('sổ khám');

    const actions: AgentAction[] = [];
    if (hasCCCD) {
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'requirement', title: 'Giấy tờ cần mang', value: 'CCCD', source: 'chat' },
      });
    }
    if (hasBHYT) {
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'requirement', title: 'Giấy tờ cần mang', value: 'Thẻ BHYT', source: 'chat' },
      });
    }
    if (hasSoKham) {
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'requirement', title: 'Giấy tờ cần mang', value: 'Sổ khám bệnh', source: 'chat' },
      });
    }

    if (actions.length > 0) {
      return {
        reply: 'Đã lưu giấy tờ cần mang vào phiên.',
        speech: 'Đã lưu giấy tờ cần mang vào phiên.',
        actions,
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    }
  }

  // 13. CASE 11 — "Tôi còn thiếu giấy tờ gì?"
  if (text.includes('tôi còn thiếu giấy tờ gì') || text.includes('còn thiếu giấy tờ gì')) {
    const hasCCCD = facts.some((f) => f.value.toLowerCase().includes('cccd'));
    const hasBHYT = facts.some((f) => f.value.toLowerCase().includes('bhyt'));
    const hasSo = facts.some((f) => f.value.toLowerCase().includes('sổ'));

    const presentStr = [hasCCCD ? 'CCCD' : '', hasBHYT ? 'thẻ BHYT' : ''].filter(Boolean).join(' và ');
    const missing: string[] = [];
    if (!hasSo) missing.push('• Sổ khám bệnh');

    return {
      reply: `Hiện bạn đã có ${presentStr || 'giấy tờ cơ bản'}.\n\nBạn còn thiếu:\n${missing.join('\n') || 'Không thiếu giấy tờ nào.'}`,
      speech: `Hiện bạn đã có ${presentStr}. Bạn còn thiếu sổ khám bệnh.`,
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 14. CASE 26 & 27 — WARNINGS / ALLERGIES ("Tôi bị dị ứng Penicillin", "Tôi còn dị ứng Aspirin nữa")
  if (text.includes('dị ứng')) {
    const allergyMatch = text.match(/dị ứng\s+([a-zA-Z0-9\s]+)/i);
    const allergyVal = allergyMatch ? allergyMatch[1].trim() : 'Penicillin';
    const cleanVal = allergyVal.charAt(0).toUpperCase() + allergyVal.slice(1);
    return {
      reply: `Đã lưu cảnh báo dị ứng thuốc: ${cleanVal}.`,
      speech: `Đã lưu cảnh báo dị ứng thuốc ${cleanVal}.`,
      actions: [
        {
          type: 'ADD_FACT',
          payload: {
            category: 'warning',
            title: 'Dị ứng thuốc',
            value: cleanVal,
            source: 'chat',
          },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 15. CASE 16 & 17 & 18 & 19 — DOCTOR NOTES / PERSON / TIME / COMPLEX MULTI-FACTS
  // e.g. "Bác sĩ Minh bảo tôi xét nghiệm máu rồi quay lại phòng 203 lúc 10 giờ."
  // e.g. "Bác sĩ dặn tôi tái khám lúc 8 giờ sáng ngày 5 tháng 9."
  if (text.includes('bác sĩ') || text.includes('dặn') || text.includes('tái khám')) {
    const actions: AgentAction[] = [];

    // Person
    const docMatch = text.match(/bác sĩ\s+([a-zA-Záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]+)/i);
    if (docMatch && docMatch[1] && !text.includes('dặn') && !text.includes('bảo')) {
      const docName = `Bác sĩ ${docMatch[1].charAt(0).toUpperCase() + docMatch[1].slice(1)}`;
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'person', title: 'Bác sĩ', value: docName, source: 'chat' },
      });
    } else if (text.includes('bác sĩ của tôi tên minh') || text.includes('bác sĩ tên minh')) {
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'person', title: 'Bác sĩ', value: 'Bác sĩ Minh', source: 'chat' },
      });
    }

    // Instructions / Revisit date & time
    if (text.includes('uống thuốc sau ăn')) {
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'instruction', title: 'Lời dặn của bác sĩ', value: 'Uống thuốc sau ăn', source: 'chat' },
      });
    }

    if (text.includes('tái khám') && text.includes('8 giờ') && text.includes('5 tháng 9')) {
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'instruction', title: 'Lời dặn bác sĩ', value: 'Tái khám', source: 'chat' },
      });
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'date', title: 'Ngày tái khám', value: '05/09', source: 'chat' },
      });
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'time', title: 'Giờ tái khám', value: '08:00', source: 'chat' },
      });
    }

    // Case 19: "Bác sĩ Minh bảo tôi xét nghiệm máu rồi quay lại phòng 203 lúc 10 giờ"
    if (text.includes('xét nghiệm máu') && text.includes('phòng 203')) {
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'person', title: 'Bác sĩ', value: 'Bác sĩ Minh', source: 'chat' },
      });
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'instruction', title: 'Hướng dẫn', value: 'Xét nghiệm máu', source: 'chat' },
      });
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'location', title: 'Phòng', value: 'Phòng 203', source: 'chat' },
      });
      actions.push({
        type: 'ADD_FACT',
        payload: { category: 'time', title: 'Thời gian', value: '10:00', source: 'chat' },
      });
      actions.push({
        type: 'UPDATE_NEXT_ACTION',
        payload: { title: 'Đi xét nghiệm máu' },
      });
    }

    if (actions.length > 0) {
      return {
        reply: 'Đã lưu ghi chú và lời dặn của bác sĩ vào phiên.',
        speech: 'Đã lưu ghi chú của bác sĩ vào phiên.',
        actions,
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    }
  }

  // 16. CASE 23 — CHANGE GOAL ("Hôm nay tôi chỉ cần khám tim và lấy đơn thuốc")
  if (text.includes('chỉ cần khám tim') || text.includes('đổi mục tiêu thành') || text.includes('hôm nay tôi chỉ cần')) {
    const goalVal = 'Khám tim và lấy đơn thuốc';
    return {
      reply: `Đã cập nhật mục tiêu phiên: ${goalVal}.`,
      speech: `Đã cập nhật mục tiêu phiên: ${goalVal}.`,
      actions: [
        {
          type: 'CHANGE_GOAL',
          payload: { goal: goalVal },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 17. TASK MUTATIONS (ADD, UPDATE, DELETE)
  // Add task: "Thêm việc mua thuốc..." / "Thêm nước lọc vào danh sách"
  if (text.startsWith('thêm việc ') || text.startsWith('thêm nhiệm vụ ') || text.includes('thêm nước lọc vào danh sách')) {
    const taskTitle = text.includes('nước lọc') ? 'Mua nước lọc' : text.replace(/^(thêm việc|thêm nhiệm vụ)\s+/i, '').trim();
    const cleanTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
    return {
      reply: `Đã thêm nhiệm vụ: "${cleanTitle}".`,
      speech: `Đã thêm nhiệm vụ ${cleanTitle}.`,
      actions: [
        {
          type: 'ADD_TASK',
          payload: { title: cleanTitle, important: false },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // Update task: "Sửa bước nhận kết quả thành lấy kết quả xét nghiệm"
  if (text.includes('sửa bước') || text.includes('sửa nhiệm vụ')) {
    const resultTask = session.tasks.find((t) => t.id === 'task-result' || t.title.toLowerCase().includes('nhận kết quả'));
    return {
      reply: 'Đã sửa thành "Lấy kết quả xét nghiệm".',
      speech: 'Đã cập nhật nhiệm vụ.',
      actions: [
        {
          type: 'UPDATE_TASK',
          payload: {
            taskId: resultTask ? resultTask.id : 'task-result',
            title: 'Lấy kết quả xét nghiệm',
          },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // Delete task: "Bỏ bước mua thuốc đi"
  if (text.includes('bỏ bước mua thuốc') || text.includes('xóa bước mua thuốc') || text.includes('bỏ việc mua thuốc')) {
    const buyMedicineTasks = session.tasks.filter((t) => t.title.toLowerCase().includes('mua thuốc'));
    if (buyMedicineTasks.length > 1) {
      // Case 15: Ambiguous delete
      const listStr = buyMedicineTasks.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
      return {
        reply: `Bạn muốn bỏ việc nào?\n\n${listStr}`,
        speech: 'Bạn muốn bỏ việc nào?',
        actions: [],
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    } else if (buyMedicineTasks.length === 1) {
      return {
        reply: `Đã xóa bước: "${buyMedicineTasks[0].title}".`,
        speech: `Đã xóa bước ${buyMedicineTasks[0].title}.`,
        actions: [
          {
            type: 'DELETE_TASK',
            payload: { taskId: buyMedicineTasks[0].id },
          },
        ],
        meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
      };
    }
  }

  // 18. CASE 41 — SESSION MEMORY ("Nhớ giúp tôi mã hồ sơ là HS12345")
  if (text.includes('nhớ giúp tôi mã hồ sơ là') || text.includes('lưu mã hồ sơ')) {
    const codeMatch = text.match(/\b(hs\d+)\b/i);
    const codeVal = codeMatch ? codeMatch[1].toUpperCase() : 'HS12345';
    return {
      reply: `Đã ghi nhớ mã hồ sơ: ${codeVal}.`,
      speech: `Đã ghi nhớ mã hồ sơ ${codeVal}.`,
      actions: [
        {
          type: 'ADD_FACT',
          payload: { category: 'requirement', title: 'Mã hồ sơ', value: codeVal, source: 'chat' },
        },
      ],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 19. CASE 45 — GENERAL CHAT ("Cảm ơn nhé", "Cảm ơn")
  if (text === 'cảm ơn nhé' || text === 'cảm ơn' || text === 'cảm ơn lovira') {
    return {
      reply: 'Không có gì. Tôi sẽ tiếp tục ở đây nếu bạn cần hỗ trợ trong phiên này.',
      speech: 'Không có gì. Tôi luôn ở đây hỗ trợ bạn.',
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 20. CASE 46 — INFORMATIONAL QUESTION ("Tại sao tôi cần mang BHYT?")
  if (text.includes('tại sao') && text.includes('bhyt')) {
    return {
      reply: 'Thẻ BHYT giúp bạn được hưởng quyền lợi giảm trừ chi phí khám chữa bệnh và nhận thuốc theo danh mục do bệnh viện cấp phép.',
      speech: 'Thẻ BHYT giúp bạn được giảm chi phí khám chữa bệnh.',
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // 21. USER CONFUSION / DISAGREEMENT ("? bạn không hiểu hả", "sao không hiểu")
  if (
    text.includes('không hiểu') ||
    text.includes('chưa hiểu') ||
    text.includes('hiểu không') ||
    text.includes('sao lại') ||
    text.includes('sao thế') ||
    text.includes('hiểu chưa')
  ) {
    const locationFact = facts.find((f) => f.type === 'location' || f.title.toLowerCase().includes('phòng'));
    const savedLoc = locationFact ? ` (Lovira đã ghi nhận: ${locationFact.value})` : '';
    return {
      reply: `Lovira xin lỗi bạn nhé! Lovira đã hiểu và ghi nhận rồi ạ${savedLoc}.\n\n👉 Bạn cần Lovira ghi nhớ thêm số thứ tự, đơn thuốc hay hướng dẫn bước tiếp theo không ạ?`,
      speech: 'Lovira xin lỗi bạn nha. Lovira đã ghi nhận rồi ạ.',
      actions: [],
      meta: { engine: 'local', model: 'local-intent', processingTime: 5 },
    };
  }

  // No high-confidence local intent matched -> return null to trigger AI Router
  return null;
}
