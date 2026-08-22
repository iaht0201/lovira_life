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

/**
 * Deduce natural honorifics without forced repetition or robotic stiffness
 */
export function deduceHonorifics(userProfile?: UserProfile | null, textContext?: string): HonorificContext {
  let addressing = buildAddressing(userProfile) || '';
  const textLower = (textContext || '').toLowerCase();

  // Infer addressing from text if profile didn't specify
  if (!addressing) {
    if (textLower.includes('bác ') || textLower.startsWith('bác') || textLower.endsWith('bác')) addressing = 'bác';
    else if (textLower.includes('ông ') || textLower.startsWith('ông')) addressing = 'ông';
    else if (textLower.includes('bà ') || textLower.startsWith('bà')) addressing = 'bà';
    else if (textLower.includes('cô ') || textLower.startsWith('cô')) addressing = 'cô';
    else if (textLower.includes('chú ') || textLower.startsWith('chú')) addressing = 'chú';
    else if (textLower.includes('anh ') || textLower.startsWith('anh')) addressing = 'anh';
    else if (textLower.includes('chị ') || textLower.startsWith('chị')) addressing = 'chị';
    else addressing = 'bạn';
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

/**
 * Detect semantic guidance intent from task action semantics rather than rigid scenarios
 */
export function detectGuidanceIntent(title: string, desc?: string, goal?: string): GuidanceIntent {
  const combined = `${title} ${desc || ''} ${goal || ''}`.toLowerCase();

  if (
    combined.includes('chuẩn bị') ||
    combined.includes('kiểm tra giấy') ||
    combined.includes('soạn') ||
    combined.includes('danh sách') ||
    combined.includes('mang theo') ||
    combined.includes('ví tiền') ||
    combined.includes('điện thoại') ||
    combined.includes('hồ sơ')
  ) {
    return 'prepare';
  }

  if (
    combined.includes('di chuyển') ||
    combined.includes('đến nơi') ||
    combined.includes('đến cửa hàng') ||
    combined.includes('đến phòng') ||
    combined.includes('sang phòng') ||
    combined.includes('xuất phát') ||
    combined.includes('ra quầy') ||
    combined.includes('tới')
  ) {
    return 'move';
  }

  if (
    combined.includes('lấy số') ||
    combined.includes('bốc số') ||
    combined.includes('tiếp nhận') ||
    combined.includes('chờ gọi') ||
    combined.includes('xếp hàng') ||
    combined.includes('chờ đối chiếu')
  ) {
    return 'wait';
  }

  if (
    combined.includes('xét nghiệm') ||
    combined.includes('đối chiếu') ||
    combined.includes('kiểm tra thành phần') ||
    combined.includes('đo') ||
    combined.includes('chụp') ||
    combined.includes('khám')
  ) {
    return 'verify';
  }

  if (
    combined.includes('thanh toán') ||
    combined.includes('tính tiền') ||
    combined.includes('nộp hồ sơ') ||
    combined.includes('bàn giao') ||
    combined.includes('lấy thuốc') ||
    combined.includes('nhận đơn') ||
    combined.includes('nhận kết quả') ||
    combined.includes('giấy hẹn')
  ) {
    return 'submit';
  }

  if (
    combined.includes('hoàn tất') ||
    combined.includes('kết thúc') ||
    combined.includes('lưu lịch') ||
    combined.includes('tái khám')
  ) {
    return 'complete';
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

  switch (intent) {
    case 'prepare':
      return `${capAddressing} kiểm tra lại các đồ dùng hoặc giấy tờ cần thiết trước khi bắt đầu nhé${a}!`;

    case 'move':
      return `Bây giờ ${addressing} thong thả di chuyển đến nơi nhé${a}, đi đường ${addressing} đi cẩn thận nha!`;

    case 'wait':
      return `${capAddressing} lại quầy lấy số thứ tự hoặc ngồi nghỉ ngơi một chút trong lúc chờ lượt nhé${a}!`;

    case 'verify':
      return `Tiếp theo là phần kiểm tra: ${title}${desc ? ` (${desc})` : ''}. ${capAddressing} cứ thong thả thực hiện nhé${a}!`;

    case 'submit':
      return `${capAddressing} tiến hành ${title.toLowerCase()} theo hướng dẫn nhé${a}. Xong ${addressing} nhớ kiểm tra lại đồ đạc nha!`;

    case 'complete':
      return `Phần việc tiếp theo: ${title}. Khi hoàn thành ${addressing} cứ báo cho ${me} biết nhé${a}!`;

    case 'generic':
    default: {
      const actionContent = desc ? `${title} (${desc})` : title;
      return `Tiếp theo, ${addressing} thong thả làm phần này trước nhé${a}: ${actionContent}. Khi nào xong ${addressing} cứ báo cho ${me} biết nha!`;
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
      const title = act.payload?.title || 'thông tin mới';
      appliedPhrases.push(`đã lưu "${title}"`);
    } else if (act.type === 'COMPLETE_TASK' || act.type === 'COMPLETE_SUBTASK') {
      appliedPhrases.push('đã đánh dấu hoàn thành bước này');
    } else if (act.type === 'ADD_TASK' || act.type === 'ADD_SUBTASK') {
      const title = act.payload?.title || 'việc mới';
      appliedPhrases.push(`đã thêm "${title}" vào danh sách`);
    } else if (act.type === 'UPDATE_NEXT_ACTION') {
      appliedPhrases.push('đã cập nhật bước tiếp theo');
    }
  }

  const prefix = da ? `${da}, ` : '';
  if (appliedPhrases.length > 0) {
    const successPart = appliedPhrases.join(' và ');
    return `${prefix}${me} ${successPart}. Tuy nhiên, một số cập nhật tiến độ chưa thực hiện được do dữ liệu chưa khớp. ${addressing.charAt(0).toUpperCase() + addressing.slice(1)} xem lại giúp ${me} nhé${a}!`;
  }

  return originalReply;
}
