export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string; // vd: 'Con cái', 'Người chăm sóc', 'Bác sĩ', 'Hàng xóm', 'Người thân'
  isPrimary?: boolean;
}

export interface SOSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // mét
  address?: string;
  cityName?: string;
  timestamp: string;
  mapUrl: string;
}

export interface SOSAlertLog {
  id: string;
  timestamp: string;
  location: SOSLocation | null;
  message: string;
  contactsNotified: {
    name: string;
    phone: string;
    action: 'sms' | 'call' | 'share';
  }[];
  status: 'sent' | 'cancelled' | 'pending';
  notes?: string;
}

export const NATIONAL_EMERGENCY_SERVICES: EmergencyContact[] = [
  {
    id: 'national-115',
    name: 'Cấp cứu Y tế',
    phone: '115',
    relationship: 'Khẩn cấp Quốc gia (24/7)',
    isPrimary: false,
  },
  {
    id: 'national-114',
    name: 'Cứu nạn / Cứu hỏa',
    phone: '114',
    relationship: 'Khẩn cấp Quốc gia (24/7)',
    isPrimary: false,
  },
  {
    id: 'national-113',
    name: 'Cảnh sát Phản ứng nhanh',
    phone: '113',
    relationship: 'Khẩn cấp Quốc gia (24/7)',
    isPrimary: false,
  },
];
