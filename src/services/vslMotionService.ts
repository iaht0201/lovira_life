// Vietnamese Sign Language (VSL) Universal Motion & Gesture Sequencing Service

export interface VSLPose {
  leftElbow: { x: number; y: number };
  leftWrist: { x: number; y: number };
  leftHandRot: number;
  rightElbow: { x: number; y: number };
  rightWrist: { x: number; y: number };
  rightHandRot: number;
  headNod: number;
  label: string;
}

export const VSL_GESTURE_BANK: Record<string, (t: number, wave: number, nod: number) => VSLPose> = {
  chao: (t, wave, nod) => ({
    leftElbow: { x: 118, y: 235 },
    leftWrist: { x: 98, y: 305 },
    leftHandRot: 0,
    rightElbow: { x: 330, y: 195 },
    rightWrist: { x: 350 + wave * 18, y: 130 },
    rightHandRot: -12 + wave * 15,
    headNod: nod * 2.5,
    label: 'Chào bạn',
  }),

  ban: (t, wave, nod) => ({
    leftElbow: { x: 120, y: 240 },
    leftWrist: { x: 105, y: 295 },
    leftHandRot: 0,
    rightElbow: { x: 290, y: 215 },
    rightWrist: { x: 275 + Math.sin(t * 2) * 8, y: 190 },
    rightHandRot: -30,
    headNod: nod * 1.5,
    label: 'Bạn / Người đối diện',
  }),

  toi: (t, wave, nod) => ({
    leftElbow: { x: 120, y: 240 },
    leftWrist: { x: 105, y: 295 },
    leftHandRot: 0,
    rightElbow: { x: 260, y: 210 },
    rightWrist: { x: 220, y: 200 },
    rightHandRot: 40,
    headNod: nod * 1.5,
    label: 'Tôi / Lovira',
  }),

  biet_muon: (t, wave, nod) => ({
    leftElbow: { x: 130, y: 230 },
    leftWrist: { x: 140, y: 220 },
    leftHandRot: 15,
    rightElbow: { x: 295, y: 200 },
    rightWrist: { x: 250 + Math.sin(t * 2) * 10, y: 160 },
    rightHandRot: -35,
    headNod: nod * 2.0,
    label: 'Muốn biết / Tìm hiểu',
  }),

  chieu_cao_thong_tin: (t, wave, nod) => ({
    leftElbow: { x: 135, y: 210 },
    leftWrist: { x: 110, y: 180 },
    leftHandRot: 0,
    rightElbow: { x: 300, y: 175 },
    rightWrist: { x: 280, y: 120 + Math.sin(t * 2) * 15 },
    rightHandRot: 0,
    headNod: nod * 2.5,
    label: 'Chiều cao / Kích thước',
  }),

  ghi_lai: (t, wave, nod) => ({
    leftElbow: { x: 150, y: 225 },
    leftWrist: { x: 180, y: 220 },
    leftHandRot: 20,
    rightElbow: { x: 260, y: 215 },
    rightWrist: { x: 195 + Math.sin(t * 3) * 8, y: 215 },
    rightHandRot: -30,
    headNod: nod * 2.0,
    label: 'Ghi lại / Lưu thông tin',
  }),

  hoi_thac_mac: (t, wave, nod) => ({
    leftElbow: { x: 115 + wave * 4, y: 225 },
    leftWrist: { x: 90 + wave * 8, y: 205 },
    leftHandRot: -20,
    rightElbow: { x: 325 - wave * 4, y: 225 },
    rightWrist: { x: 350 - wave * 8, y: 205 },
    rightHandRot: 20,
    headNod: nod * 2.2,
    label: 'Hỏi / Có việc gì',
  }),

  cam_on: (t, wave, nod) => ({
    leftElbow: { x: 125, y: 240 },
    leftWrist: { x: 108, y: 295 },
    leftHandRot: 0,
    rightElbow: { x: 285 + Math.sin(t * 2) * 8, y: 205 },
    rightWrist: { x: 270 + Math.sin(t * 2) * 20, y: 165 + nod * 6 },
    rightHandRot: -25 + Math.sin(t * 2) * 10,
    headNod: nod * 3.5,
    label: 'Cảm ơn',
  }),

  giup: (t, wave, nod) => ({
    leftElbow: { x: 155, y: 230 },
    leftWrist: { x: 195, y: 215 },
    leftHandRot: 25,
    rightElbow: { x: 265, y: 230 },
    rightWrist: { x: 205 + Math.sin(t * 2) * 10, y: 210 - nod * 4 },
    rightHandRot: -25,
    headNod: nod * 2.0,
    label: 'Giúp đỡ / Hỗ trợ',
  }),

  uong_thuoc: (t, wave, nod) => ({
    leftElbow: { x: 135, y: 220 },
    leftWrist: { x: 175, y: 200 },
    leftHandRot: 25,
    rightElbow: { x: 300, y: 200 },
    rightWrist: { x: 255 + Math.sin(t * 2) * 12, y: 145 },
    rightHandRot: -30,
    headNod: nod * 3.2,
    label: 'Uống thuốc',
  }),

  kham_benh: (t, wave, nod) => ({
    leftElbow: { x: 145, y: 215 },
    leftWrist: { x: 185, y: 195 },
    leftHandRot: 30,
    rightElbow: { x: 275, y: 215 },
    rightWrist: { x: 235, y: 195 },
    rightHandRot: -30,
    headNod: nod * 2.0,
    label: 'Khám bệnh / Bác sĩ',
  }),

  nhac_nho: (t, wave, nod) => ({
    leftElbow: { x: 140, y: 235 },
    leftWrist: { x: 190, y: 230 },
    leftHandRot: 40,
    rightElbow: { x: 280, y: 220 },
    rightWrist: { x: 195 + Math.sin(t * 3) * 6, y: 220 },
    rightHandRot: -45,
    headNod: nod * 1.8,
    label: 'Lịch & Nhắc nhở',
  }),

  dong_y: (t, wave, nod) => ({
    leftElbow: { x: 120, y: 235 },
    leftWrist: { x: 105, y: 295 },
    leftHandRot: 0,
    rightElbow: { x: 310, y: 210 },
    rightWrist: { x: 330, y: 185 + Math.sin(t * 2) * 10 },
    rightHandRot: -10,
    headNod: nod * 3.0,
    label: 'Đồng ý / Hoàn thành',
  }),

  tam_biet: (t, wave, nod) => ({
    leftElbow: { x: 118, y: 235 },
    leftWrist: { x: 98, y: 305 },
    leftHandRot: 0,
    rightElbow: { x: 335, y: 180 },
    rightWrist: { x: 360 + Math.abs(wave) * 14, y: 115 },
    rightHandRot: 15 + wave * 18,
    headNod: nod * 2.0,
    label: 'Tạm biệt',
  }),

  dien_giai_chinh: (t, wave, nod) => ({
    leftElbow: { x: 130 + Math.sin(t * 2) * 6, y: 230 },
    leftWrist: { x: 145 + Math.sin(t * 2) * 12, y: 210 },
    leftHandRot: 20,
    rightElbow: { x: 290 - Math.sin(t * 2) * 6, y: 230 },
    rightWrist: { x: 275 - Math.sin(t * 2) * 12, y: 210 },
    rightHandRot: -20,
    headNod: nod * 2.0,
    label: 'Diễn giải nội dung',
  }),
};

export class VSLSentenceTranslator {
  /**
   * Parse any Vietnamese text response into an ordered, non-empty list of gesture keys
   */
  public static parseTextToSignGlosses(text: string): { key: string; word: string }[] {
    if (!text || !text.trim()) {
      return [
        { key: 'chao', word: 'Chào bạn' },
        { key: 'toi', word: 'Lovira' },
      ];
    }

    const clean = text.toLowerCase().trim();
    const glosses: { key: string; word: string }[] = [];

    // Comprehensive Keyword Match Rules
    const matchRules: { test: (s: string) => boolean; key: string; label: string }[] = [
      { test: (s) => /chào|hello|hi\b/i.test(s), key: 'chao', label: 'Chào bạn' },
      { test: (s) => /bạn|anh|chị|ông|bà/i.test(s), key: 'ban', label: 'Bạn' },
      { test: (s) => /muốn|biết|tìm hiểu/i.test(s), key: 'biet_muon', label: 'Muốn biết' },
      { test: (s) => /chiều cao|cân nặng|kích thước|bao nhiêu/i.test(s), key: 'chieu_cao_thong_tin', label: 'Chiều cao' },
      { test: (s) => /ghi lại|lưu|thông tin/i.test(s), key: 'ghi_lai', label: 'Ghi lại' },
      { test: (s) => /lovira|tôi|mình/i.test(s), key: 'toi', label: 'Lovira' },
      { test: (s) => /giúp|hỗ trợ|cần gì/i.test(s), key: 'giup', label: 'Giúp đỡ' },
      { test: (s) => /thuốc|uống/i.test(s), key: 'uong_thuoc', label: 'Thuốc' },
      { test: (s) => /khám|bác sĩ|bệnh|sức khỏe/i.test(s), key: 'kham_benh', label: 'Khám bệnh' },
      { test: (s) => /nhắc|lịch|hẹn|giờ/i.test(s), key: 'nhac_nho', label: 'Nhắc nhở' },
      { test: (s) => /gì|sao|hỏi|thế nào/i.test(s), key: 'hoi_thac_mac', label: 'Hỏi / Gì' },
      { test: (s) => /cảm ơn|thanks/i.test(s), key: 'cam_on', label: 'Cảm ơn' },
      { test: (s) => /tạm biệt|bye/i.test(s), key: 'tam_biet', label: 'Tạm biệt' },
      { test: (s) => /được|đồng ý|xong|tốt/i.test(s), key: 'dong_y', label: 'Đồng ý' },
    ];

    for (const rule of matchRules) {
      if (rule.test(clean)) {
        glosses.push({ key: rule.key, word: rule.label });
      }
    }

    // Always guarantee a rich sequence for long sentences
    if (glosses.length === 0) {
      glosses.push({ key: 'ban', word: 'Bạn' });
      glosses.push({ key: 'dien_giai_chinh', word: 'Diễn giải' });
      glosses.push({ key: 'toi', word: 'Lovira hỗ trợ' });
    }

    return glosses;
  }
}
