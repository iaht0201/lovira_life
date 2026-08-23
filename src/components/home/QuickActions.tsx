import React from 'react';
import { Plus, CheckSquare, Bell, MessageSquare } from 'lucide-react';
import { QuickActionCard } from './QuickActionCard';

interface QuickActionsProps {
  onCreateSession: () => void;
  onOpenTasks: () => void;
  onOpenReminders: () => void;
  onOpenChat: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCreateSession,
  onOpenTasks,
  onOpenReminders,
  onOpenChat,
}) => {
  const actions = [
    {
      id: 'create_session' as const,
      title: 'Tạo phiên mới',
      description: 'Bắt đầu với một mục tiêu mới',
      icon: Plus,
      accent: 'purple' as const,
      onClick: onCreateSession,
    },
    {
      id: 'tasks' as const,
      title: 'Việc cần làm',
      description: 'Xem danh sách việc của chú',
      icon: CheckSquare,
      accent: 'purple' as const,
      onClick: onOpenTasks,
    },
    {
      id: 'reminders' as const,
      title: 'Nhắc nhở',
      description: 'Quản lý các nhắc nhở',
      icon: Bell,
      accent: 'orange' as const,
      onClick: onOpenReminders,
    },
    {
      id: 'chat' as const,
      title: 'Trò chuyện',
      description: 'Nói chuyện với Lovira',
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
