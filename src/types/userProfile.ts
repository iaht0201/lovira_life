export type AccessibilityContextType =
  | "low_vision"
  | "hearing_impaired"
  | "cognitive_support"
  | "mobility_limited"
  | "elderly"
  | "unfamiliar_with_tech";

export type PronounStyle = "anh" | "chi" | "ong" | "ba" | "ban" | "custom";

export type CommunicationPace = "normal" | "slow_detailed";

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

  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_USER_PROFILE: Omit<UserProfile, "createdAt" | "updatedAt"> = {
  selfReportedConditions: [],
  communicationPace: "normal",
  syncHealthToCloud: false,
};
