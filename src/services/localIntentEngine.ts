import {
  LifeSession,
  AgentAction,
  GeneratedSessionPlan,
  ImportantFactType,
  UserProfile,
} from '../types';
import { SCENARIO_REGISTRY } from './scenarioRegistry';
import { routeScenario, extractKnownFacts } from './scenarioRouter';
import {
  findBestMatchingTask,
  resolveCurrentStep,
  calculateNextRecommendedAction,
  resolveCompletionTarget,
  applyAgentActionBatch,
} from './actionEngine';
import { normalizeGeneratedLifePlan } from './planValidator';
import { buildAddressing } from '../utils/filterRelevantConditions';

export interface LocalIntentResult {
  reply: string;
  speech?: string;
  actions: AgentAction[];
  confidence: number;
}


/**
 * Universal fallback plan generator for completely offline or demo scenarios
 * Generates grounded tasks and extracts only real facts from prompt
 */
export function generateFallbackCustomSessionPlan(prompt: string): GeneratedSessionPlan {
  const routing = routeScenario(prompt);
  const knownFacts = extractKnownFacts(prompt);
  const registry = SCENARIO_REGISTRY[routing.family] || SCENARIO_REGISTRY.custom;
  const pLower = prompt.toLowerCase();

  // 1. Phỏng vấn / Tìm việc (Work / Interview)
  if (routing.family === 'work' || pLower.includes('phỏng vấn') || pLower.includes('xin việc')) {
    const isTomorrow = pLower.includes('mai');
    const title = isTomorrow ? '💼 Chuẩn bị buổi phỏng vấn ngày mai' : '💼 Kế hoạch chuẩn bị phỏng vấn';

    const plan: GeneratedSessionPlan = {
      title,
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'work',
      subtype: 'job_interview',
      modules: ['appointment', 'checklist', 'documents', 'deadline'],
      tasks: [
        {
          title: 'Chuẩn bị hồ sơ xin việc',
          description: 'Soạn sẵn CV và các giấy tờ cần thiết cho buổi phỏng vấn',
          order: 1,
          important: true,
          subtasks: [
            { title: 'Chuẩn bị CV & hồ sơ ứng tuyển', order: 1 },
            { title: 'Mang theo giấy tờ cá nhân cần thiết', order: 2 },
          ],
        },
        {
          title: 'Tìm hiểu thông tin công ty & vị trí ứng tuyển',
          description: 'Xem lại mô tả công việc (JD) và các câu hỏi phỏng vấn thường gặp',
          order: 2,
          important: true,
          subtasks: [
            { title: 'Đọc lại mô tả công việc (JD)', order: 1 },
            { title: 'Chuẩn bị 2-3 câu hỏi dành cho nhà tuyển dụng', order: 2 },
          ],
        },
        {
          title: 'Chuẩn bị trang phục phỏng vấn',
          description: 'Lựa chọn trang phục lịch sự, chỉnh chu',
          order: 3,
        },
        {
          title: 'Xác định địa điểm & phương tiện di chuyển',
          description: 'Dự trù thời gian xuất phát để đến sớm 10 - 15 phút',
          order: 4,
          important: true,
        },
        {
          title: 'Tham gia phỏng vấn đúng giờ',
          description: 'Giữ tinh thần tự tin, trao đổi rõ ràng và chuyên nghiệp',
          order: 5,
          important: true,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Chuẩn bị CV & hồ sơ ứng tuyển',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 2. Bảo hành thiết bị / Laptop (Technology & Warranty)
  if (routing.family === 'technology' || pLower.includes('bảo hành') || pLower.includes('laptop') || pLower.includes('sửa')) {
    const plan: GeneratedSessionPlan = {
      title: '💻 Đem thiết bị đi bảo hành / sửa chữa',
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'technology',
      subtype: 'device_repair',
      modules: ['documents', 'followUp', 'notes'],
      tasks: [
        {
          title: 'Sao lưu dữ liệu quan trọng',
          description: 'Chuyển dữ liệu cá nhân sang ổ cứng ngoài hoặc đám mây trước khi gửi máy',
          order: 1,
          important: true,
        },
        {
          title: 'Chuẩn bị máy & Phụ kiện liên quan',
          description: 'Mang theo củ sạc, dây cáp và phiếu/hóa đơn bảo hành',
          order: 2,
          important: true,
          subtasks: [
            { title: 'Lấy củ sạc và cáp kết nối', order: 1 },
            { title: 'Tìm phiếu bảo hành hoặc hóa đơn mua hàng', order: 2 },
          ],
        },
        {
          title: 'Đến trung tâm bảo hành',
          description: 'Mô tả rõ lỗi gặp phải cho nhân viên kỹ thuật',
          order: 3,
        },
        {
          title: 'Nhận phiếu tiếp nhận & Lưu mã biên nhận',
          description: 'Kiểm tra kỹ thông tin tình trạng máy và ngày hẹn trả máy',
          order: 4,
          important: true,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Sao lưu dữ liệu quan trọng trước khi đem máy đi',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 3. Đón người thân / Sân bay (Travel / Trips)
  if (routing.family === 'travel' || pLower.includes('sân bay') || pLower.includes('đón mẹ') || pLower.includes('đón người')) {
    const plan: GeneratedSessionPlan = {
      title: '🧳 Đón người thân tại sân bay / nhà ga',
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'travel',
      subtype: 'airport_pickup',
      modules: ['appointment', 'checklist', 'navigation', 'notes'],
      tasks: [
        {
          title: 'Xác nhận thông tin chuyến bay / giờ hạ cánh',
          description: 'Kiểm tra mã hiệu chuyến bay và nhà ga đến (Quốc nội / Quốc tế)',
          order: 1,
          important: true,
        },
        {
          title: 'Xuất phát đến sân bay / điểm đón',
          description: 'Dự trù thời gian di chuyển để có mặt trước giờ hạ cánh 15-20 phút',
          order: 2,
          important: true,
        },
        {
          title: 'Đến đúng cửa đón và liên hệ người thân',
          description: 'Chờ tại khu vực sảnh đón và gọi điện thoại khi người thân nhận xong hành lý',
          order: 3,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Xác nhận thông tin chuyến bay & giờ hạ cánh',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 4. Ngân hàng & Làm thẻ (Finance / Banking)
  if (routing.family === 'finance' || pLower.includes('ngân hàng') || pLower.includes('làm thẻ') || pLower.includes('mở tài khoản')) {
    const plan: GeneratedSessionPlan = {
      title: '💳 Đi làm thủ tục ngân hàng / làm thẻ',
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'finance',
      subtype: 'bank_card',
      modules: ['documents', 'queue', 'followUp'],
      tasks: [
        {
          title: 'Chuẩn bị CCCD/CMND bản gốc',
          description: 'Đảm bảo mang theo Căn cước công dân bản gốc còn hạn sử dụng',
          order: 1,
          important: true,
          subtasks: [
            { title: 'Kiểm tra CCCD bản chính trong ví', order: 1 },
            { title: 'Mang theo điện thoại cá nhân để nhận mã OTP', order: 2 },
          ],
        },
        {
          title: 'Đến chi nhánh / quầy giao dịch ngân hàng',
          description: 'Đến đúng địa điểm ngân hàng trong giờ hành chính',
          order: 2,
          important: true,
        },
        {
          title: 'Bốc số thứ tự & Đợi gọi quầy giao dịch',
          description: 'Lấy số tại cây tự động hoặc nhờ bảo vệ hỗ trợ bốc số',
          order: 3,
        },
        {
          title: 'Khai mẫu đơn / đăng ký làm thẻ với giao dịch viên',
          description: 'Điền thông tin vào mẫu đăng ký và đối chiếu thông tin cá nhân',
          order: 4,
          important: true,
        },
        {
          title: 'Nhận giấy hẹn lấy thẻ hoặc kích hoạt dịch vụ',
          description: 'Lưu lại giấy hẹn trả thẻ hoặc hướng dẫn đăng ký app ngân hàng',
          order: 5,
          important: true,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Kiểm tra CCCD bản chính trong ví',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 5. Lấy / Làm lại thẻ CCCD (ID Card Pickup & Renewal)
  if (routing.subtype === 'id_card' || pLower.includes('cccd') || pLower.includes('căn cước')) {
    const isPickup = pLower.includes('lấy') || pLower.includes('nhận');
    const title = isPickup ? '🪪 Đi nhận / lấy thẻ CCCD mới' : '🪪 Đi làm lại / cấp đổi thẻ CCCD';

    const plan: GeneratedSessionPlan = {
      title,
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'administrative',
      subtype: 'id_card',
      modules: ['documents', 'appointment', 'notes', 'followUp'],
      tasks: isPickup
        ? [
            {
              title: 'Kiểm tra giấy hẹn lấy CCCD & Giấy tờ cá nhân',
              description: 'Mang theo giấy hẹn trả kết quả (hoặc thông báo VNeID) và giấy tờ cá nhân',
              order: 1,
              important: true,
              subtasks: [
                { title: 'Kiểm tra giấy hẹn lấy thẻ CCCD trong hồ sơ', order: 1 },
                { title: 'Mang theo thông tin VNeID hoặc giấy tờ cá nhân', order: 2 },
              ],
            },
            {
              title: 'Di chuyển đến trụ sở Công an / Trung tâm Phục vụ hành chính công',
              description: 'Đến đúng địa điểm hẹn trong giờ hành chính',
              order: 2,
              important: true,
            },
            {
              title: 'Xuất trình giấy hẹn & Nhận thẻ CCCD mới tại quầy',
              description: 'Kiểm tra kỹ thông tin trên thẻ CCCD mới trước khi rời quầy',
              order: 3,
              important: true,
            },
          ]
        : [
            {
              title: 'Kiểm tra hồ sơ & Giấy tờ cần thiết khi làm lại CCCD',
              description: 'Chuẩn bị mã định danh cá nhân / giấy tờ xác minh',
              order: 1,
              important: true,
            },
            {
              title: 'Di chuyển đến Cơ quan Công an cấp quận/huyện',
              description: 'Đến bộ phận Cấp CCCD trong giờ làm việc',
              order: 2,
              important: true,
            },
            {
              title: 'Lấy số, thu nhận vân tay, chụp ảnh & Nhận giấy hẹn',
              description: 'Hoàn tất thủ tục làm lại thẻ và giữ giấy hẹn',
              order: 3,
              important: true,
            },
          ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: isPickup ? 'Kiểm tra giấy hẹn lấy thẻ CCCD trong hồ sơ' : 'Kiểm tra hồ sơ & Giấy tờ cần thiết khi làm lại CCCD',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 6. Công chứng & Thủ tục hành chính (Administrative / Notary)
  if (pLower.includes('công chứng') || pLower.includes('chứng thực') || pLower.includes('sao y') || (routing.family === 'administrative' && !pLower.includes('cccd'))) {
    const plan: GeneratedSessionPlan = {
      title: '🏛️ Đi công chứng & làm thủ tục hành chính',
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'administrative',
      subtype: 'notary',
      modules: ['documents', 'queue', 'deadline', 'followUp'],
      tasks: [
        {
          title: 'Chuẩn bị bản chính & các bản phô-tô cần công chứng',
          description: 'Soạn sẵn CCCD/CMND bản gốc và các giấy tờ cần chứng thực',
          order: 1,
          important: true,
          subtasks: [
            { title: 'Kiểm tra bản chính CCCD và giấy tờ cần công chứng', order: 1 },
            { title: 'Chuẩn bị sẵn các bản phô-tô (nếu có)', order: 2 },
          ],
        },
        {
          title: 'Đến Văn phòng công chứng / Bộ phận 1 cửa UBND',
          description: 'Đến địa điểm công chứng trong giờ làm việc hành chính',
          order: 2,
          important: true,
        },
        {
          title: 'Bốc số thứ tự & Nộp hồ sơ tại quầy tiếp nhận',
          description: 'Lấy số quầy Tư pháp - Công chứng và chờ gọi tên',
          order: 3,
        },
        {
          title: 'Nộp lệ phí công chứng & Nhận lại bản gốc + văn bản chứng thực',
          description: 'Kiểm tra kỹ con dấu, chữ ký và số lượng bản sao đã đóng dấu',
          order: 4,
          important: true,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Kiểm tra bản chính CCCD và giấy tờ cần công chứng',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 6. Mua sắm & Đi chợ / Mua sữa (Shopping)
  if (routing.family === 'shopping' || pLower.includes('mua') || pLower.includes('chợ') || pLower.includes('siêu thị')) {
    const isMilk = pLower.includes('sữa');
    const title = isMilk ? '🥛 Đi mua sữa' : '🛒 Kế hoạch đi mua sắm / đi chợ';

    const plan: GeneratedSessionPlan = {
      title,
      goal: prompt,
      scenarioType: 'custom',
      scenarioFamily: 'shopping',
      subtype: 'shopping_trip',
      modules: ['checklist', 'notes', 'followUp'],
      tasks: [
        {
          title: 'Kiểm tra loại đồ cần mua & Tiền/Thẻ trong ví',
          description: 'Xác định loại đồ cần mua và chuẩn bị ví tiền / điện thoại',
          order: 1,
          important: true,
          subtasks: [
            { title: 'Kiểm tra tên/loại đồ cần mua', order: 1 },
            { title: 'Kiểm tra ví tiền hoặc điện thoại thanh toán', order: 2 },
          ],
        },
        {
          title: 'Di chuyển đến cửa hàng / siêu thị',
          description: 'Đến địa điểm cửa hàng gần nhất',
          order: 2,
          important: true,
        },
        {
          title: 'Chọn món đồ & Thanh toán tại quầy',
          description: 'Lấy đúng loại sản phẩm và kiểm tra hóa đơn/tiền thối',
          order: 3,
          important: true,
        },
      ],
      importantFacts: knownFacts.map((f) => ({
        type: f.type,
        title: f.title,
        value: f.value,
      })),
      firstRecommendedAction: 'Kiểm tra tên/loại đồ cần mua',
    };

    return normalizeGeneratedLifePlan(plan, prompt, routing);
  }

  // 7. Mặc định theo Scenario Registry
  const tasks = registry.suggestedTasks.map((t, idx) => ({
    title: t.title,
    description: t.description,
    order: t.order || idx + 1,
    important: t.important || idx === 0,
    subtasks: t.subtasks,
  }));

  const facts = knownFacts.map((f) => ({
    type: f.type,
    title: f.title,
    value: f.value,
  }));

  const plan: GeneratedSessionPlan = {
    title: `${registry.label.split(' ')[0]} ${prompt.slice(0, 30)}`,
    goal: prompt,
    scenarioType: 'custom',
    scenarioFamily: routing.family,
    modules: registry.defaultModules,
    tasks,
    importantFacts: facts,
    firstRecommendedAction: tasks[0]?.subtasks?.[0]?.title || tasks[0]?.title || 'Bắt đầu bước đầu tiên',
  };

  return normalizeGeneratedLifePlan(plan, prompt, routing);
}

export function deduceHonorifics(
  userProfile?: UserProfile | null,
  session?: LifeSession | null,
  userInput?: string
): { addressing: string; me: string; da: string; a: string; isElderly: boolean; isYoungerSenior: boolean; praise: string } {
  let addressing = userProfile ? buildAddressing(userProfile) : '';

  const combinedText = `${userInput || ''} ${session?.goal || ''} ${session?.title || ''} ${session?.messages?.map((m) => m.text).join(' ') || ''}`.toLowerCase();

  if (!addressing || addressing === 'bạn') {
    if (combinedText.includes('bác')) addressing = 'bác';
    else if (combinedText.includes('ông')) addressing = 'ông';
    else if (combinedText.includes('bà')) addressing = 'bà';
    else if (combinedText.includes('cô')) addressing = 'cô';
    else if (combinedText.includes('chú')) addressing = 'chú';
    else if (combinedText.includes('anh')) addressing = 'anh';
    else if (combinedText.includes('chị')) addressing = 'chị';
    else addressing = 'bạn';
  }

  const isElderly = ['bác', 'ông', 'bà', 'cô', 'chú'].includes(addressing);
  const isYoungerSenior = ['anh', 'chị'].includes(addressing);

  const me = isElderly ? 'con' : isYoungerSenior ? 'em' : 'Lovira';
  const da = isElderly ? `Dạ thưa ${addressing}` : isYoungerSenior ? `Dạ ${addressing}` : 'Dạ';
  const a = isElderly ? 'ạ' : isYoungerSenior ? 'nha' : 'nhé';

  const praise = isElderly
    ? `Dạ mừng quá ${addressing} ơi!`
    : isYoungerSenior
    ? `Dạ tuyệt vời ${addressing} ơi!`
    : `Dạ tuyệt vời ${addressing} ơi!`;

  return { addressing, me, da, a, isElderly, isYoungerSenior, praise };
}

export function formatSoftNextStepGuidance(
  nextRec: { title: string; description?: string },
  honorifics: { addressing: string; me: string; da: string; a: string; isElderly: boolean },
  sessionGoal: string = ''
): string {
  const { addressing, me, da, a } = honorifics;
  const title = nextRec.title;
  const tLower = title.toLowerCase();
  const goalLower = sessionGoal.toLowerCase();

  // Shopping / Buying items
  if (tLower.includes('kiểm tra tên/loại') || tLower.includes('loại đồ cần mua') || tLower.includes('ví tiền')) {
    const itemMatch = goalLower.match(/mua\s+([a-zA-ZÀ-ỹ\s]+)/i);
    const itemStr = itemMatch ? itemMatch[1].trim() : 'đồ';
    return `${da}, ${addressing} định mua loại ${itemStr} gì thế ${a}? ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ kiểm tra đem theo ví tiền hoặc điện thoại để thanh toán nha ${addressing}!`;
  }

  // Buying / Selecting item step
  if (tLower.includes('chọn món đồ') || tLower.includes('thanh toán')) {
    return `${da}, bây giờ ${addressing} thong thả chọn đồ rồi lại quầy thanh toán ${a}!`;
  }

  // Documents / ID card
  if (tLower.includes('cccd') || tLower.includes('cmnd') || tLower.includes('giấy tờ')) {
    return `${da}, ${addressing} nhớ lấy sẵn Căn cước công dân bản gốc để trong túi/ví mang đi ${a}!`;
  }

  // Movement / Location arrival
  if (tLower.includes('di chuyển') || tLower.includes('đến') || tLower.includes('tới')) {
    return `${da}, bây giờ ${addressing} thong thả di chuyển đến nơi ${a}. Khi nào tới nơi, ${addressing} cứ nhắn "tới rồi" cho ${me} nha!`;
  }

  // Waiting / Ticket
  if (tLower.includes('bốc số') || tLower.includes('số thứ tự') || tLower.includes('chờ')) {
    return `${da}, khi vào quầy ${addressing} nhớ bốc số thứ tự trước, sau đó thong thả lại ghế ngồi chờ gọi tên ${a}!`;
  }

  // Default clean soft guidance
  return `${da}, bước tiếp theo là: "${title}". ${nextRec.description && !nextRec.description.includes('undefined') ? `(${nextRec.description}) ` : ''}${addressing.charAt(0).toUpperCase() + addressing.slice(1)} thong thả làm xong rồi nhắn cho ${me} ${a}!`;
}

/**
 * Universal Local Intent Parser:
 * Evaluates user input against structured session state without hardcoded single-scenario assumptions
 */
export function parseLocalIntent(
  userInput: string,
  session: LifeSession,
  userProfile?: UserProfile | null
): LocalIntentResult | null {
  if (!userInput || !userInput.trim() || !session) return null;

  const text = userInput.trim();
  const tLower = text.toLowerCase();
  const resolvedStep = resolveCurrentStep(session);
  const currentTaskOrSub = resolvedStep?.subtask || resolvedStep?.task;

  const honorifics = deduceHonorifics(userProfile, session, text);
  const { addressing, me, da, a, isElderly, isYoungerSenior, praise } = honorifics;

  // 1. Pause / Resume / Complete session
  if (tLower.includes('tạm dừng phiên') || tLower.includes('nghỉ tay') || tLower === 'tạm dừng') {
    return {
      reply: `${da}, ${me} đã tạm dừng phiên hỗ trợ rồi nha. Khi nào ${addressing} muốn tiếp tục, chỉ cần nhắn "tiếp tục" cho ${me} ${a}!`,
      actions: [{ type: 'PAUSE_SESSION', payload: {} }],
      confidence: 0.95,
    };
  }

  if (tLower.includes('tiếp tục phiên') || tLower === 'tiếp tục' || tLower === 'làm tiếp') {
    return {
      reply: `${da}, ${me} cùng ${addressing} tiếp tục công việc ${a}. Bước hiện tại của ${addressing} là: "` + (session.nextRecommendedAction?.title || 'xem lại danh sách') + `".`,
      actions: [{ type: 'RESUME_SESSION', payload: {} }],
      confidence: 0.95,
    };
  }

  if (tLower.includes('hoàn thành phiên') || tLower.includes('xong hết rồi') || tLower.includes('kết thúc phiên')) {
    return {
      reply: `Chúc mừng ${addressing} đã hoàn thành trọn vẹn phiên hôm nay! 🎉 ${da}, ${me} đã đánh dấu phiên này hoàn thành rồi ${a}.`,
      actions: [{ type: 'COMPLETE_SESSION', payload: {} }],
      confidence: 0.95,
    };
  }

  // 2. Universal "Tiếp theo làm gì?" / "Giờ tôi phải làm gì?" / "Làm gì tiếp?"
  if (
    tLower.includes('tiếp theo') ||
    tLower.includes('làm gì tiếp') ||
    tLower.includes('giờ làm sao') ||
    tLower.includes('giờ tôi làm gì') ||
    tLower.includes('bước tiếp theo') ||
    tLower.includes('bây giờ phải làm gì') ||
    tLower.includes('giờ tôi phải làm gì')
  ) {
    const nextAction = calculateNextRecommendedAction(session);
    if (!nextAction || !nextAction.title) {
      return {
        reply: `${da}, tất cả các công việc trong phiên đã hoàn thành rồi ${addressing} ơi! 🎉 ${addressing} có cần ${me} hỗ trợ thêm điều gì không ${a}?`,
        actions: [],
        confidence: 0.95,
      };
    }

    const softGuidance = formatSoftNextStepGuidance(nextAction, honorifics, session.goal);
    return {
      reply: softGuidance,
      actions: [],
      confidence: 0.95,
    };
  }

  // 3. Universal "Nhiều quá / Rối quá / Không biết bắt đầu từ đâu"
  if (
    tLower.includes('nhiều quá') ||
    tLower.includes('rối quá') ||
    tLower.includes('không nhớ hết') ||
    tLower.includes('nhiều việc quá') ||
    tLower.includes('lo quá') ||
    tLower.includes('chóng mặt')
  ) {
    if (currentTaskOrSub) {
      return {
        reply: `${da} đừng lo lắng ${a}, có ${me} đồng hành cùng ${addressing} mà! Bây giờ ${addressing} chỉ cần tập trung làm DUY NHẤT một việc này thôi nhé:\n\n👉 "${currentTaskOrSub.title}"\n\nLàm xong bước này rồi ${me} cùng ${addressing} tính tiếp, không cần lo nghĩ nhiều đâu ${a}!`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: `${da} đừng lo lắng ${a}, ${me} sẽ cùng ${addressing} giải quyết từng việc một. ${addressing} cứ thong thả làm xong bước đầu tiên trước nhé!`,
      actions: [],
      confidence: 0.9,
    };
  }

  // 4. Universal "Xong rồi" / "Làm xong rồi" / "Chuẩn bị rồi" / "Hoàn thành bước này"
  if (
    tLower === 'xong rồi' ||
    tLower === 'xong' ||
    tLower === 'đã xong' ||
    tLower === 'hoàn thành rồi' ||
    tLower === 'làm xong rồi' ||
    tLower.includes('chuẩn bị rồi') ||
    tLower.includes('chuẩn bị xong') ||
    tLower.includes('sẵn sàng rồi') ||
    tLower.includes('làm xong rồi') ||
    tLower.includes('xong rồi nhé') ||
    tLower.includes('xong rồi nha') ||
    tLower.startsWith('xong rồi ') ||
    tLower.startsWith('đã làm xong') ||
    tLower.startsWith('xong bước') ||
    tLower.startsWith('hoàn thành bước') ||
    tLower.endsWith('chuẩn bị rồi') ||
    tLower.endsWith('chuẩn bị rồi nhé') ||
    tLower.endsWith('chuẩn bị rồi nha')
  ) {
    const compResult = resolveCompletionTarget(session, text);

    if (compResult.isAmbiguous) {
      const candidates = compResult.candidateTasks || session.tasks.filter((t) => t.status !== 'completed');
      if (candidates.length > 0) {
        const taskListStr = candidates.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
        return {
          reply: `${da}, ${addressing} vừa hoàn thành công việc nào vậy ${a}? Nhắn tên hoặc số thứ tự công việc cho ${me} để ${me} đánh dấu nhé:\n\n${taskListStr}`,
          actions: [],
          confidence: 0.95,
        };
      }
    }

    const target = compResult.subtask || compResult.task;
    if (target) {
      const parentId = compResult.parentTask?.id || (compResult.task ? compResult.task.id : target.id);
      const actions: AgentAction[] = [
        {
          type: compResult.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId: parentId,
            subtaskId: compResult.subtask?.id,
          },
        },
      ];

      // Dynamically calculate new state and next step
      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      let replyText = '';
      if (nextRec && nextRec.title && !nextRec.title.includes('Hoàn thành tất cả')) {
        const softGuidance = formatSoftNextStepGuidance(nextRec, honorifics, session.goal);
        replyText = `${praise} ${me.charAt(0).toUpperCase() + me.slice(1)} đã đánh dấu hoàn thành xong rồi ${a}.\n\n${softGuidance}`;
      } else {
        replyText = `${praise} Tất cả các công việc trong phiên "${session.title}" đã hoàn thành trọn vẹn rồi ${addressing} ơi! 🎉`;
      }

      return {
        reply: replyText,
        speech: replyText.replace(/👉/g, '').replace(/\n/g, ' '),
        actions,
        confidence: 0.95,
      };
    }

    const pending = session.tasks.filter((t) => t.status !== 'completed' && t.status !== 'skipped');
    if (pending.length > 0) {
      const taskListStr = pending.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n');
      return {
        reply: `${da}, ${addressing} vừa hoàn thành công việc nào vậy ${a}? Nhắn tên công việc cho ${me} để ${me} đánh dấu nhé:\n\n${taskListStr}`,
        actions: [],
        confidence: 0.9,
      };
    }

    return {
      reply: `Tuyệt vời! Tất cả các công việc trong phiên đều đã hoàn thành rồi ${addressing} ơi! 🎉`,
      actions: [],
      confidence: 0.9,
    };
  }

  // 5. Universal "Tôi tới rồi" / "Đã đến nơi" / "Bác đến rồi" / "Đến quầy rồi"
  if (
    tLower.includes('tới rồi') ||
    tLower.includes('đến rồi') ||
    tLower.includes('đến nơi') ||
    tLower.includes('đã tới') ||
    tLower.includes('đã đến') ||
    tLower.includes('đến quầy') ||
    tLower.includes('tới quầy') ||
    tLower.includes('vào quầy') ||
    tLower.includes('vào phòng') ||
    tLower.includes('sang phòng') ||
    tLower.includes('tới phòng') ||
    tLower.includes('đến cửa hàng') ||
    tLower.includes('đến ngân hàng') ||
    tLower.includes('tới ngân hàng')
  ) {
    const isMovementTitle = (title: string) => {
      const tl = title.toLowerCase();
      return (
        tl.includes('đến') ||
        tl.includes('tới') ||
        tl.includes('di chuyển') ||
        tl.includes('xuất phát') ||
        tl.includes('ra') ||
        tl.includes('vào') ||
        tl.includes('ghé') ||
        tl.includes('sang') ||
        tl.includes('đi')
      );
    };

    // Check if current active step is a movement task
    if (currentTaskOrSub && isMovementTitle(currentTaskOrSub.title) && currentTaskOrSub.status !== 'completed') {
      const actions: AgentAction[] = [
        {
          type: resolvedStep?.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
          payload: {
            taskId: resolvedStep?.task?.id || currentTaskOrSub.id,
            subtaskId: resolvedStep?.subtask?.id,
          },
        },
      ];

      const { newState } = applyAgentActionBatch(session, actions);
      const nextRec = calculateNextRecommendedAction(newState);

      let replyText = `${da}, ${addressing} đã đến nơi an toàn rồi, mừng quá ${a}!`;
      if (nextRec && nextRec.title && !nextRec.title.includes('Hoàn thành tất cả')) {
        const softGuidance = formatSoftNextStepGuidance(nextRec, honorifics, session.goal);
        replyText += `\n\n${softGuidance}`;
      }

      return {
        reply: replyText,
        speech: replyText.replace(/👉/g, '').replace(/\n/g, ' '),
        actions,
        confidence: 0.95,
      };
    }

    // Otherwise find all pending movement tasks
    const movementCandidates: { task: any; subtask?: any }[] = [];
    for (const t of session.tasks) {
      if (t.status === 'completed' || t.status === 'skipped') continue;
      if (t.subtasks) {
        for (const st of t.subtasks) {
          if (st.status !== 'completed' && isMovementTitle(st.title)) {
            movementCandidates.push({ task: t, subtask: st });
          }
        }
      }
      if (isMovementTitle(t.title)) {
        movementCandidates.push({ task: t });
      }
    }

    if (movementCandidates.length === 1) {
      const candidate = movementCandidates[0];
      const targetItem = candidate.subtask || candidate.task;
      return {
        reply: `${da}, ${addressing} đã đến nơi an toàn rồi, mừng quá ${a}! ${me.charAt(0).toUpperCase() + me.slice(1)} đánh dấu hoàn thành bước "${targetItem.title}" rồi nha. Bây giờ ${addressing} vào việc tiếp theo nhé!`,
        actions: [
          {
            type: candidate.subtask ? 'COMPLETE_SUBTASK' : 'COMPLETE_TASK',
            payload: {
              taskId: candidate.task.id,
              subtaskId: candidate.subtask?.id,
            },
          },
        ],
        confidence: 0.95,
      };
    } else if (movementCandidates.length > 1) {
      const listStr = movementCandidates.map((m, idx) => `${idx + 1}. ${(m.subtask || m.task).title}`).join('\n');
      return {
        reply: `${da}, mừng ${addressing} đã đến nơi ${a}! ${addressing} vừa đến địa điểm nào trong các bước sau nè?\n\n${listStr}`,
        actions: [],
        confidence: 0.95,
      };
    }

    return {
      reply: `${da}, mừng ${addressing} đã đến nơi an toàn nhé ${a}! Bây giờ ${addressing} xem bước tiếp theo cần làm gì trong danh sách hoặc bảo ${me} nha.`,
      actions: [],
      confidence: 0.9,
    };
  }


  // 6. Fact Questions (Universal fact lookup)
  // "Phòng mấy?"
  if (tLower.includes('phòng') && (tLower.includes('mấy') || tLower.includes('ở đâu') || tLower.includes('nào') || tLower.includes('lúc nãy'))) {
    const roomFact = session.importantFacts.find(
      (f) =>
        f.title.toLowerCase().includes('phòng') ||
        f.value.toLowerCase().includes('phòng') ||
        (f.type === 'location' && f.value.toLowerCase().includes('phòng'))
    );
    if (roomFact) {
      return {
        reply: `Thông tin phòng khám/làm việc đã lưu là: ${roomFact.value} (${roomFact.title}).`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa lưu thông tin số phòng trong phiên này bạn ơi. Khi nào biết số phòng, bạn nhắn để mình lưu lại giúp bạn nhé!',
      actions: [],
      confidence: 0.9,
    };
  }

  // "Bác sĩ tên gì?" / "Gặp ai?"
  if (tLower.includes('bác sĩ') && (tLower.includes('tên gì') || tLower.includes('ai') || tLower.includes('nào'))) {
    const docFact = session.importantFacts.find(
      (f) => f.title.toLowerCase().includes('bác sĩ') || f.value.toLowerCase().includes('bác sĩ')
    );
    if (docFact) {
      return {
        reply: `Tên bác sĩ đã lưu là: ${docFact.value}.`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa có thông tin tên bác sĩ trong phiên này. Bạn có thể nhắn tên bác sĩ để mình lưu vào phiên nha!',
      actions: [],
      confidence: 0.9,
    };
  }

  // "Tái khám ngày nào?"
  if (tLower.includes('tái khám') && (tLower.includes('ngày nào') || tLower.includes('khi nào') || tLower.includes('mấy giờ'))) {
    const dateFact = session.importantFacts.find(
      (f) =>
        f.title.toLowerCase().includes('tái khám') ||
        f.title.toLowerCase().includes('lịch hẹn') ||
        (f.type === 'date' && f.title.toLowerCase().includes('khám'))
    );
    if (dateFact) {
      return {
        reply: `Lịch hẹn tái khám của bạn là: ${dateFact.value} (${dateFact.title}).`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa lưu lịch tái khám trong phiên này bạn ơi. Khi bác sĩ hẹn ngày, bạn nhắn mình lưu ngay nhé!',
      actions: [],
      confidence: 0.9,
    };
  }

  // "Mã hồ sơ của tôi là gì?" / "Mã tra cứu"
  if (tLower.includes('mã hồ sơ') || tLower.includes('mã biên nhận') || tLower.includes('mã tra cứu')) {
    const codeFact = session.importantFacts.find(
      (f) =>
        f.type === 'identifier' ||
        f.title.toLowerCase().includes('mã') ||
        f.title.toLowerCase().includes('hồ sơ')
    );
    if (codeFact) {
      return {
        reply: `Mã hồ sơ đã lưu của bạn là: ${codeFact.value}.`,
        actions: [],
        confidence: 0.95,
      };
    }
    return {
      reply: 'Mình chưa lưu mã hồ sơ của bạn trong phiên này. Khi có giấy hẹn hoặc mã tra cứu, bạn nhắn mình lưu lại ngay nhé!',
      actions: [],
      confidence: 0.9,
    };
  }

  // 8. Universal Recommendation & Advice Requests ("gợi ý bác đi", "bác chưa biết", "nó 4 tuổi", "chọn loại nào")
  if (
    tLower.includes('gợi ý') ||
    tLower.includes('chưa biết') ||
    tLower.includes('tư vấn') ||
    tLower.includes('nếu mua') ||
    tLower.includes('nên mua') ||
    tLower.includes('chọn loại') ||
    tLower.includes('mua gì') ||
    tLower.includes('tuổi') ||
    tLower.includes('không biết')
  ) {
    let adviceReply = '';
    const factVal = text;

    if (tLower.includes('4 tuổi') || (tLower.includes('tuổi') && (tLower.includes('4') || tLower.includes('bốn')))) {
      adviceReply = `${da}, đối với cháu 4 tuổi, ${me} gợi ý bác một vài món ngon, lành tính và cháu rất thích nè:\n\n🥛 Sữa tươi tiệt trùng nguyên chất (TH True Milk Organic, Vinamilk)\n🍶 Sữa chua uống men sống tốt cho tiêu hóa\n🥐 Bánh quy xốp hình thú hoặc bánh flan mềm\n\nBác thích chọn mua món nào cho cháu hơn ${a}?`;
    } else if (session.goal.toLowerCase().includes('mua sữa') || session.goal.toLowerCase().includes('mua đồ')) {
      adviceReply = `${da}, nếu đi mua sữa hay mua đồ ăn, ${me} gợi ý bác một vài lựa chọn phổ biến và ngon miệng nhé:\n\n🥛 Sữa tươi tiệt trùng / Sữa hạt dinh dưỡng (óc chó, hạnh nhân)\n🍶 Sữa chua uống men sống tốt cho sức khỏe\n🍪 Bánh quy dinh dưỡng xốp mềm\n\nBác muốn ${me} ghi chú thêm gợi ý loại nào vào danh sách không ${a}?`;
    } else {
      adviceReply = `${da}, ${me} gợi ý ${addressing} một vài tiêu chuẩn chọn mua đồ tốt nhất nè:\n\n✨ Ưu tiên sản phẩm của các thương hiệu quen thuộc, uy tín\n🗓️ Kiểm tra kỹ ngày sản xuất và hạn sử dụng trên bao bì\n📦 Chọn bao bì nguyên vẹn, không móp méo\n\n${addressing.charAt(0).toUpperCase() + addressing.slice(1)} muốn ${me} hỗ trợ chi tiết thêm về mục nào không ${a}?`;
    }

    return {
      reply: adviceReply,
      speech: adviceReply.replace(/\n/g, ' '),
      actions: [
        {
          type: 'ADD_FACT',
          payload: {
            category: 'requirement',
            title: 'Dặn dò / Yêu cầu mới',
            value: factVal,
          },
        },
      ],
      confidence: 0.95,
    };
  }

  // 7. Adding new fact or task from explicit requests
  // "Thêm việc: ..." or "Thêm công việc: ..."
  if (tLower.startsWith('thêm việc:') || tLower.startsWith('thêm việc ') || tLower.startsWith('thêm nhiệm vụ:')) {
    const taskName = text.replace(/^thêm\s*(việc|nhiệm vụ|công việc):?\s*/i, '').trim();
    if (taskName) {
      return {
        reply: `Mình đã thêm công việc: "${taskName}" vào danh sách rồi nhé!`,
        actions: [
          {
            type: 'ADD_TASK',
            payload: { title: taskName, important: false },
          },
        ],
        confidence: 0.95,
      };
    }
  }

  // "Lưu lại: ..." or "Ghi nhớ: ..."
  if (tLower.startsWith('lưu lại:') || tLower.startsWith('ghi nhớ:') || tLower.startsWith('lưu thông tin:')) {
    const factContent = text.replace(/^(lưu lại|ghi nhớ|lưu thông tin):?\s*/i, '').trim();
    if (factContent) {
      return {
        reply: `Mình đã ghi nhớ thông tin: "${factContent}" vào phiên rồi nha!`,
        actions: [
          {
            type: 'ADD_FACT',
            payload: {
              category: 'note',
              title: 'Ghi chú đã lưu',
              value: factContent,
            },
          },
        ],
        confidence: 0.95,
      };
    }
  }

  // "Đổi mục tiêu thành: ..."
  if (tLower.startsWith('đổi mục tiêu thành:') || tLower.startsWith('đổi mục tiêu:')) {
    const newGoal = text.replace(/^đổi mục tiêu( thành)?:?\s*/i, '').trim();
    if (newGoal) {
      return {
        reply: `Mình đã cập nhật mục tiêu mới của phiên thành: "${newGoal}" rồi nhé!`,
        actions: [{ type: 'CHANGE_GOAL', payload: { goal: newGoal } }],
        confidence: 0.95,
      };
    }
  }

  // 8. Polite greetings & conversational thanks
  if (tLower === 'cảm ơn' || tLower === 'cảm ơn bạn' || tLower === 'cảm ơn lovira' || tLower === 'cảm ơn nha' || tLower === 'thanks') {
    return {
      reply: 'Không có chi nè! Có mình luôn ở đây đồng hành cùng bạn nha. Bạn cần làm gì tiếp cứ nhắn mình nhé! ❤️',
      actions: [],
      confidence: 0.95,
    };
  }

  if (tLower === 'chào bạn' || tLower === 'alo' || tLower === 'hi lovira' || tLower === 'xin chào' || tLower === 'hello') {
    return {
      reply: `Chào bạn nha! Tụi mình đang thực hiện phiên "${session.title}". Bạn cần mình hỗ trợ điều gì tiếp theo nè?`,
      actions: [],
      confidence: 0.9,
    };
  }

  return null;
}
