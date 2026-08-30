import React, { useState } from 'react';
import {
  User,
  HeartPulse,
  PhoneCall,
  Sparkles,
  Edit3,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  MessageSquareText,
  Clock,
  Briefcase,
  Activity,
  Plus,
  Phone,
  AlertOctagon,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { buildAddressing } from '../../utils/filterRelevantConditions';
import { storageService } from '../../services/storageService';
import { AuthUserCard } from '../auth/AuthUserCard';
import { CloudSyncCard } from '../auth/CloudSyncCard';
import { EmergencyContactsEditor } from '../sos/EmergencyContactsEditor';

interface ProfilePageProps {
  userProfile: UserProfile | null;
  onOpenProfileSetup: () => void;
  onUpdateUserProfile: (profile: UserProfile | null) => void;
  onOpenAuthModal?: () => void;
  onShowToast?: (msg: string) => void;
  onTriggerSOS?: () => void;
  completedTasksCount?: number;
  totalSessionsCount?: number;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  onOpenProfileSetup,
  onUpdateUserProfile,
  onOpenAuthModal = () => {},
  onShowToast,
  onTriggerSOS,
  completedTasksCount = 12,
  totalSessionsCount = 5,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const addressing = buildAddressing(userProfile) || (userProfile?.preferredName ? userProfile.preferredName : 'Bạn');

  const handleToggleHealthSync = () => {
    if (!userProfile) return;
    const updated: UserProfile = {
      ...userProfile,
      syncHealthToCloud: !userProfile.syncHealthToCloud,
      updatedAt: new Date().toISOString(),
    };
    storageService.saveUserProfile(updated);
    onUpdateUserProfile(updated);
  };

  const handleClearProfile = () => {
    storageService.clearUserProfile();
    onUpdateUserProfile(null);
    setShowClearConfirm(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-lovira-badge-purple border border-lovira-purple/30 shadow-lovira relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-lovira-purple/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar Circle */}
            <div className="w-[72px] h-[72px] rounded-full bg-lovira-purple text-white font-[800] text-[32px] flex items-center justify-center shrink-0 shadow-lovira border-2 border-white dark:border-gray-800">
              {userProfile?.preferredName ? userProfile.preferredName.charAt(0).toUpperCase() : '👵'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[22px] sm:text-[26px] font-[800] text-lovira-title leading-tight">
                  {userProfile?.preferredName ? userProfile.preferredName : 'Hồ sơ cá nhân'}
                </h2>
                <span className="px-3 py-0.5 rounded-full text-[12px] font-[700] bg-lovira-purple text-white">
                  {addressing}
                </span>
              </div>
              <p className="text-[13px] font-[500] text-lovira-muted">
                {userProfile
                  ? 'Đã kết nối với trợ lý AI Lovira · Được tùy chỉnh cá nhân hóa'
                  : 'Chưa thiết lập tên gọi · Hãy bổ sung thông tin để Lovira hỗ trợ tốt nhất'}
              </p>
            </div>
          </div>

          {/* Action Edit Button */}
          <button
            onClick={onOpenProfileSetup}
            className="px-5 py-2.5 rounded-[14px] bg-lovira-purple text-white hover:opacity-90 font-[700] text-[13px] transition-all flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
          >
            <Edit3 className="w-[16px] h-[16px]" />
            <span>{userProfile ? 'Chỉnh sửa hồ sơ' : 'Thiết lập hồ sơ ngay'}</span>
          </button>
        </div>
      </div>

      {/* Activity Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-[20px] bg-lovira-card border border-lovira shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-lovira-purple font-[700] text-[12px]">
            <Activity className="w-[15px] h-[15px]" />
            <span>Phiên hỗ trợ</span>
          </div>
          <p className="text-[22px] font-[800] text-lovira-title">{totalSessionsCount} phiên</p>
          <span className="text-[11px] font-[500] text-lovira-sub">Lưu trữ trên thiết bị</span>
        </div>

        <div className="p-4 rounded-[20px] bg-lovira-card border border-lovira shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-[#188B68] dark:text-[#34D399] font-[700] text-[12px]">
            <CheckCircle2 className="w-[15px] h-[15px]" />
            <span>Việc đã xong</span>
          </div>
          <p className="text-[22px] font-[800] text-lovira-title">{completedTasksCount} công việc</p>
          <span className="text-[11px] font-[500] text-lovira-sub">Đã được đối chiếu</span>
        </div>

        <div className="p-4 rounded-[20px] bg-lovira-card border border-lovira shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-[700] text-[12px]">
            <Sparkles className="w-[15px] h-[15px]" />
            <span>Trợ lý Lovira</span>
          </div>
          <p className="text-[22px] font-[800] text-lovira-title">Sẵn sàng 24/7</p>
          <span className="text-[11px] font-[500] text-lovira-sub">Giọng nói tiếng Việt</span>
        </div>
      </div>

      {/* SECTION 1: Personal Details */}
      <div className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-lovira-subtle pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-lovira-badge-purple text-lovira-purple flex items-center justify-center font-[700]">
              <User className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="text-[16px] font-[800] text-lovira-title">Xưng hô & Phong cách giao tiếp</h3>
              <p className="text-[12px] font-[500] text-lovira-muted">Lovira điều chỉnh câu trả lời theo mong muốn của bạn</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-[16px] bg-lovira-input border border-lovira space-y-1">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">Tên gọi / Biệt danh</span>
            <p className="text-[15px] font-[700] text-lovira-title">
              {userProfile?.preferredName || 'Chưa thiết lập'}
            </p>
          </div>

          <div className="p-4 rounded-[16px] bg-lovira-input border border-lovira space-y-1">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">Danh xưng mong muốn</span>
            <p className="text-[15px] font-[700] text-lovira-title">
              {addressing}
            </p>
          </div>

          <div className="p-4 rounded-[16px] bg-lovira-input border border-lovira space-y-1 col-span-1 sm:col-span-2">
            <span className="text-[11px] font-[700] uppercase tracking-wider text-lovira-sub">Tốc độ & Độ chi tiết phản hồi</span>
            <p className="text-[14px] font-[700] text-lovira-title flex items-center gap-2">
              <MessageSquareText className="w-[16px] h-[16px] text-lovira-purple" />
              <span>
                {userProfile?.communicationPace === 'slow_detailed'
                  ? '🌱 Dễ hiểu, giải thích chi tiết từng bước (Phù hợp cho người cao tuổi)'
                  : '⚡ Ngắn gọn, súc tích và đi thẳng vào vấn đề'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Caregiver & Emergency Contacts */}
      <div className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-lovira-subtle pb-3.5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-[700]">
              <PhoneCall className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="text-[16px] font-[800] text-lovira-title">Liên hệ khẩn cấp & Cứu hộ SOS</h3>
              <p className="text-[12px] font-[500] text-lovira-muted">Gửi tọa độ GPS và tin nhắn kêu cứu khi người dùng bấm SOS</p>
            </div>
          </div>

          {onTriggerSOS && (
            <button
              type="button"
              onClick={onTriggerSOS}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer transition-all active:scale-95"
            >
              <AlertOctagon className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Mở bảng SOS ngay</span>
            </button>
          )}
        </div>

        {/* Embedded Emergency Contacts Editor */}
        <EmergencyContactsEditor
          userProfile={userProfile}
          onUpdateProfile={(updated) => onUpdateUserProfile(updated)}
        />
      </div>

      {/* SECTION 3: Health Conditions & Preferences */}
      <div className="p-6 rounded-[22px] bg-lovira-card border border-lovira shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-lovira-subtle pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-[36px] h-[36px] rounded-[12px] bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-[700]">
              <HeartPulse className="w-[18px] h-[18px]" />
            </div>
            <div>
              <h3 className="text-[16px] font-[800] text-lovira-title">Tình trạng sức khỏe & Lưu ý đặc biệt</h3>
              <p className="text-[12px] font-[500] text-lovira-muted">Món kiêng, dị ứng, tiền sử bệnh tự khai báo</p>
            </div>
          </div>
        </div>

        {userProfile?.selfReportedConditions && userProfile.selfReportedConditions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {userProfile.selfReportedConditions.map((cond, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-[12px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-[700] text-[13px] flex items-center gap-1.5"
              >
                <HeartPulse className="w-[14px] h-[14px]" />
                <span>{cond}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-[16px] bg-lovira-input border border-dashed border-lovira text-center space-y-2">
            <p className="text-[13px] font-[500] text-lovira-muted">
              Chưa khai báo dị ứng hay tình trạng sức khỏe nào.
            </p>
            <button
              onClick={onOpenProfileSetup}
              className="px-4 py-1.5 rounded-[12px] bg-lovira-badge-purple text-lovira-purple font-[700] text-[12px] hover:bg-lovira-purple hover:text-white transition-colors cursor-pointer"
            >
              + Khai báo thêm
            </button>
          </div>
        )}
      </div>

      {/* SECTION 4: Account & Cloud Sync */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-[18px] h-[18px] text-[#287C78] dark:text-[#42A39E]" />
          <h3 className="text-[16px] font-[800] text-lovira-title">
            Tài khoản & Đồng bộ Đám mây
          </h3>
        </div>

        {/* 1. User Auth Status Card */}
        <AuthUserCard
          onOpenAuthModal={onOpenAuthModal}
          onShowToast={onShowToast}
        />

        {/* 2. Cloud Sync Management Card */}
        <CloudSyncCard
          userProfile={userProfile}
          onUpdateUserProfile={(p) => {
            storageService.saveUserProfile(p);
            onUpdateUserProfile(p);
          }}
          onOpenAuthModal={onOpenAuthModal}
          onShowToast={onShowToast}
        />

        {/* 3. Local Data Management & Clear Profile Option */}
        {userProfile && (
          <div className="p-5 rounded-[20px] bg-lovira-card border border-lovira-border space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-[12px] font-[500] text-lovira-muted">
                Xóa thông tin cá nhân sẽ không làm mất danh sách các phiên trò chuyện và ghi chú hiện có trên máy.
              </span>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 rounded-[12px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[12px] font-[700] border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Trash2 className="w-[14px] h-[14px]" />
                <span>Xóa hồ sơ cá nhân</span>
              </button>
            </div>

            {/* Clear Confirmation Box */}
            {showClearConfirm && (
              <div className="p-4 rounded-[16px] bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-[700] text-[14px]">
                  <AlertCircle className="w-[18px] h-[18px]" />
                  <span>Xác nhận xóa hồ sơ cá nhân?</span>
                </div>
                <p className="text-[13px] font-[500] text-lovira-title">
                  Thao tác này sẽ dọn dẹp cách xưng hô và thông tin trợ năng đã lưu trên thiết bị.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3.5 py-1.5 rounded-[10px] border border-lovira text-[12px] font-[600] text-lovira-muted hover:text-lovira-title cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleClearProfile}
                    className="px-4 py-1.5 rounded-[10px] bg-rose-600 text-white text-[12px] font-[700] hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Xóa ngay
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
