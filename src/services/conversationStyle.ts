import { UserProfile } from '../types';
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
 * Transforms raw Todo titles into warm, conversational, natural spoken prompts
 */
export function formatSoftNextStepGuidance(
  nextAction: { title: string; description?: string },
  honorifics: HonorificContext,
  goal?: string
): string {
  const { addressing, me, a } = honorifics;
  const title = nextAction.title;
  const titleLower = title.toLowerCase();
  const desc = nextAction.description || '';
  const goalLower = (goal || '').toLowerCase();

  // 1. Shopping / Đi chợ / Mua sắm
  if (
    titleLower.includes('danh sách') ||
    titleLower.includes('loại đồ') ||
    titleLower.includes('mua gì') ||
    goalLower.includes('mua') ||
    goalLower.includes('chợ')
  ) {
    if (titleLower.includes('di chuyển') || titleLower.includes('đến cửa hàng') || titleLower.includes('siêu thị')) {
      return `Bây giờ ${addressing} thong thả di chuyển ra cửa hàng nhé${a}, đi đường ${addressing} đi cẩn thận nha!`;
    }
    if (titleLower.includes('thanh toán') || titleLower.includes('tính tiền')) {
      return `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} đem đồ ra quầy thu ngân thanh toán và kiểm tra lại túi đồ nhé${a}!`;
    }
    return `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} kiểm tra lại xem cần mua thêm món gì và mang theo ví tiền hoặc điện thoại trước khi đi nhé${a}!`;
  }

  // 2. Healthcare / Khám bệnh
  if (
    titleLower.includes('lấy số') ||
    titleLower.includes('bốc số') ||
    titleLower.includes('tiếp nhận')
  ) {
    return `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} lại quầy tiếp nhận lấy số thứ tự khám trước nhé${a}!`;
  }
  if (
    titleLower.includes('phòng khám') ||
    titleLower.includes('đến phòng') ||
    titleLower.includes('chờ gọi')
  ) {
    return `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} thong thả lại trước phòng khám ngồi nghỉ ngơi một chút trong lúc chờ gọi số nhé${a}!`;
  }
  if (titleLower.includes('xét nghiệm') || titleLower.includes('lấy máu')) {
    return `Bây giờ ${addressing} sang phòng làm xét nghiệm theo chỉ dẫn của bác sĩ nhé${a}!`;
  }
  if (titleLower.includes('đơn thuốc') || titleLower.includes('lấy thuốc')) {
    return `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} mang đơn qua quầy dược để nhận thuốc nhé${a}!`;
  }

  // 3. Administrative / CCCD / Giấy tờ
  if (titleLower.includes('kiểm tra giấy') || titleLower.includes('chuẩn bị giấy') || titleLower.includes('hồ sơ')) {
    return `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} kiểm tra sẵn các giấy tờ cần thiết cất vào túi mang theo nhé${a}!`;
  }
  if (titleLower.includes('bộ phận 1 cửa') || titleLower.includes('cơ quan') || titleLower.includes('trụ sở')) {
    return `Bây giờ ${addressing} thong thả đến nơi làm thủ tục nhé${a}, đi đường ${addressing} đi cẩn thận ạ!`;
  }
  if (titleLower.includes('giấy hẹn') || titleLower.includes('mã hồ sơ')) {
    return `${addressing.charAt(0).toUpperCase() + addressing.slice(1)} nhớ giữ kỹ giấy hẹn hoặc lưu lại mã hồ sơ nhé${a}!`;
  }

  // 4. Movement / Di chuyển chung
  if (titleLower.startsWith('đến') || titleLower.startsWith('di chuyển') || titleLower.includes('xuất phát')) {
    return `Bây giờ ${addressing} thong thả di chuyển đến nơi nhé${a}, đi đường cẩn thận ạ!`;
  }

  // 5. Default natural formulation
  const actionContent = desc ? `${title} (${desc})` : title;
  return `Tiếp theo, ${addressing} thong thả làm phần này trước nhé${a}: ${actionContent}. Khi nào xong ${addressing} cứ báo cho ${me} biết nha!`;
}
