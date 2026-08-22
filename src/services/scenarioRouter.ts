import { ScenarioFamily, LifeModule } from '../types';
import { SCENARIO_REGISTRY } from './scenarioRegistry';

export interface ScenarioRoutingResult {
  family: ScenarioFamily;
  subtype?: string;
  confidence: number;
  modules: LifeModule[];
  suggestedTemplate?: string;
  requiresCustomPlan: boolean;
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

    return {
      family: 'healthcare',
      subtype,
      confidence: 0.95,
      modules: SCENARIO_REGISTRY.healthcare.defaultModules,
      suggestedTemplate: 'healthcare_standard',
      requiresCustomPlan: false,
    };
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

    return {
      family: 'administrative',
      subtype,
      confidence: 0.9,
      modules: SCENARIO_REGISTRY.administrative.defaultModules,
      suggestedTemplate: 'administrative_standard',
      requiresCustomPlan: false,
    };
  }

  // 3. Shopping
  if (
    text.includes('siêu thị') ||
    text.includes('mua sắm') ||
    text.includes('đi chợ') ||
    text.includes('mua đồ') ||
    text.includes('danh sách mua') ||
    text.includes('mua thực phẩm')
  ) {
    return {
      family: 'shopping',
      confidence: 0.9,
      modules: SCENARIO_REGISTRY.shopping.defaultModules,
      suggestedTemplate: 'shopping_standard',
      requiresCustomPlan: false,
    };
  }

  // 4. Technology & Warranty
  if (
    text.includes('laptop') ||
    text.includes('bảo hành') ||
    text.includes('sửa điện thoại') ||
    text.includes('sửa máy tính') ||
    text.includes('thiết bị') ||
    text.includes('cài ứng dụng') ||
    text.includes('wifi')
  ) {
    return {
      family: 'technology',
      confidence: 0.85,
      modules: SCENARIO_REGISTRY.technology.defaultModules,
      requiresCustomPlan: true,
    };
  }

  // 5. Travel & Trips
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
    return {
      family: 'travel',
      confidence: 0.85,
      modules: SCENARIO_REGISTRY.travel.defaultModules,
      requiresCustomPlan: true,
    };
  }

  // 6. Home & Moving / Repairs
  if (
    text.includes('chuyển nhà') ||
    text.includes('sửa điều hòa') ||
    text.includes('sửa nhà') ||
    text.includes('dọn dẹp') ||
    text.includes('sửa điện')
  ) {
    return {
      family: 'home',
      confidence: 0.85,
      modules: SCENARIO_REGISTRY.home.defaultModules,
      requiresCustomPlan: true,
    };
  }

  // 7. Work & Interview
  if (
    text.includes('phỏng vấn') ||
    text.includes('xin việc') ||
    text.includes('tìm việc') ||
    text.includes('đi làm') ||
    text.includes('cuộc họp') ||
    text.includes('nộp cv')
  ) {
    return {
      family: 'work',
      confidence: 0.85,
      modules: SCENARIO_REGISTRY.work.defaultModules,
      requiresCustomPlan: true,
    };
  }

  // 8. Safety & Lost Wallet
  if (
    text.includes('mất ví') ||
    text.includes('khóa thẻ') ||
    text.includes('mất đồ') ||
    text.includes('sự cố') ||
    text.includes('khẩn cấp')
  ) {
    return {
      family: 'safety',
      confidence: 0.9,
      modules: SCENARIO_REGISTRY.safety.defaultModules,
      requiresCustomPlan: true,
    };
  }

  // 9. Finance & Banking
  if (
    text.includes('ngân hàng') ||
    text.includes('làm thẻ') ||
    text.includes('mở tài khoản') ||
    text.includes('chuyển khoản')
  ) {
    return {
      family: 'finance',
      confidence: 0.85,
      modules: SCENARIO_REGISTRY.finance.defaultModules,
      requiresCustomPlan: true,
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
