import React from 'react';
import { Plus, Camera, Bell, MessageSquare } from 'lucide-react';
import { QuickActionCard } from './QuickActionCard';

interface QuickActionsProps {
  onCreateSession: () => void;
  onOpenCamera?: () => void;
  onOpenTasks?: () => void;
  onOpenReminders: () => void;
  onOpenChat: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCreateSession,
  onOpenCamera,
  onOpenTasks,
  onOpenReminders,
  onOpenChat,
}) => {
  const handleCameraClick = onOpenCamera || onOpenTasks || (() => {});

  const actions = [
    {
      id: 'create_session' as const,
      title: 'Lovira giúp việc gì?',
      description: 'Hãy nói việc bạn sắp làm, Lovira sẽ đề xuất cách hỗ trợ.',
      icon: Plus,
      accent: 'purple' as const,
      onClick: onCreateSession,
    },
    {
      id: 'camera' as const,
      title: 'Nhìn giúp tôi',
      description: 'Chụp ảnh để Lovira đọc và giải thích',
      icon: Camera,
      accent: 'purple' as const,
      onClick: handleCameraClick,
    },
    {
      id: 'reminders' as const,
      title: 'Nhắc nhở',
      description: 'Tạo & Quản lý các nhắc nhở chi tiết',
      icon: Bell,
      accent: 'orange' as const,
      onClick: onOpenReminders,
    },
    {
      id: 'chat' as const,
      title: 'Trò chuyện',
      description: 'Nói chuyện & Hỏi đáp cùng Lovira',
      icon: MessageSquare,
      accent: 'purple' as const,
      onClick: onOpenChat,
    },
  ];

  return (
    <section aria-label="Lối tắt thao tác nhanh">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((act) => (
          <QuickActionCard key={act.id} {...act} />
        ))}
      </div>
    </section>
  );
};
