import { ScenarioFamily, LifeModule, ImportantFactType } from '../types.js';
import { SCENARIO_REGISTRY } from './scenarioRegistry.js';

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

  // 1. Date extraction
  if (tLower.includes('ngày mai') || tLower.includes('sáng mai') || tLower.startsWith('mai ') || tLower.includes(' mai ') || tLower.endsWith(' mai')) {
    facts.push({ type: 'date', title: 'Ngày thực hiện', value: 'Ngày mai' });
  } else if (tLower.includes('hôm nay') || tLower.includes('sáng nay') || tLower.includes('chiều nay') || tLower.includes('tối nay')) {
    let dayVal = 'Hôm nay';
    if (tLower.includes('sáng nay')) dayVal = 'Sáng nay';
    else if (tLower.includes('chiều nay')) dayVal = 'Chiều nay';
    else if (tLower.includes('tối nay')) dayVal = 'Tối nay';
    facts.push({ type: 'date', title: 'Ngày thực hiện', value: dayVal });
  } else {
    const dateMatch = text.match(/ngày\s+(\d{1,2}(?:\/|\s+tháng\s+)\d{1,2}(?:\/\d{2,4})?)/i);
    if (dateMatch) {
      facts.push({ type: 'date', title: 'Ngày thực hiện', value: dateMatch[1].replace(/\s+/g, ' ') });
    }
  }

  // 2. Time extraction (supports "9h", "9h30", "9 giờ sáng", "2 giờ chiều", "14:00", "lúc 8 giờ")
  const timeRegex = /(?:lúc|vào lúc|khoảng)?\s*(\d{1,2}(?::\d{2}|h\d{0,2}|\s*giờ(?:\s*\d{1,2}(?:p|phút)?)?)(?:\s*(?:sáng|trưa|chiều|tối))?)/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch && timeMatch[1]) {
    const rawTime = timeMatch[1].trim();
    // Verify it's actually a time string and not just a plain day word
    if (!['ngày mai', 'chiều nay', 'hôm nay', 'sáng mai', 'mai'].includes(rawTime.toLowerCase()) && (rawTime.includes('h') || rawTime.includes(':') || rawTime.includes('giờ'))) {
      facts.push({ type: 'time', title: 'Thời gian', value: rawTime });
    }
  }

  // 3. Location / Address extraction (e.g. "tại văn phòng FPT", "ở bệnh viện Chợ Rẫy", "đến ngân hàng Vietcombank")
  const locMatch = text.match(/(?:tại|ở|đến|ra|về)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s,.-]{3,35})(?=\s+(?:lúc|vào|để|và|rồi|hẹn)|$)/);
  if (locMatch && locMatch[1]) {
    const rawLoc = locMatch[1].trim();
    if (!['ngày mai', 'chiều nay', 'hôm nay', 'sáng mai', 'mai', 'nơi', 'đây', 'đó'].includes(rawLoc.toLowerCase())) {
      facts.push({ type: 'location', title: 'Địa điểm', value: rawLoc });
    }
  }

  // 4. Person extraction (e.g. "cho anh Nam", "gặp chị Lan", "bác sĩ Minh", "đón mẹ")
  const personMatch = text.match(/(?:với|cho|gặp|đón|thăm)\s+(anh|chị|em|cô|chú|bác|bác sĩ|mẹ|bố|bạn)\s+([A-ZÀ-Ỹa-zà-ỹ]+)/i);
  if (personMatch && personMatch[2]) {
    const titlePrefix = personMatch[1].charAt(0).toUpperCase() + personMatch[1].slice(1);
    const pName = personMatch[2].charAt(0).toUpperCase() + personMatch[2].slice(1);
    facts.push({ type: 'person', title: 'Người liên quan', value: `${titlePrefix} ${pName}` });
  } else if (tLower.includes('đón mẹ')) {
    facts.push({ type: 'person', title: 'Người liên quan', value: 'Mẹ' });
  } else if (tLower.includes('đón bố')) {
    facts.push({ type: 'person', title: 'Người liên quan', value: 'Bố' });
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
    else if (text.includes('mắt')) subtype = 'eye';
    else if (text.includes('tim')) subtype = 'cardiology';
    else if (text.includes('máu') || text.includes('xét nghiệm')) subtype = 'lab_test';
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
    else if (text.includes('cccd') || text.includes('căn cước')) subtype = 'id_card';
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
    text.includes('sổ tiết kiệm') ||
    text.includes('thẻ tín dụng') ||
    text.includes('vay vốn')
  ) {
    let subtype = 'banking';
    if (text.includes('làm thẻ') || text.includes('thẻ atm') || text.includes('làm lại thẻ')) subtype = 'bank_card';
    else if (text.includes('mở tài khoản')) subtype = 'bank_account';
    else if (text.includes('sổ tiết kiệm')) subtype = 'savings';
    detectedFamilies.push({ family: 'finance', confidence: 0.9, subtype });
  }

  // 4. Work & Career
  if (
    text.includes('phỏng vấn') ||
    text.includes('xin việc') ||
    text.includes('tìm việc') ||
    text.includes('đi làm') ||
    text.includes('cuộc họp') ||
    text.includes('họp') ||
    text.includes('nộp cv') ||
    text.includes('thử việc') ||
    text.includes('công tác')
  ) {
    let subtype = 'work_task';
    if (text.includes('phỏng vấn')) subtype = 'interview';
    else if (text.includes('xin việc') || text.includes('nộp cv') || text.includes('tìm việc')) subtype = 'job_application';
    else if (text.includes('họp') || text.includes('cuộc họp')) subtype = 'meeting';
    else if (text.includes('thử việc')) subtype = 'probation';
    detectedFamilies.push({ family: 'work', confidence: 0.9, subtype });
  }

  // 5. Technology & Warranty & Repairs
  if (
    text.includes('laptop') ||
    text.includes('bảo hành') ||
    text.includes('sửa điện thoại') ||
    text.includes('sửa máy tính') ||
    text.includes('sửa laptop') ||
    text.includes('thiết bị') ||
    text.includes('cài ứng dụng') ||
    text.includes('cài máy') ||
    text.includes('wifi')
  ) {
    let subtype = 'technology_help';
    if (text.includes('bảo hành')) subtype = 'device_warranty';
    else if (text.includes('sửa')) subtype = 'device_repair';
    else if (text.includes('cài') || text.includes('wifi')) subtype = 'tech_setup';
    detectedFamilies.push({ family: 'technology', confidence: 0.85, subtype });
  }

  // 6. Travel & Trips / Airport
  if (
    text.includes('sân bay') ||
    text.includes('đón mẹ') ||
    text.includes('đón bố') ||
    text.includes('đón người thân') ||
    text.includes('du lịch') ||
    text.includes('chuyến đi') ||
    text.includes('vé máy bay') ||
    text.includes('khách sạn') ||
    text.includes('ga tàu') ||
    text.includes('bến xe')
  ) {
    let subtype = 'travel_trip';
    if (text.includes('sân bay') || text.includes('đón')) subtype = 'airport_pickup';
    else if (text.includes('du lịch') || text.includes('khách sạn')) subtype = 'vacation';
    else if (text.includes('vé máy bay')) subtype = 'flight_booking';
    detectedFamilies.push({ family: 'travel', confidence: 0.85, subtype });
  }

  // 7. Home & Moving / Repairs
  if (
    text.includes('chuyển nhà') ||
    text.includes('sửa điều hòa') ||
    text.includes('sửa nhà') ||
    text.includes('dọn dẹp') ||
    text.includes('sửa điện') ||
    text.includes('sửa ống nước') ||
    text.includes('sửa xe')
  ) {
    let subtype = 'home_maintenance';
    if (text.includes('chuyển nhà') || text.includes('chuyển trọ')) subtype = 'moving';
    else if (text.includes('sửa')) subtype = 'home_repair';
    detectedFamilies.push({ family: 'home', confidence: 0.85, subtype });
  }

  // 8. Shopping & Daily errands
  if (
    text.includes('siêu thị') ||
    text.includes('mua sắm') ||
    text.includes('đi chợ') ||
    text.includes('mua đồ') ||
    text.includes('danh sách mua') ||
    text.includes('mua thực phẩm') ||
    text.includes('gửi bưu kiện') ||
    text.includes('gửi hàng') ||
    text.includes('bưu điện')
  ) {
    let subtype = 'shopping_trip';
    if (text.includes('gửi bưu kiện') || text.includes('gửi hàng') || text.includes('bưu điện')) {
      subtype = 'parcel_delivery';
    }
    detectedFamilies.push({ family: 'shopping', confidence: 0.9, subtype });
  }

  // 9. Safety & Emergency
  if (
    text.includes('mất ví') ||
    text.includes('khóa thẻ') ||
    text.includes('mất đồ') ||
    text.includes('sự cố') ||
    text.includes('khẩn cấp') ||
    text.includes('trình báo')
  ) {
    let subtype = 'emergency';
    if (text.includes('mất ví')) subtype = 'lost_wallet';
    else if (text.includes('khóa thẻ')) subtype = 'card_blocking';
    else if (text.includes('mất đồ')) subtype = 'lost_item';
    detectedFamilies.push({ family: 'safety', confidence: 0.9, subtype });
  }

  // 10. Planning / Task overload
  if (
    text.includes('quá nhiều việc') ||
    text.includes('sắp xếp công việc') ||
    text.includes('không biết bắt đầu từ đâu') ||
    text.includes('lập kế hoạch') ||
    text.includes('lên lịch')
  ) {
    detectedFamilies.push({ family: 'planning', confidence: 0.85, subtype: 'organize_tasks' });
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
