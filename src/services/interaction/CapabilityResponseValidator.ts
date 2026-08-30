import { AgentAction, LifeSession, UserProfile } from '../../types.js';
import { AppAction } from './appActionTypes.js';
import { deduceHonorifics, HonorificContext, buildPartialSuccessReply } from '../conversationStyle.js';

export interface GroundingInput {
  rawReply: string;
  rawSpeech?: string;
  suggestedReplies?: string[];
  appliedSessionActions: AgentAction[];
  rejectedSessionActions: { action: AgentAction; reason: string }[];
  executedAppActions: AppAction[];
  pendingAppActions?: AppAction[];
  rejectedAppActions: { action: AppAction; reason: string }[];
  session?: LifeSession | null;
  userProfile?: UserProfile | null;
  userInput: string;
}

export interface GroundingResult {
  finalReply: string;
  finalSpeech: string;
  finalSuggestedReplies: string[];
  wasModified: boolean;
  groundingNotes: string[];
}

/**
 * Patterns of prose hallucination where the LLM falsely claims to perform
 * actions outside Lovira's capability boundaries (e.g. opening maps, making phone calls, booking).
 */
const PROSE_HALLUCINATION_PATTERNS = [
  {
    category: 'hotel_search_claim',
    regex: /\b(có\s+thể|giúp|sẽ|đang|đã)\s+.*(tìm|tra\s*cứu|đặt|chọn)\s+.*(khách\s*sạn|nhà\s*nghỉ|homestay|resort|phòng\s*trọ)\b/i,
    replacementMsg: (h: HonorificContext) =>
      `Dạ ${h.addressing}, ứng dụng Lovira chưa hỗ trợ tìm kiếm hay đặt phòng khách sạn ạ. ${h.me.charAt(0).toUpperCase() + h.me.slice(1)} có thể hỗ trợ ${h.addressing} lập danh sách các việc cần chuẩn bị và hẹn giờ nhắc nhở nhé${h.a}!`,
  },
  {
    category: 'map_gps',
    regex: /\b(đang|đã|sẽ|vừa|có\s+thể)\s+(mở|bật|tải|chạy|xem|định\s*vị|chỉ\s*đường|tìm)\s+.*(bản\s*đồ|google\s*maps?|gps|định\s*vị|chỉ\s*đường|tọa\s*độ)\b/i,
    replacementMsg: (h: HonorificContext) =>
      `Dạ ${h.addressing}, ứng dụng Lovira chưa tích hợp bản đồ hoặc định vị trực tiếp ạ. ${h.me.charAt(0).toUpperCase() + h.me.slice(1)} có thể giúp ${h.addressing} chuẩn bị các việc cần làm và tạo nhắc nhở nhé${h.a}!`,
  },
  {
    category: 'address_search_claim',
    regex: /\b(có\s+thể|sẽ|đang|đã)\s+.*(tìm|tra\s*cứu|dẫn|chỉ)\s+.*(địa\s*chỉ|vị\s*trí)\b/i,
    replacementMsg: (h: HonorificContext) =>
      `Dạ ${h.addressing}, Lovira chưa hỗ trợ tra cứu địa chỉ hoặc định vị trực tiếp ạ. ${h.me.charAt(0).toUpperCase() + h.me.slice(1)} có thể hỗ trợ ${h.addressing} theo dõi danh sách các bước công việc nhé${h.a}!`,
  },
  {
    category: 'map_gps_open',
    regex: /\bcon\s+(đang|đã|có\s+thể)\s+mở\s+bản\s*đồ\b/i,
    replacementMsg: (h: HonorificContext) =>
      `Dạ ${h.addressing}, Lovira chưa hỗ trợ mở bản đồ trực tiếp ạ. ${h.me.charAt(0).toUpperCase() + h.me.slice(1)} có thể gợi ý các việc cần chuẩn bị cho ${h.addressing} nhé${h.a}!`,
  },
  {
    category: 'phone_sms',
    regex: /\b(đang|đã|sẽ|vừa)\s+(gọi\s+điện|gọi\s+cho|bấm\s+số|gửi\s+tin\s*nhắn|gửi\s*sms|gửi\s*email)\b/i,
    replacementMsg: (h: HonorificContext) =>
      `Dạ ${h.addressing}, Lovira chưa thể tự động gọi điện hoặc gửi tin nhắn ngoài thiết bị, ${h.addressing} hãy chủ động liên hệ trực tiếp giúp ${h.me} nhé${h.a}!`,
  },
  {
    category: 'booking_ride',
    regex: /\b(đang|đã|sẽ|vừa)\s+(đặt\s+xe|gọi\s+xe|đặt\s+grab|đặt\s+be|đặt\s+bàn|thanh\s+toán\s+hộ|đặt\s+phòng)\b/i,
    replacementMsg: (h: HonorificContext) =>
      `Dạ ${h.addressing}, Lovira chưa thể đặt xe, đặt phòng hay thanh toán trực tiếp thay ${h.addressing}, nhưng ${h.me} đã sẵn sàng giúp ${h.addressing} lên danh sách chuẩn bị rồi ạ!`,
  },
  {
    category: 'realtime_store_search',
    regex: /\b(đang\s+tìm\s+kiếm|đã\s+tìm\s+thấy)\s+danh\s+sách\s+(quán|tiệm|cửa\s*hàng|quầy|khách\s*sạn)\s+thời\s+gian\s+thực\s+trên\s+bản\s*đồ\b/i,
    replacementMsg: (h: HonorificContext) =>
      `Dạ ${h.addressing}, ${h.me} có một số gợi ý chuẩn bị phù hợp, ${h.addressing} xem qua nhé!`,
  },
];

/**
 * Banned keywords in suggested replies (pills/buttons)
 */
const BANNED_SUGGESTED_REPLY_PATTERNS = [
  /\bbản\s*đồ\b/i,
  /\bmaps?\b/i,
  /\bđịnh\s*vị\b/i,
  /\bkhách\s*sạn\b/i,
  /\bđịa\s*chỉ\b/i,
  /\bchỉ\s+đường\b/i,
  /\bgọi\s+xe\b/i,
  /\bđặt\s+xe\b/i,
  /\bđặt\s+grab\b/i,
  /\bđặt\s+phòng\b/i,
  /\bgọi\s+điện\b/i,
];

/**
 * Strips markdown and special symbols for natural TTS speech output
 */
import { prepareTTSReadableText } from '../ttsService.js';

export function stripForSpeech(text: string): string {
  if (!text) return '';
  return prepareTTSReadableText(text);
}

/**
 * Primary validator and response grounding engine.
 * Ensures the response shown and spoken to the user strictly reflects reality,
 * executable capabilities, and validated state mutations.
 */
export function validateAndGroundAIResponse(input: GroundingInput): GroundingResult {
  const {
    rawReply,
    rawSpeech,
    suggestedReplies,
    appliedSessionActions,
    rejectedSessionActions,
    executedAppActions,
    pendingAppActions = [],
    rejectedAppActions,
    userProfile,
    userInput,
  } = input;

  const honorifics = deduceHonorifics(userProfile, userInput);
  const groundingNotes: string[] = [];
  let finalReply = rawReply ? rawReply.trim() : '';
  let wasModified = false;

  // 1. Intercept Prose Hallucinations (Maps, GPS, Calling, Booking)
  for (const pattern of PROSE_HALLUCINATION_PATTERNS) {
    if (pattern.regex.test(finalReply)) {
      groundingNotes.push(`Prose hallucination intercepted: ${pattern.category}`);
      finalReply = pattern.replacementMsg(honorifics);
      wasModified = true;
      break;
    }
  }

  // 2. State & Session Action Consistency
  // If some session actions were rejected in a partial batch, ground the reply text
  if (rejectedSessionActions.length > 0) {
    if (appliedSessionActions.length > 0) {
      finalReply = buildPartialSuccessReply(
        appliedSessionActions,
        rejectedSessionActions,
        finalReply,
        honorifics
      );
      groundingNotes.push('Reply adjusted for partial session action batch success');
      wasModified = true;
    } else {
      // All session actions failed
      const firstReason = rejectedSessionActions[0].reason;
      finalReply = `Dạ ${honorifics.addressing}, ${honorifics.me} chưa thể cập nhật do ${firstReason}. ${honorifics.addressing.charAt(0).toUpperCase() + honorifics.addressing.slice(1)} kiểm tra lại giúp ${honorifics.me} nhé${honorifics.a}!`;
      groundingNotes.push('Reply adjusted for all rejected session actions');
      wasModified = true;
    }
  }

  // 3. App Action Rejection & Pending Confirmation Grounding
  if (pendingAppActions.length > 0) {
    const pendingAct = pendingAppActions[0];
    const prompt = (pendingAct as any).confirmationPrompt || `Dạ ${honorifics.addressing}, ${honorifics.addressing} có chắc chắn muốn thực hiện thao tác này không ạ?`;
    // If reply falsely claims action was already executed or doesn't ask confirmation
    const claimsCompleted = /\b(đã|vừa)\s+(xóa|hủy|sửa|cập nhật|hoàn thành)\b/i.test(finalReply);
    const lacksQuestion = !finalReply.includes('?') && !finalReply.toLowerCase().includes('chắc');

    if (claimsCompleted || lacksQuestion) {
      finalReply = prompt;
      groundingNotes.push(`Reply grounded for pending confirmation action: ${pendingAct.type}`);
      wasModified = true;
    }
  } else if (rejectedAppActions.length > 0 && executedAppActions.length === 0) {
    const firstAppReject = rejectedAppActions[0];
    if (firstAppReject.reason) {
      finalReply = `Dạ ${honorifics.addressing}, ${firstAppReject.reason}`;
      groundingNotes.push(`Reply adjusted for rejected app action: ${firstAppReject.action.type}`);
      wasModified = true;
    }
  }

  // 4. Ground Suggested Replies
  let finalSuggestedReplies = suggestedReplies || [];
  if (finalSuggestedReplies.length > 0) {
    finalSuggestedReplies = finalSuggestedReplies.filter((suggestion) => {
      for (const banned of BANNED_SUGGESTED_REPLY_PATTERNS) {
        if (banned.test(suggestion)) {
          groundingNotes.push(`Sanitized suggested reply: "${suggestion}"`);
          return false;
        }
      }
      return true;
    });
  }

  // If no suggestions left or none provided, supply safe context-driven ones
  if (finalSuggestedReplies.length === 0) {
    finalSuggestedReplies = ['Xong rồi', 'Giờ tôi cần làm gì tiếp?', 'Cần trợ giúp bước này'];
  }

  // 5. Ground Speech: If reply contains lists or numbered steps, speak the full formatted content
  let finalSpeech: string;
  const hasListContent = /[\n●•▪▫*+\-–—👉✓✔]/.test(finalReply) && finalReply.split('\n').length > 1;

  if (wasModified || hasListContent || !rawSpeech || !rawSpeech.trim()) {
    finalSpeech = stripForSpeech(finalReply);
  } else {
    // Also verify rawSpeech does not contain hallucinated patterns
    let speechCandidate = rawSpeech;
    let speechHadHallucination = false;
    for (const pattern of PROSE_HALLUCINATION_PATTERNS) {
      if (pattern.regex.test(speechCandidate)) {
        speechHadHallucination = true;
        break;
      }
    }
    if (speechHadHallucination) {
      finalSpeech = stripForSpeech(finalReply);
      wasModified = true;
    } else {
      finalSpeech = stripForSpeech(speechCandidate);
    }
  }

  return {
    finalReply,
    finalSpeech,
    finalSuggestedReplies,
    wasModified,
    groundingNotes,
  };
}
