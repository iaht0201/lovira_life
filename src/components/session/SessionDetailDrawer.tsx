import React from 'react';
import { LifeSession, SessionStatus } from '../../types';
import { SessionPlanDetailContent, SessionPlanDetailContentProps } from './SessionPlanDetailContent';

interface SessionDetailDrawerProps extends SessionPlanDetailContentProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionDetailDrawer: React.FC<SessionDetailDrawerProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container (Slide-over for mobile / smaller screens) */}
      <div className="relative z-10 w-full sm:w-[420px] h-full max-h-[100dvh] bg-white dark:bg-[#152020] border-l border-[#EAEFEF] dark:border-[#202E2E] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        <SessionPlanDetailContent onClose={onClose} {...props} />
      </div>
    </div>
  );
};
