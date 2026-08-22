import { ScenarioFamily, LifeModule, ImportantFactType } from '../types';
import { SCENARIO_REGISTRY } from './scenarioRegistry';

export interface ScenarioRoutingResult {
  family: ScenarioFamily;
  subtype?: string;
  confidence: number;
  modules: LifeModule[];
  suggestedTemplate?: string;
  requiresCustomPlan: boolean;
  secondaryFamilies?: ScenarioFamily[];
}

export interface ExtractedFact {
  type: ImportantFactType;
  title: string;
  value: string;
  source?: string;
}

/**
 * Extracts real, grounded facts explicitly mentioned by the user in their prompt.
 * Never invents or assumes unmentioned facts.
 */
export function extractKnownFacts(userInput: string): ExtractedFact[] {
  if (!userInput || !userInput.trim()) return [];
  const text = userInput.trim();
  const tLower = text.toLowerCase();
  const facts: ExtractedFact[] = [];

  // 1. Time / Date extraction
  // Relative dates
  if (tLower.includes('sáng mai') || tLower.includes('ngày mai') || tLower.startsWith('mai ') || tLower.includes(' mai ')) {
    const timeMatch = text.match(/(?:lúc|vào lúc|khoảng)?\s*(\d{1,2}(?:h|:\d{2})(?:\s*(?:sáng|chiều|tối))?)/i);
    const timeVal = timeMatch ? `Ngày mai, lúc ${timeMatch[1]}` : 'Ngày mai';
    facts.push({ type: 'time', title: 'Thời gian', value: timeVal });
  } else if (tLower.includes('chiều nay') || tLower.includes('tối nay') || tLower.includes('sáng nay') || tLower.includes('hôm nay')) {
    let dayPeriod = 'Hôm nay';
    if (tLower.includes('chiều nay')) dayPeriod = 'Chiều nay';
    if (tLower.includes('tối nay')) dayPeriod = 'Tối nay';
    if (tLower.includes('sáng nay')) dayPeriod = 'Sáng nay';

    const timeMatch = text.match(/(?:lúc|vào lúc|khoảng)?\s*(\d{1,2}(?:h|:\d{2})(?:\s*(?:sáng|chiều|tối))?)/i);
    const timeVal = timeMatch ? `${dayPeriod}, lúc ${timeMatch[1]}` : dayPeriod;
    facts.push({ type: 'time', title: 'Thời gian', value: timeVal });
  } else {
    // Specific date/time pattern (e.g. "lúc 8 giờ", "lúc 14:00", "ngày 6/9", "ngày 15 tháng 10")
    const dateMatch = text.match(/ngày\s+(\d{1,2}(?:\/|\s+tháng\s+)\d{1,2}(?:\/\d{2,4})?)/i);
    const timeMatch = text.match(/(?:lúc|vào lúc)\s*(\d{1,2}(?::\d{2}|h\d{0,2})(?:\s*(?:sáng|chiều|tối))?)/i);

    if (dateMatch) {
      facts.push({ type: 'date', title: 'Ngày thực hiện', value: dateMatch[1].replace(/\s+/g, ' ') });
    }
    if (timeMatch) {
      facts.push({ type: 'time', title: 'Giờ hẹn', value: timeMatch[1] });
    }
  }

  // 2. Location / Address extraction (e.g. "tại văn phòng công ty FPT", "ở bệnh viện Chợ Rẫy", "đến ngân hàng Vietcombank")
  const locMatch = text.match(/(?:tại|ở|đến|ra|về)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s,.-]{3,35})(?=\s+(?:lúc|vào|để|và|rồi|hẹn)|$)/);
  if (locMatch && locMatch[1]) {
    const rawLoc = locMatch[1].trim();
    if (!['ngày mai', 'chiều nay', 'hôm nay', 'sáng mai', 'nơi'].includes(rawLoc.toLowerCase())) {
      facts.push({ type: 'location', title: 'Địa điểm', value: rawLoc });
    }
  }

  // 3. Person extraction (e.g. "cho anh Nam", "gặp chị Lan", "bác sĩ Minh", "đón mẹ")
  const personMatch = text.match(/(?:với|cho|gặp|đón|thăm)\s+(anh|chị|em|cô|chú|bác|bác sĩ|mẹ|bố|bạn)\s+([A-ZÀ-Ỹa-zà-ỹ]+)/i);
  if (personMatch && personMatch[2]) {
    const titlePrefix = personMatch[1].charAt(0).toUpperCase() + personMatch[1].slice(1);
    const pName = personMatch[2].charAt(0).toUpperCase() + personMatch[2].slice(1);
    facts.push({ type: 'person', title: 'Người liên quan', value: `${titlePrefix} ${pName}` });
  } else if (tLower.includes('đón mẹ')) {
    facts.push({ type: 'person', title: 'Người cần đón', value: 'Mẹ' });
  }

  return facts;
}

export function routeScenario(userInput: string): ScenarioRoutingResult {
  if (!userInput || !userInput.trim()) {
    return {
      family: 'custom',
      confidence: 0,
      modules: SCENARIO_REGISTRY.custom.defaultModules,
      requiresCustomPlan: true,
    };
  }

  const text = userInput.toLowerCase();
  const detectedFamilies: { family: ScenarioFamily; confidence: number; subtype?: string }[] = [];

  // 1. Healthcare
  if (
    text.includes('khám') ||
    text.includes('bệnh') ||
    text.includes('bác sĩ') ||
    text.includes('xét nghiệm') ||
    text.includes('đơn thuốc') ||
    text.includes('thuốc') ||
    text.includes('bệnh viện') ||
    text.includes('phòng khám') ||
    text.includes('y tế') ||
    text.includes('tái khám')
  ) {
    let subtype = 'general_medical';
    if (text.includes('răng')) subtype = 'dental';
    if (text.includes('mắt')) subtype = 'eye';
    if (text.includes('tim')) subtype = 'cardiology';
    if (text.includes('máu') || text.includes('xét nghiệm')) subtype = 'lab_test';
    detectedFamilies.push({ family: 'healthcare', confidence: 0.95, subtype });
  }

  // 2. Administrative
  if (
    text.includes('cccd') ||
    text.includes('hộ chiếu') ||
    text.includes('khai sinh') ||
    text.includes('hành chính') ||
    text.includes('thủ tục') ||
    text.includes('giấy tờ công') ||
    text.includes('bảo hiểm xã hội') ||
    text.includes('thuế') ||
    text.includes('ủy ban') ||
    text.includes('phường') ||
    text.includes('quận')
  ) {
    let subtype = 'general_admin';
    if (text.includes('hộ chiếu') || text.includes('passport')) subtype = 'passport';
    if (text.includes('cccd') || text.includes('căn cước')) subtype = 'id_card';
    detectedFamilies.push({ family: 'administrative', confidence: 0.9, subtype });
  }

  // 3. Finance & Banking
  if (
    text.includes('ngân hàng') ||
    text.includes('làm thẻ') ||
    text.includes('mở tài khoản') ||
    text.includes('chuyển khoản') ||
    text.includes('rút tiền') ||
    text.includes('atm') ||
    text.includes('sổ tiết kiệm')
  ) {
    detectedFamilies.push({ family: 'finance', confidence: 0.9 });
  }

  // 4. Work & Interview
  if (
    text.includes('phỏng vấn') ||
    text.includes('xin việc') ||
    text.includes('tìm việc') ||
    text.includes('đi làm') ||
    text.includes('cuộc họp') ||
    text.includes('nộp cv') ||
    text.includes('thử việc')
  ) {
    detectedFamilies.push({ family: 'work', confidence: 0.9 });
  }

  // 5. Technology & Warranty
  if (
    text.includes('laptop') ||
    text.includes('bảo hành') ||
    text.includes('sửa điện thoại') ||
    text.includes('sửa máy tính') ||
    text.includes('thiết bị') ||
    text.includes('cài ứng dụng') ||
    text.includes('wifi')
  ) {
    detectedFamilies.push({ family: 'technology', confidence: 0.85 });
  }

  // 6. Travel & Trips / Airport
  if (
    text.includes('sân bay') ||
    text.includes('đón mẹ') ||
    text.includes('đón người thân') ||
    text.includes('du lịch') ||
    text.includes('chuyến đi') ||
    text.includes('vé máy bay') ||
    text.includes('khách sạn') ||
    text.includes('ga tàu')
  ) {
    detectedFamilies.push({ family: 'travel', confidence: 0.85 });
  }

  // 7. Home & Moving / Repairs
  if (
    text.includes('chuyển nhà') ||
    text.includes('sửa điều hòa') ||
    text.includes('sửa nhà') ||
    text.includes('dọn dẹp') ||
    text.includes('sửa điện') ||
    text.includes('sửa xe')
  ) {
    detectedFamilies.push({ family: 'home', confidence: 0.85 });
  }

  // 8. Shopping
  if (
    text.includes('siêu thị') ||
    text.includes('mua sắm') ||
    text.includes('đi chợ') ||
    text.includes('mua đồ') ||
    text.includes('danh sách mua') ||
    text.includes('mua thực phẩm')
  ) {
    detectedFamilies.push({ family: 'shopping', confidence: 0.9 });
  }

  // 9. Safety & Emergency
  if (
    text.includes('mất ví') ||
    text.includes('khóa thẻ') ||
    text.includes('mất đồ') ||
    text.includes('sự cố') ||
    text.includes('khẩn cấp')
  ) {
    detectedFamilies.push({ family: 'safety', confidence: 0.9 });
  }

  // Multi-domain routing
  if (detectedFamilies.length > 1) {
    const secondaryFamilies = detectedFamilies.slice(1).map((f) => f.family);
    return {
      family: 'planning',
      confidence: 0.85,
      modules: ['checklist', 'appointment', 'deadline', 'notes'],
      secondaryFamilies,
      requiresCustomPlan: true,
    };
  }

  if (detectedFamilies.length === 1) {
    const match = detectedFamilies[0];
    const registryEntry = SCENARIO_REGISTRY[match.family] || SCENARIO_REGISTRY.custom;
    return {
      family: match.family,
      subtype: match.subtype,
      confidence: match.confidence,
      modules: registryEntry.defaultModules,
      suggestedTemplate: `${match.family}_standard`,
      requiresCustomPlan: match.family !== 'healthcare' && match.family !== 'administrative' && match.family !== 'shopping',
    };
  }

  // Default / Low confidence -> Custom
  return {
    family: 'custom',
    confidence: 0.4,
    modules: SCENARIO_REGISTRY.custom.defaultModules,
    requiresCustomPlan: true,
  };
}
