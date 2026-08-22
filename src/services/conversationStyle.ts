import { AgentAction } from '../types';
import { UserProfile } from '../types/userProfile';
import { buildAddressing } from '../utils/filterRelevantConditions';

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

// Reliable user self-reference patterns in the current message (verb / self-state following pronoun)
const selfRefPatterns: { regex: RegExp; pronoun: string }[] = [
  { regex: /\bchú\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự)\b/i, pronoun: 'chú' },
  { regex: /\bbác\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự)\b/i, pronoun: 'bác' },
  { regex: /\bông\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự)\b/i, pronoun: 'ông' },
  { regex: /\bbà\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự)\b/i, pronoun: 'bà' },
  { regex: /\bcô\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự)\b/i, pronoun: 'cô' },
  { regex: /\banh\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự)\b/i, pronoun: 'anh' },
  { regex: /\bchị\s+(chưa|mua|đang|đã|sẽ|muốn|đi|có|làm|bận|nhờ|thấy|không|tới|cần|định|tự)\b/i, pronoun: 'chị' },
];

/**
 * Deduce natural honorifics:
 * 1. Prioritize confident self-reference in current message
 * 2. Fall back to saved user profile
 * 3. Default to neutral 'bạn'
 */
export function deduceHonorifics(userProfile?: UserProfile | null, textContext?: string): HonorificContext {
  let addressing = '';

  // 1. Check explicit self-reference in message
  if (textContext) {
    for (const item of selfRefPatterns) {
      if (item.regex.test(textContext)) {
        addressing = item.pronoun;
        break;
      }
    }
  }

  // 2. Fall back to user profile
  if (!addressing) {
    addressing = buildAddressing(userProfile) || '';
  }

  // 3. Fall back to neutral
  if (!addressing) {
    addressing = 'bạn';
  }

  const isElderly = ['bác', 'ông', 'bà', 'cô', 'chú'].some((p) => addressing.startsWith(p));
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
  const title = nextAction.title;
  const desc = nextAction.description || '';
  const intent = detectGuidanceIntent(title, desc, goal);

  const capAddressing = addressing.charAt(0).toUpperCase() + addressing.slice(1);

  const extra = desc ? ` (${desc})` : '';

  switch (intent) {
    case 'prepare':
      return `Tiếp theo, ${addressing} chuẩn bị phần "${title}" trước nhé${a}.${extra}`;

    case 'move':
      return `Bây giờ ${addressing} thong thả thực hiện bước "${title}" nhé${a}.${extra}`;

    case 'wait':
      return `${capAddressing} chờ theo bước "${title}" nhé${a}.${extra}`;

    case 'verify':
      return `Tiếp theo là phần kiểm tra: "${title}"${extra}. ${capAddressing} cứ thong thả thực hiện nhé${a}!`;

    case 'submit':
      return `${capAddressing} thực hiện "${title}" theo hướng dẫn nhé${a}.${extra}`;

    case 'complete':
      return `Phần việc tiếp theo: "${title}"${extra}. Khi hoàn thành ${addressing} cứ báo cho ${me} biết nhé${a}!`;

    case 'generic':
    default: {
      return `Tiếp theo, ${addressing} thong thả làm phần "${title}" trước nhé${a}.${extra} Khi nào xong ${addressing} cứ báo cho ${me} biết nha!`;
    }
  }
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
