import { AgentAction } from '../types.js';
import { UserProfile } from '../types/userProfile.js';
import { buildAddressing } from '../utils/filterRelevantConditions.js';

export interface HonorificContext {
  addressing: string;
  me: string;
  praise: string;
  da: string;
  a: string;
  isElderly: boolean;
  isYoungerSenior: boolean;
}

export type GuidanceIntent =
  | 'prepare'
  | 'move'
  | 'wait'
  | 'verify'
  | 'submit'
  | 'complete'
  | 'generic';

// Comprehensive user self-reference patterns in Vietnamese
const selfRefPatterns: { regex: RegExp; pronoun: string }[] = [
  // 1. Action requested for user: "gợi ý cho chú đi", "chỉ giúp bác", "nói cho anh nghe", "tư vấn cho cô"
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+chú\b/i, pronoun: 'chú' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+bác\b/i, pronoun: 'bác' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+ông\b/i, pronoun: 'ông' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+bà\b/i, pronoun: 'bà' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+cô\b/i, pronoun: 'cô' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+thím\b/i, pronoun: 'thím' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+cậu\b/i, pronoun: 'cậu' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+dì\b/i, pronoun: 'dì' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+dượng\b/i, pronoun: 'dượng' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+anh\b/i, pronoun: 'anh' },
  { regex: /\b(?:cho|giúp|chỉ|nói|hỏi|tư\s+vấn\s+(?:cho\s+)?|gợi\s+ý\s+(?:cho\s+)?|bảo|dặn)\s+chị\b/i, pronoun: 'chị' },

  // 2. Pronoun followed by verbs or sentence particles: "chú làm rồi", "chú đi nhé", "chú nè", "chú ơi"
  { regex: /\bchú\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'chú' },
  { regex: /\bbác\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'bác' },
  { regex: /\bông\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'ông' },
  { regex: /\bbà\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'bà' },
  { regex: /\bcô\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'cô' },
  { regex: /\bthím\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'thím' },
  { regex: /\bcậu\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'cậu' },
  { regex: /\bdì\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'dì' },
  { regex: /\bdượng\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'dượng' },
  { regex: /\banh\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'anh' },
  { regex: /\bchị\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự|hỏi|thích|nè|đây|này|ơi|nhé|nha|ạ|rùi|nhen)\b/i, pronoun: 'chị' },
];

/**
 * Deduce natural honorifics:
 * 1. Prioritize confident self-reference in current message
 * 2. Fall back to saved user profile
 * 3. Default to neutral 'bạn'
 */
export function deduceHonorifics(userProfile?: UserProfile | null, textContext?: string): HonorificContext {
  let pronounMatched = '';

  // 1. Check explicit self-reference in message
  if (textContext) {
    for (const item of selfRefPatterns) {
      if (item.regex.test(textContext)) {
        pronounMatched = item.pronoun;
        break;
      }
    }
  }

  const name = userProfile?.preferredName?.trim();
  let addressing = '';

  if (pronounMatched) {
    // If user's name is known and short, combine naturally (e.g. "chú Thái" or "chú")
    if (name && name.length <= 15) {
      addressing = `${pronounMatched} ${name}`;
    } else {
      addressing = pronounMatched;
    }
  } else {
    // 2. Fall back to user profile
    addressing = buildAddressing(userProfile) || '';
  }

  // 3. Fall back to neutral
  if (!addressing) {
    addressing = 'bạn';
  }

  const isElderly = ['bác', 'ông', 'bà', 'cô', 'chú', 'thím', 'cậu', 'dì', 'dượng'].some((p) => addressing.startsWith(p));
  const isYoungerSenior = ['anh', 'chị'].some((p) => addressing.startsWith(p));

  const me = isElderly ? 'con' : isYoungerSenior ? 'em' : 'Lovira';
  const praise = isElderly
    ? `Dạ mừng quá ${addressing} ơi!`
    : isYoungerSenior
    ? `Dạ tốt quá ${addressing} ơi!`
    : 'Tuyệt vời!';
  const da = isElderly || isYoungerSenior ? 'Dạ' : '';
  const a = isElderly || isYoungerSenior ? ' ạ' : '';

  return {
    addressing,
    me,
    praise,
    da,
    a,
    isElderly,
    isYoungerSenior,
  };
}

const movePrefixPatterns = [
  /^(đi\s+)?(đến|tới)\b/i,
  /^di\s+chuyển\b/i,
  /^sang\b/i,
  /^xuất\s+phát\b/i,
  /^ra\s+(quầy|cổng|xe|ga|bến|cửa)\b/i,
  /^bắt\s+(xe|tuyến|chuyến)\b/i,
  /^lên\s+(xe|tàu|máy\s+bay)\b/i,
];

function matchIntentString(text: string): GuidanceIntent {
  const t = text.trim().toLowerCase();

  // 1. Move check via prefix patterns and semantic keywords
  const hasMovePrefix = movePrefixPatterns.some((pattern) => pattern.test(t));
  if (
    hasMovePrefix ||
    t.includes('di chuyển') ||
    t.includes('xuất phát') ||
    t.includes('đến nơi') ||
    t.includes('lên xe') ||
    t.includes('bắt xe')
  ) {
    return 'move';
  }

  // 2. Prepare check
  if (
    t.includes('chuẩn bị') ||
    t.includes('kiểm tra giấy') ||
    t.includes('soạn') ||
    t.includes('danh sách') ||
    t.includes('mang theo') ||
    t.includes('ví tiền') ||
    t.includes('điện thoại') ||
    t.includes('hồ sơ') ||
    t.includes('sắp xếp đồ')
  ) {
    return 'prepare';
  }

  // 3. Wait check
  if (
    t.includes('lấy số') ||
    t.includes('bốc số') ||
    t.includes('tiếp nhận') ||
    t.includes('chờ gọi') ||
    t.includes('xếp hàng') ||
    t.includes('chờ đối chiếu') ||
    t.includes('ngồi chờ')
  ) {
    return 'wait';
  }

  // 4. Verify check
  if (
    t.includes('xét nghiệm') ||
    t.includes('đối chiếu') ||
    t.includes('kiểm tra') ||
    t.includes('đo ') ||
    t.includes('chụp ') ||
    t.includes('khám ')
  ) {
    return 'verify';
  }

  // 5. Submit check
  if (
    t.includes('thanh toán') ||
    t.includes('tính tiền') ||
    t.includes('nộp ') ||
    t.includes('bàn giao') ||
    t.includes('lấy thuốc') ||
    t.includes('nhận đơn') ||
    t.includes('nhận kết quả') ||
    t.includes('giấy hẹn') ||
    t.includes('gửi hồ sơ')
  ) {
    return 'submit';
  }

  // 6. Complete check
  if (
    t.includes('hoàn tất') ||
    t.includes('kết thúc') ||
    t.includes('lưu lịch') ||
    t.includes('tái khám') ||
    t.includes('tổng kết')
  ) {
    return 'complete';
  }

  return 'generic';
}

/**
 * Detect semantic guidance intent from task action semantics rather than rigid scenarios.
 * Checks primary task title & description first, only falls back to session goal if generic.
 */
export function detectGuidanceIntent(title: string, desc?: string, goal?: string): GuidanceIntent {
  const primary = `${title} ${desc || ''}`.trim();
  const primaryIntent = matchIntentString(primary);

  if (primaryIntent !== 'generic') {
    return primaryIntent;
  }

  // Light fallback to goal only if primary text was completely generic
  if (goal) {
    const goalIntent = matchIntentString(goal);
    if (goalIntent !== 'generic') {
      return goalIntent;
    }
  }

  return 'generic';
}

/**
 * Transforms raw Todo titles into warm, conversational, natural guidance based on action semantics
 */
export function formatSoftNextStepGuidance(
  nextAction: { title: string; description?: string },
  honorifics: HonorificContext,
  goal?: string
): string {
  const { addressing, me, a } = honorifics;
  const rawTitle = nextAction.title;
  const title = rawTitle.replace(/^(\d+[\.\)]|\s*[-*•])\s*/, '').replace(/["'“”]/g, '').trim();
  const desc = nextAction.description || '';
  const intent = detectGuidanceIntent(title, desc, goal);

  const capAddressing = addressing.charAt(0).toUpperCase() + addressing.slice(1);

  switch (intent) {
    case 'prepare':
      return `Tiếp theo, ${addressing} xem qua và chuẩn bị phần ${title.toLowerCase().startsWith('chuẩn bị') ? title : 'chuẩn bị ' + title} trước nhé${a}.`;

    case 'move':
      return `Bây giờ ${addressing} thong thả thực hiện bước ${title} nhé${a}.`;

    case 'wait':
      return `${capAddressing} chờ theo bước ${title} nhé${a}.`;

    case 'verify':
      return `Tiếp theo là phần kiểm tra: ${title}. ${capAddressing} cứ thong thả thực hiện nhé${a}!`;

    case 'submit':
      return `${capAddressing} thực hiện ${title} theo hướng dẫn nhé${a}.`;

    case 'complete':
      return `Phần việc tiếp theo là ${title}. Khi hoàn thành ${addressing} cứ báo cho ${me} biết nhé${a}!`;

    case 'generic':
    default: {
      return `Tiếp theo, ${addressing} thong thả làm phần ${title} trước nhé${a}. Khi nào xong ${addressing} cứ báo cho ${me} biết nha!`;
    }
  }
}

/**
 * Generates a warm, conversational, and natural initial greeting for a new session.
 * It summarizes the suggested todo list and asks an open, conversational kick-off question
 * without robotic quotation marks or stiff system language.
 */
export function formatInitialSessionGreeting(
  sessionTitle: string,
  tasks: { title: string }[],
  honorifics: HonorificContext,
  goal?: string
): string {
  const { addressing, me, da, a } = honorifics;
  const prefix = da ? `${da}, ` : '';

  const contextText = `${sessionTitle} ${goal || ''}`.toLowerCase();

  // 1. Warm, human opening based on scenario context
  let intro = '';
  if (contextText.includes('phỏng vấn') || contextText.includes('xin việc') || contextText.includes('tuyển dụng')) {
    intro = `${prefix}${me} chào ${addressing}, ${me} sẽ đồng hành và hỗ trợ ${addressing} chuẩn bị thật chu đáo cho buổi phỏng vấn nhé! ${me.charAt(0).toUpperCase() + me.slice(1)} có lên danh sách gợi ý các việc chúng ta cùng làm nè:`;
  } else if (contextText.includes('mua') || contextText.includes('đồ ăn') || contextText.includes('chợ') || contextText.includes('siêu thị')) {
    intro = `${prefix}${me} chào ${addressing}, ${me} sẽ hỗ trợ ${addressing} đi mua đồ ăn nhé! ${me.charAt(0).toUpperCase() + me.slice(1)} có liệt kê dự kiến các việc chúng ta cần thực hiện như sau:`;
  } else if (contextText.includes('khám') || contextText.includes('bệnh') || contextText.includes('bác sĩ') || contextText.includes('thuốc') || contextText.includes('viện')) {
    intro = `${prefix}${me} chào ${addressing}, ${me} sẽ đồng hành cùng ${addressing} trong buổi đi khám bệnh này nhé. ${me.charAt(0).toUpperCase() + me.slice(1)} có gợi ý các bước chuẩn bị như sau:`;
  } else if (contextText.includes('thủ tục') || contextText.includes('giấy tờ') || contextText.includes('hành chính') || contextText.includes('cccd') || contextText.includes('hộ chiếu')) {
    intro = `${prefix}${me} chào ${addressing}, ${me} sẽ hỗ trợ ${addressing} chuẩn bị các thủ tục giấy tờ nhé! Dưới đây là các việc dự kiến chúng ta cùng thực hiện nè:`;
  } else {
    intro = `${prefix}${me} chào ${addressing}, ${me} đã chuẩn bị kế hoạch để hỗ trợ ${addressing} rồi đây ạ. Dưới đây là các việc dự kiến chúng ta cùng làm nhé:`;
  }

  // 2. Clear, structured todo list preview (clean up any existing bullet prefixes)
  const taskListText = tasks
    .slice(0, 8)
    .map((t, idx) => {
      const cleanTitle = t.title.replace(/^(\d+[\.\)]|\s*[-*•])\s*/, '').replace(/["'“”]/g, '').trim();
      return `${idx + 1}. ${cleanTitle}`;
    })
    .join('\n');

  // 3. Conversational kick-off question (transforming the first task into natural spoken Vietnamese)
  const firstTitle = (tasks[0]?.title || '').toLowerCase();
  let kickOffQuestion = '';

  if (firstTitle.includes('xác nhận') || firstTitle.includes('thông tin') || firstTitle.includes('thời gian') || firstTitle.includes('địa điểm') || firstTitle.includes('giờ') || firstTitle.includes('hr')) {
    kickOffQuestion = `Giờ mình bắt đầu nhé, ${addressing} đã có thông tin về thời gian và địa điểm chưa nè?`;
  } else if (firstTitle.includes('chọn món') || firstTitle.includes('mua gì') || firstTitle.includes('món ăn') || firstTitle.includes('chọn')) {
    kickOffQuestion = `Giờ mình bắt đầu nhé, ${addressing} đã biết mình muốn mua món gì chưa nè?`;
  } else if (firstTitle.includes('tiền') || firstTitle.includes('ví')) {
    kickOffQuestion = `Giờ mình bắt đầu nhé, ${addressing} đã chuẩn bị sẵn ví tiền chưa ạ?`;
  } else if (firstTitle.includes('giấy tờ') || firstTitle.includes('hồ sơ') || firstTitle.includes('cv') || firstTitle.includes('cccd')) {
    kickOffQuestion = `Giờ mình bắt đầu nhé, ${addressing} đã chuẩn bị sẵn các giấy tờ cần thiết chưa nè?`;
  } else if (firstTitle.includes('đơn thuốc') || firstTitle.includes('sổ khám')) {
    kickOffQuestion = `Giờ mình bắt đầu nhé, ${addressing} đã tìm thấy sổ khám hoặc đơn thuốc cũ chưa ạ?`;
  } else {
    const cleanFirstTitle = (tasks[0]?.title || '').replace(/^(\d+[\.\)]|\s*[-*•])\s*/, '').replace(/["'“”]/g, '').trim();
    if (cleanFirstTitle) {
      kickOffQuestion = `Giờ mình bắt đầu nhé, ${addressing} xem qua danh sách và cho ${me} biết ${addressing} muốn bắt đầu từ bước nào nha!`;
    } else {
      kickOffQuestion = `Giờ mình bắt đầu nhé, ${addressing} cần ${me} hỗ trợ gì đầu tiên nè?`;
    }
  }

  return `${intro}\n\n${taskListText}\n\n${kickOffQuestion}`;
}

/**
 * Reconciles chat bubble reply text with the truth of the state when action batch was only partially applied
 */
export function buildPartialSuccessReply(
  appliedActions: AgentAction[],
  rejectedActions: { action: AgentAction; reason: string }[],
  originalReply: string,
  honorifics: HonorificContext
): string {
  const { addressing, me, da, a } = honorifics;
  const appliedPhrases: string[] = [];

  for (const act of appliedActions) {
    if (act.type === 'ADD_FACT' || act.type === 'UPDATE_FACT') {
      const title = act.payload?.title || 'thông tin';
      appliedPhrases.push(`đã lưu "${title}"`);
    } else if (act.type === 'DELETE_FACT') {
      appliedPhrases.push('đã xóa thông tin');
    } else if (act.type === 'COMPLETE_TASK' || act.type === 'COMPLETE_SUBTASK') {
      appliedPhrases.push('đã đánh dấu hoàn thành bước này');
    } else if (act.type === 'SKIP_TASK') {
      appliedPhrases.push('đã bỏ qua bước này');
    } else if (act.type === 'ADD_TASK' || act.type === 'ADD_SUBTASK') {
      const title = act.payload?.title || 'việc mới';
      appliedPhrases.push(`đã thêm "${title}" vào danh sách`);
    } else if (act.type === 'UPDATE_TASK') {
      appliedPhrases.push('đã cập nhật nội dung công việc');
    } else if (act.type === 'DELETE_TASK') {
      appliedPhrases.push('đã xóa công việc khỏi danh sách');
    } else if (act.type === 'REORDER_TASK') {
      appliedPhrases.push('đã sắp xếp lại thứ tự công việc');
    } else if (act.type === 'CHANGE_GOAL') {
      appliedPhrases.push('đã cập nhật mục tiêu phiên');
    } else if (act.type === 'UPDATE_NEXT_ACTION') {
      appliedPhrases.push('đã cập nhật bước tiếp theo');
    } else if (
      act.type === 'PAUSE_SESSION' ||
      act.type === 'RESUME_SESSION' ||
      act.type === 'COMPLETE_SESSION' ||
      act.type === 'UPDATE_SESSION'
    ) {
      appliedPhrases.push('đã cập nhật trạng thái phiên');
    } else if (act.type === 'ADD_RESOURCE') {
      appliedPhrases.push('đã lưu tài liệu đính kèm');
    }
  }

  const prefix = da ? `${da}, ` : '';
  if (appliedPhrases.length > 0) {
    const successPart = appliedPhrases.join(' và ');
    return `${prefix}${me} ${successPart}. Tuy nhiên, một số cập nhật khác chưa thực hiện được do dữ liệu chưa khớp. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} xem lại giúp ${me} nhé${a}!`;
  }

  // Absolute safe fallback - NEVER return original full-success claim on partial batches
  return `${prefix}${me} đã cập nhật một phần phiên. Một số thay đổi khác chưa thể thực hiện được${a}.`;
}
