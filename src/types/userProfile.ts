export type AccessibilityContextType =
  | "low_vision"
  | "hearing_impaired"
  | "cognitive_support"
  | "mobility_limited"
  | "elderly"
  | "unfamiliar_with_tech";

export type PronounStyle = "anh" | "chi" | "ong" | "ba" | "ban" | "chu" | "bac" | "custom";

export type CommunicationPace = "normal" | "slow_detailed";

export type SubscriptionTier = 'free' | 'family' | 'pro' | 'plus';

export interface UserProfile {
  preferredName?: string;
  pronounStyle?: PronounStyle;
  customPronoun?: string; // dùng khi pronounStyle === "custom"

  accessibilityContext?: AccessibilityContextType[];

  livesAlone?: boolean;
  hasCaregiverContact?: boolean;
  caregiverName?: string;
  caregiverPhone?: string;

  // CHỈ chứa nội dung người dùng tự nhập, lưu nguyên văn, không suy diễn
  selfReportedConditions: string[];

  communicationPace: CommunicationPace;

  // Toggle riêng cho việc đồng bộ thông tin cá nhân & sức khỏe lên đám mây (mặc định TẮT)
  syncHealthToCloud?: boolean;

  // Gói tài khoản và quyền lợi người dùng
  subscriptionTier?: SubscriptionTier;
  planName?: string;

  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_USER_PROFILE: Omit<UserProfile, "createdAt" | "updatedAt"> = {
  selfReportedConditions: [],
  communicationPace: "normal",
  syncHealthToCloud: false,
  subscriptionTier: "free",
  planName: "Gói Miễn phí",
};

export function getUserPlanName(profile?: UserProfile | null): string {
  if (profile?.planName?.trim()) return profile.planName.trim();
  if (profile?.subscriptionTier === 'pro') return 'Gói AI Pro';
  if (profile?.subscriptionTier === 'family') return 'Gói Gia đình';
  if (profile?.subscriptionTier === 'plus') return 'Gói Cao cấp';
  return 'Gói Miễn phí';
}

export function getUserDisplayName(profile?: UserProfile | null, fallback = 'Bạn'): string {
  if (profile?.preferredName?.trim()) {
    return profile.preferredName.trim();
  }
  return fallback;
}
