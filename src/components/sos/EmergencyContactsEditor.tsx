import React, { useState } from 'react';
import { UserProfile, EmergencyContact } from '../../types/userProfile.js';
import { Plus, Trash2, Phone, User, Check, Star, AlertTriangle } from 'lucide-react';
import { storageService } from '../../services/storageService.js';

interface EmergencyContactsEditorProps {
  userProfile?: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onClose?: () => void;
}

const RELATIONSHIP_SUGGESTIONS = [
  'Con gái',
  'Con trai',
  'Vợ / Chồng',
  'Người chăm sóc',
  'Bác sĩ gia đình',
  'Hàng xóm',
  'Anh / Chị / Em',
  'Người thân khác',
];

export const EmergencyContactsEditor: React.FC<EmergencyContactsEditorProps> = ({
  userProfile,
  onUpdateProfile,
  onClose,
}) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    if (userProfile?.emergencyContacts && userProfile.emergencyContacts.length > 0) {
      return [...userProfile.emergencyContacts];
    }
    if (userProfile?.caregiverPhone) {
      return [
        {
          id: 'primary-1',
          name: userProfile.caregiverName || 'Người thân',
          phone: userProfile.caregiverPhone,
          relationship: 'Người thân hỗ trợ',
          isPrimary: true,
        },
      ];
    }
    return [];
  });

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRelationship, setNewRelationship] = useState('Con cái');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddContact = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanName = newName.trim();
    const cleanPhone = newPhone.trim().replace(/\s+/g, '');

    if (!cleanName) {
      setErrorMsg('Vui lòng nhập tên người thân.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ (ít nhất 8 số).');
      return;
    }

    const newContact: EmergencyContact = {
      id: `contact-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      relationship: newRelationship.trim() || 'Người thân',
      isPrimary: contacts.length === 0, // Auto primary if first contact
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    saveUpdatedContacts(updated);

    setNewName('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleRemoveContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    if (updated.length > 0 && !updated.some((c) => c.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setContacts(updated);
    saveUpdatedContacts(updated);
  };

  const handleSetPrimary = (id: string) => {
    const updated = contacts.map((c) => ({
      ...c,
      isPrimary: c.id === id,
    }));
    setContacts(updated);
    saveUpdatedContacts(updated);
  };

  const saveUpdatedContacts = (updatedList: EmergencyContact[]) => {
    const primary = updatedList.find((c) => c.isPrimary) || updatedList[0];
    const updatedProfile: UserProfile = {
      ...userProfile,
      emergencyContacts: updatedList,
      hasCaregiverContact: updatedList.length > 0,
      caregiverName: primary ? primary.name : undefined,
      caregiverPhone: primary ? primary.phone : undefined,
      selfReportedConditions: userProfile?.selfReportedConditions || [],
      communicationPace: userProfile?.communicationPace || 'normal',
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveUserProfile(updatedProfile);
    onUpdateProfile(updatedProfile);
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between pb-2 border-b border-lovira-subtle">
        <div>
          <h4 className="text-base font-bold text-lovira-title flex items-center gap-2">
            <User className="w-5 h-5 text-rose-500" />
            Danh sách liên hệ khẩn cấp ({contacts.length})
          </h4>
          <p className="text-xs text-lovira-muted mt-0.5">
            Khi phát tín hiệu SOS, tọa độ và tin nhắn kêu cứu sẽ được gửi đến danh sách này.
          </p>
        </div>
      </div>

      {/* Existing Contacts List */}
      <div className="space-y-2.5">
        {contacts.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-rose-300 dark:border-rose-800 bg-rose-500/5 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              Chưa có liên hệ khẩn cấp nào được lưu!
            </p>
            <p className="text-[11px] text-lovira-muted">
              Hãy thêm ít nhất một số điện thoại của con cháu hoặc người chăm sóc để Lovira trợ giúp tốt nhất.
            </p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                contact.isPrimary
                  ? 'bg-rose-500/10 border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/50 shadow-2xs'
                  : 'bg-lovira-card border-lovira hover:border-lovira-purple'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-lovira-title truncate">
                    {contact.name}
                  </span>
                  {contact.relationship && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-lovira-input border border-lovira text-lovira-muted font-medium">
                      {contact.relationship}
                    </span>
                  )}
                  {contact.isPrimary && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold tracking-wider uppercase">
                      Chính
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-lovira-muted font-mono mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!contact.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(contact.id)}
                    className="p-1.5 rounded-lg text-xs font-semibold text-lovira-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Đặt làm liên hệ ưu tiên số 1"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveContact(contact.id)}
                  className="p-1.5 rounded-lg text-xs font-semibold text-lovira-muted hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Xóa liên hệ này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Contact Button / Form */}
      {isAdding ? (
        <form
          onSubmit={handleAddContact}
          className="p-4 rounded-xl bg-lovira-input border border-rose-300 dark:border-rose-800 space-y-3 animate-in fade-in duration-150"
        >
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            + Thêm người thân khẩn cấp mới
          </div>

          {errorMsg && (
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-lovira-title block">
                Tên người thân <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ví dụ: Con gái Lan, Anh Tuấn..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-lovira bg-lovira-card text-lovira-title text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-lovira-title block">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-3 py-2 rounded-lg border border-lovira bg-lovira-card text-lovira-title text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-lovira-title block">
              Mối quan hệ
            </label>
            <div className="flex flex-wrap gap-1.5">
              {RELATIONSHIP_SUGGESTIONS.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => setNewRelationship(rel)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    newRelationship === rel
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'bg-lovira-card border border-lovira text-lovira-muted hover:text-lovira-title'
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-lovira">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setErrorMsg('');
              }}
              className="px-3 py-1.5 rounded-lg border border-lovira text-lovira-muted hover:text-lovira-title text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu liên hệ</span>
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-rose-300 dark:border-rose-800 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm người thân khẩn cấp mới</span>
        </button>
      )}
    </div>
  );
};
