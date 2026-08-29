import fs from 'node:fs';
import path from 'node:path';

/**
 * Lovira Interaction Regression Suite
 * Run from the lovira_life repository root:
 *   npx tsx scripts/test-lovira-interactions.ts
 *
 * Outputs:
 *   logs/lovira-interaction-test.log
 *   docs/LOVIRA_INTERACTION_TEST_REPORT.md
 */

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null; }
  get length() { return this.data.size; }
}

if (!(globalThis as any).localStorage) {
  (globalThis as any).localStorage = new MemoryStorage();
}

// Browser-ish globals used by some services. Keep them intentionally minimal.
if (!(globalThis as any).navigator) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'lovira-test-runner' },
    configurable: true,
  });
}

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, 'logs');
const DOC_DIR = path.join(ROOT, 'docs');
const LOG_PATH = path.join(LOG_DIR, 'lovira-interaction-test.log');
const REPORT_PATH = path.join(DOC_DIR, 'LOVIRA_INTERACTION_TEST_REPORT.md');

fs.mkdirSync(LOG_DIR, { recursive: true });
fs.mkdirSync(DOC_DIR, { recursive: true });

type Severity = 'P0' | 'P1' | 'P2';
type TestStatus = 'PASS' | 'FAIL' | 'SKIP';

interface TestResult {
  id: string;
  category: string;
  severity: Severity;
  status: TestStatus;
  durationMs: number;
  details: string;
}

const results: TestResult[] = [];
const startedAt = new Date();

const weight: Record<Severity, number> = { P0: 5, P1: 3, P2: 1 };

function fail(message: string): never {
  throw new Error(message);
}

function expectTrue(value: unknown, message: string): asserts value {
  if (!value) fail(message);
}

function expectEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    fail(`${message} | expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

async function test(
  id: string,
  category: string,
  severity: Severity,
  fn: () => void | Promise<void>
) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ id, category, severity, status: 'PASS', durationMs: Date.now() - t0, details: 'OK' });
  } catch (err: any) {
    results.push({
      id,
      category,
      severity,
      status: 'FAIL',
      durationMs: Date.now() - t0,
      details: err?.message || String(err),
    });
  }
}

async function skip(id: string, category: string, severity: Severity, details: string) {
  results.push({ id, category, severity, status: 'SKIP', durationMs: 0, details });
}

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function source(file: string) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function makePending(actionType: string, payload: any, question = 'Cần làm gì tiếp?') {
  return {
    type: 'clarification' as const,
    data: { actionType, payload, question },
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 180000,
  };
}

async function main() {
  console.log('Lovira interaction regression suite');
  console.log(`Started: ${startedAt.toISOString()}`);

  const {
    classifyLocalBrain,
  } = await import('../src/services/localBrain/LocalBrainClassifier.js');

  const {
    executeLocalBrain,
  } = await import('../src/services/localBrain/LocalBrainEngine.js');

  const {
    routeFastIntent,
  } = await import('../src/services/interaction/FastIntentRouter.js');

  const {
    resolvePendingInteraction,
    isNegativeResponse,
    isAffirmativeResponse,
  } = await import('../src/services/interaction/pendingInteractionResolver.js');

  const {
    validateAppAction,
  } = await import('../src/services/interaction/appActionValidator.js');

  const {
    reminderService,
  } = await import('../src/services/reminderService.js');

  const {
    storageService,
  } = await import('../src/services/storageService.js');

  const dateTime = await import('../src/utils/dateTimeResolver.js');

  // ---------------------------------------------------------------------------
  // 1) INTENT CLASSIFICATION — natural Vietnamese + common speech variants
  // ---------------------------------------------------------------------------
  const intentGroups: Array<{ intent: string; severity: Severity; samples: string[] }> = [
    { intent: 'social.greeting', severity: 'P2', samples: [
      'Xin chào', 'Chào con', 'Chào Lovira', 'Lovira ơi', 'Alo Lovira', 'Chào buổi sáng', 'Chào buổi tối',
    ]},
    { intent: 'social.thanks', severity: 'P2', samples: [
      'Cảm ơn con', 'Cảm ơn Lovira', 'Cảm ơn nhiều nhé', 'Cám ơn nha',
    ]},
    { intent: 'social.goodbye', severity: 'P2', samples: [
      'Tạm biệt', 'Tạm biệt con nhé', 'Chào con nha',
    ]},
    { intent: 'social.capabilities', severity: 'P2', samples: [
      'Con làm được gì', 'Lovira giúp được gì', 'Con có thể giúp chú việc gì', 'Ứng dụng này làm được gì',
    ]},
    { intent: 'social.identity', severity: 'P2', samples: [
      'Con là ai', 'Lovira là ai', 'Bạn là ai',
    ]},
    { intent: 'nav.home', severity: 'P1', samples: [
      'Về trang chủ', 'Mở trang chủ', 'Về màn hình chính', 'Cho chú về nhà',
    ]},
    { intent: 'nav.back', severity: 'P1', samples: [
      'Quay lại', 'Trở lại', 'Lùi lại',
    ]},
    { intent: 'nav.camera', severity: 'P1', samples: [
      'Mở camera', 'Chụp ảnh', 'Chụp hình', 'Mở ca mê ra cho tui', 'Bật máy ảnh',
    ]},
    { intent: 'nav.settings', severity: 'P1', samples: [
      'Mở cài đặt', 'Vào cài đặt', 'Cho chú xem cài đặt',
    ]},
    { intent: 'nav.profile', severity: 'P1', samples: [
      'Mở hồ sơ', 'Mở trang cá nhân', 'Xem thông tin của chú',
    ]},
    { intent: 'nav.reminders', severity: 'P1', samples: [
      'Mở nhắc nhở', 'Xem lịch nhắc', 'Cho chú xem các nhắc nhở',
    ]},
    { intent: 'utility.current_time', severity: 'P1', samples: [
      'Mấy giờ rồi', 'Bây giờ mấy giờ', 'Giờ là mấy giờ', 'Hiện tại mấy giờ',
    ]},
    { intent: 'utility.current_date', severity: 'P1', samples: [
      'Hôm nay ngày mấy', 'Hôm nay là ngày bao nhiêu', 'Ngày hôm nay là ngày mấy',
    ]},
    { intent: 'utility.day_of_week', severity: 'P1', samples: [
      'Hôm nay thứ mấy', 'Nay thứ mấy', 'Bữa ni thứ mấy',
    ]},
    { intent: 'utility.today_schedule', severity: 'P1', samples: [
      'Hôm nay có lịch gì', 'Hôm nay chú có việc gì', 'Bữa ni tui có lịch chi không',
    ]},
    { intent: 'utility.tomorrow_schedule', severity: 'P1', samples: [
      'Ngày mai có lịch gì', 'Mai chú có việc gì', 'Mai có lịch chi không',
    ]},
    { intent: 'utility.weather', severity: 'P1', samples: [
      'Thời tiết hôm nay', 'Hôm nay có mưa không', 'Bây giờ bao nhiêu độ', 'Ở đây bao nhiêu độ',
      'Nhiệt độ hiện tại', 'Chỗ tôi có mưa không', 'Ngoài trời bao nhiêu độ', 'Bữa ni trời có mưa hông',
    ]},
    { intent: 'reminder.create', severity: 'P1', samples: [
      'Nhắc chú uống thuốc lúc 7 giờ', 'Ngày mai 8 giờ nhắc chú đi khám',
      'Tối nay 9 giờ nhắc tôi gọi cho con', '30 phút nữa nhắc chú tắt bếp',
    ]},
    { intent: 'unsupported.email', severity: 'P1', samples: [
      'Gửi email giúp chú', 'Gửi mail cho bác sĩ giúp tôi',
    ]},
    { intent: 'unsupported.ride', severity: 'P1', samples: [
      'Gọi taxi chở chú đi', 'Đặt xe giúp tôi',
    ]},
    { intent: 'unsupported.payment', severity: 'P0', samples: [
      'Chuyển tiền ngân hàng', 'Chuyển 5 triệu cho con chú',
    ]},
  ];

  let intentCounter = 0;
  for (const group of intentGroups) {
    for (const sample of group.samples) {
      intentCounter++;
      await test(`INT-${String(intentCounter).padStart(3, '0')}`, 'intent-positive', group.severity, () => {
        const match = classifyLocalBrain(sample);
        expectTrue(match, `Không match Local Brain cho câu: ${sample}`);
        expectEqual(match.intent.id, group.intent, `Sai intent cho câu: ${sample}`);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 2) FALSE POSITIVE / SAFETY BLOCKERS
  // ---------------------------------------------------------------------------
  const blockers: Array<{ text: string; forbiddenIntent: string; severity: Severity }> = [
    { text: 'Camera bị lỗi', forbiddenIntent: 'nav.camera', severity: 'P0' },
    { text: 'Chú không muốn mở camera', forbiddenIntent: 'nav.camera', severity: 'P0' },
    { text: 'Không cần chụp ảnh nữa', forbiddenIntent: 'nav.camera', severity: 'P0' },
    { text: 'Chụp ảnh xong rồi', forbiddenIntent: 'nav.camera', severity: 'P1' },
    { text: 'Chú về nhà rồi', forbiddenIntent: 'nav.home', severity: 'P0' },
    { text: 'Công ty mấy giờ mở cửa', forbiddenIntent: 'utility.current_time', severity: 'P0' },
    { text: 'Lịch hẹn mấy giờ', forbiddenIntent: 'utility.current_time', severity: 'P0' },
    { text: 'Phỏng vấn thứ mấy', forbiddenIntent: 'utility.day_of_week', severity: 'P0' },
    { text: 'Viết lời cảm ơn giúp chú', forbiddenIntent: 'social.thanks', severity: 'P1' },
    { text: 'Gửi lời chào cho bác sĩ', forbiddenIntent: 'social.greeting', severity: 'P1' },
    { text: 'Tôi vừa xem dự báo thời tiết', forbiddenIntent: 'utility.weather', severity: 'P1' },
    { text: 'Đừng nhắc chú uống thuốc', forbiddenIntent: 'reminder.create', severity: 'P0' },
  ];

  let blockerCounter = 0;
  for (const b of blockers) {
    blockerCounter++;
    await test(`NEG-${String(blockerCounter).padStart(3, '0')}`, 'intent-negative', b.severity, () => {
      const match = classifyLocalBrain(b.text);
      if (match?.intent.id === b.forbiddenIntent) {
        fail(`False positive: "${b.text}" kích hoạt ${b.forbiddenIntent}`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 3) LIFE EVENT DETECTION — must NOT auto-create a LifeSession
  // ---------------------------------------------------------------------------
  const lifeEvents: Array<{ text: string; family: string }> = [
    { text: 'Mai chú phải đi khám bệnh', family: 'healthcare' },
    { text: 'Ngày mai tôi đi bệnh viện', family: 'healthcare' },
    { text: 'Sáng mai bác đi tái khám', family: 'healthcare' },
    { text: 'Chiều mai chú đi xét nghiệm máu', family: 'healthcare' },
    { text: 'Mai tôi đi phỏng vấn', family: 'work' },
    { text: 'Chiều mai tôi có cuộc họp ở công ty', family: 'work' },
    { text: 'Mai chú đi chợ', family: 'shopping' },
    { text: 'Chiều nay tôi ra siêu thị mua đồ', family: 'shopping' },
    { text: 'Mai chú đi làm CCCD', family: 'administrative' },
    { text: 'Tôi phải đi làm hộ chiếu', family: 'administrative' },
    { text: 'Chiều mai chú ra ngân hàng', family: 'finance' },
    { text: 'Mai tôi mang laptop đi bảo hành', family: 'technology' },
  ];

  let eventCounter = 0;
  for (const e of lifeEvents) {
    eventCounter++;
    await test(`LIFE-${String(eventCounter).padStart(3, '0')}`, 'life-event-routing', 'P0', async () => {
      const r = await routeFastIntent(e.text, {
        session: null,
        userProfile: null,
        activeTab: 'chat',
        page: 'chat',
        hasActiveSession: false,
      } as any);

      expectTrue(r.handled, `Life event không được xử lý local: ${e.text}`);
      expectTrue(r.needsClarification, `Life event phải hỏi cách hỗ trợ: ${e.text}`);
      expectTrue(r.appAction?.type !== 'CREATE_SESSION', `Không được auto CREATE_SESSION: ${e.text}`);
      expectEqual(r.clarificationPayload?.scenarioFamily, e.family, `Sai scenarioFamily: ${e.text}`);
      expectTrue(r.clarificationPayload?.proposedGoal, `Thiếu proposedGoal: ${e.text}`);
    });
  }

  // Explicit creation request also requires confirmation, never direct create.
  const explicitCreateSamples = [
    'Tạo phiên đi khám cho chú',
    'Tạo mục hỗ trợ đi phỏng vấn cho tôi',
    'Con lập cho chú một phiên đi ngân hàng',
  ];
  let explicitCounter = 0;
  for (const text of explicitCreateSamples) {
    explicitCounter++;
    await test(`SESSION-EXPLICIT-${explicitCounter}`, 'session-consent', 'P0', async () => {
      const r = await routeFastIntent(text, {
        session: null,
        userProfile: null,
        activeTab: 'chat',
        page: 'chat',
        hasActiveSession: false,
      } as any);
      if (r.appAction?.type === 'CREATE_SESSION') {
        expectTrue(r.requiresConfirmation || r.appAction.requiresConfirmation, `CREATE_SESSION trực tiếp không confirmation: ${text}`);
      } else {
        expectTrue(r.needsClarification || normalize(r.reply || '').includes('dong y'), `Phải hỏi lại trước khi tạo phiên: ${text}`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 4) PENDING LIFE-EVENT -> REMINDER MULTI-TURN FLOW
  // ---------------------------------------------------------------------------
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const supportPending = makePending('CHOOSE_SUPPORT_MODE', {
    originalText: 'Mai chú phải đi khám bệnh',
    proposedGoal: 'Đi khám bệnh',
    scenarioFamily: 'healthcare',
    hasDate: true,
    dateLabel: 'ngày mai',
    dateIso: tomorrow.toISOString(),
    hasEventTime: false,
    hasLeadTime: false,
  });

  let reminderStep1: any;
  await test('FLOW-REM-001', 'reminder-multiturn', 'P0', async () => {
    reminderStep1 = await resolvePendingInteraction('Nhắc chú', supportPending as any);
    expectTrue(reminderStep1.resolved, 'Không resolve lựa chọn Nhắc chú');
    expectTrue(reminderStep1.newPending, 'Thiếu pending bước hỏi giờ');
    expectEqual(reminderStep1.newPending.data.actionType, 'CLARIFY_LIFE_EVENT_REMINDER', 'Sai pending reminder flow');
    expectEqual(reminderStep1.newPending.data.payload.proposedGoal, 'Đi khám bệnh', 'Mất goal đi khám');
    expectTrue(!reminderStep1.appAction, 'Không được tạo reminder khi chưa có giờ');
  });

  let reminderStep2: any;
  await test('FLOW-REM-002', 'reminder-multiturn', 'P0', async () => {
    reminderStep2 = await resolvePendingInteraction('9 giờ sáng', reminderStep1.newPending);
    expectTrue(reminderStep2.resolved, 'Không resolve giờ khám');
    expectTrue(reminderStep2.newPending, 'Phải hỏi thời gian nhắc trước');
    expectEqual(reminderStep2.newPending.data.actionType, 'CLARIFY_LIFE_EVENT_REMINDER', 'Sai pending sau khi có giờ');
    expectEqual(reminderStep2.newPending.data.payload.eventHour, 9, 'Không giữ giờ khám 09:00');
    expectTrue(!reminderStep2.appAction, 'Không được tạo reminder trước khi biết nhắc trước bao lâu');
  });

  await test('FLOW-REM-003', 'reminder-multiturn', 'P0', async () => {
    const step3 = await resolvePendingInteraction('Trước 1 tiếng', reminderStep2.newPending);
    expectTrue(step3.resolved, 'Không resolve lead time');
    expectEqual(step3.appAction?.type, 'CREATE_REMINDER', 'Bước cuối phải tạo CREATE_REMINDER');
    expectTrue(step3.appAction?.payload?.scheduledAt, 'CREATE_REMINDER thiếu scheduledAt');
    expectEqual(step3.appAction?.payload?.leadTimeMinutes, 60, 'Lead time phải là 60 phút');
    expectEqual(step3.appAction?.payload?.title, 'Đi khám bệnh', 'Reminder bị mất goal');
  });

  // Need date if absent.
  await test('FLOW-REM-004', 'reminder-multiturn', 'P0', async () => {
    const p = makePending('CHOOSE_SUPPORT_MODE', {
      proposedGoal: 'Đi khám bệnh',
      scenarioFamily: 'healthcare',
      hasDate: false,
      hasEventTime: false,
      hasLeadTime: false,
    });
    const r = await resolvePendingInteraction('Nhắc chú', p as any);
    expectTrue(r.newPending, 'Thiếu pending hỏi ngày');
    expectEqual(r.newPending.data.payload.missingStep, 'date', 'Khi thiếu ngày phải hỏi ngày trước');
    expectTrue(!r.appAction, 'Thiếu ngày thì tuyệt đối không CREATE_REMINDER');
  });

  // ---------------------------------------------------------------------------
  // 5) SESSION CONSENT FLOW
  // ---------------------------------------------------------------------------
  let sessionConfirm: any;
  await test('FLOW-SESSION-001', 'session-consent', 'P0', async () => {
    sessionConfirm = await resolvePendingInteraction('Hỗ trợ từng bước', supportPending as any);
    expectTrue(sessionConfirm.newPending, 'Phải tạo confirm_action trước CREATE_SESSION');
    expectEqual(sessionConfirm.newPending.type, 'confirm_action', 'Pending phải là confirm_action');
    expectEqual(sessionConfirm.newPending.data.action?.type, 'CREATE_SESSION', 'Confirmation phải chứa CREATE_SESSION');
    expectTrue(!sessionConfirm.appAction, 'Không được CREATE_SESSION ngay khi chọn hỗ trợ từng bước');
  });

  await test('FLOW-SESSION-002', 'session-consent', 'P0', async () => {
    const no = await resolvePendingInteraction('Không tạo', sessionConfirm.newPending);
    expectTrue(no.resolved, 'Negative confirmation phải resolve');
    expectTrue(!no.appAction, '"Không tạo" không được phát CREATE_SESSION');
  });

  let confirmedAction: any;
  await test('FLOW-SESSION-003', 'session-consent', 'P0', async () => {
    const yes = await resolvePendingInteraction('Đồng ý', sessionConfirm.newPending);
    expectTrue(yes.resolved, 'Affirmative confirmation phải resolve');
    expectEqual(yes.appAction?.type, 'CREATE_SESSION', 'Sau đồng ý mới được CREATE_SESSION');
    confirmedAction = yes.appAction;
  });

  await test('FLOW-SESSION-004', 'session-consent', 'P0', () => {
    const untrusted = validateAppAction(confirmedAction, {
      page: 'dashboard', hasActiveSession: false, availableSessions: [],
    } as any);
    expectTrue(untrusted.valid, 'Action phải structurally valid');
    expectTrue(untrusted.action?.requiresConfirmation, 'Untrusted CREATE_SESSION phải bị yêu cầu confirmation lại');
  });

  await test('FLOW-SESSION-005', 'session-consent', 'P0', () => {
    const trusted = validateAppAction(confirmedAction, {
      page: 'dashboard', hasActiveSession: false, availableSessions: [],
    } as any, { trustedSource: true });
    expectTrue(trusted.valid, 'Trusted confirmed action phải valid');
    expectTrue(!trusted.action?.requiresConfirmation, 'Trusted confirmed action không được re-prompt');
  });

  // ---------------------------------------------------------------------------
  // 6) DESTRUCTIVE CONFIRMATION LANGUAGE
  // ---------------------------------------------------------------------------
  const negatives = [
    'không', 'không xóa', 'đừng xóa', 'thôi', 'hủy', 'chưa',
    'chưa hoàn thành', 'không hoàn thành', 'không kết thúc', 'chưa kết thúc',
  ];
  let negCounter = 0;
  for (const text of negatives) {
    negCounter++;
    await test(`CONF-NEG-${String(negCounter).padStart(2, '0')}`, 'confirmation-safety', 'P0', () => {
      expectTrue(isNegativeResponse(text), `Không nhận diện negative: ${text}`);
      expectTrue(!isAffirmativeResponse(text), `Negative bị nhận thành affirmative: ${text}`);
    });
  }

  const affirmatives = ['đồng ý', 'tạo đi', 'đồng ý xóa', 'đúng rồi', 'chắc chắn'];
  let yesCounter = 0;
  for (const text of affirmatives) {
    yesCounter++;
    await test(`CONF-YES-${String(yesCounter).padStart(2, '0')}`, 'confirmation-safety', 'P1', () => {
      expectTrue(isAffirmativeResponse(text), `Không nhận diện affirmative: ${text}`);
      expectTrue(!isNegativeResponse(text), `Affirmative bị nhận thành negative: ${text}`);
    });
  }

  // ---------------------------------------------------------------------------
  // 7) REMINDER TARGET SAFETY
  // ---------------------------------------------------------------------------
  reminderService.saveReminders([
    {
      id: 'rem-only-1', title: 'Uống thuốc huyết áp', category: 'medication',
      scheduledAt: new Date(Date.now() + 3600000).toISOString(), status: 'active',
      priority: 'high', repeat: 'once', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
  ]);

  for (const type of ['DELETE_REMINDER', 'UPDATE_REMINDER', 'SNOOZE_REMINDER', 'COMPLETE_REMINDER'] as const) {
    await test(`REM-TARGET-${type}`, 'reminder-target-safety', 'P0', () => {
      const r = validateAppAction({ type, payload: { title: 'Đi khám' } } as any, {
        page: 'dashboard', hasActiveSession: false,
      } as any);
      expectTrue(!r.valid, `${type} explicit unmatched title không được fallback sang reminder duy nhất`);
    });
  }

  // ---------------------------------------------------------------------------
  // 8) DATE / TIME PARSING
  // ---------------------------------------------------------------------------
  await test('DATE-001', 'datetime', 'P1', () => {
    const r = dateTime.parseVietnameseReminderText('Ngày mai nhắc chú uống thuốc');
    expectEqual(r.status, 'needs_clarification', 'Thiếu giờ phải needs_clarification');
    if (r.status === 'needs_clarification') {
      expectTrue(r.missing.includes('time'), 'Phải thiếu time');
      expectTrue(r.targetDateStr, 'Phải giữ được ngày mai');
      expectTrue(normalize(r.title).includes('uong thuoc'), 'Phải giữ title uống thuốc');
    }
  });

  await test('DATE-002', 'datetime', 'P1', () => {
    const r = dateTime.parseVietnameseReminderText('Ngày mai 8 giờ nhắc chú đi khám');
    expectEqual(r.status, 'resolved', 'Đủ ngày giờ phải resolved');
    if (r.status === 'resolved') {
      expectEqual(r.reminder.category, 'appointment', 'Đi khám phải category appointment');
      expectTrue(normalize(r.reminder.title).includes('di kham'), 'Title phải là đi khám');
    }
  });

  await test('DATE-003', 'datetime', 'P1', () => {
    const r = dateTime.parseVietnameseReminderText('30 phút nữa nhắc chú gọi cho con');
    expectEqual(r.status, 'resolved', 'Relative reminder phải resolved');
  });

  const goalSamples = [
    'Mai chú phải đi khám bệnh',
    'Chiều mai chú ra ngân hàng',
    'Mai tôi mang laptop đi bảo hành',
    'Ngày mai tôi đi phỏng vấn vị trí IT Support',
  ];
  let goalCounter = 0;
  for (const text of goalSamples) {
    goalCounter++;
    await test(`GOAL-${String(goalCounter).padStart(2, '0')}`, 'goal-extraction', 'P1', () => {
      const goal = dateTime.extractSpecificGoal(text);
      expectTrue(goal && goal.trim().length >= 3, `Không extract được specific goal: ${text}`);
    });
  }

  // ---------------------------------------------------------------------------
  // 9) PERSISTENCE: global chat + pending TTL
  // ---------------------------------------------------------------------------
  await test('STORE-001', 'persistence', 'P1', () => {
    const messages = [
      { id: 'g1', sender: 'user', text: 'Mai chú đi khám', timestamp: new Date().toISOString() },
      { id: 'g2', sender: 'lovira', text: 'Chú muốn hỗ trợ hay nhắc nhở?', timestamp: new Date().toISOString() },
    ] as any;
    storageService.saveGlobalChatMessages(messages);
    const loaded = storageService.getGlobalChatMessages();
    expectEqual(loaded.length, 2, 'Global chat history không persist');
    expectEqual(loaded[0].text, 'Mai chú đi khám', 'Global chat history sai nội dung');
  });

  await test('STORE-002', 'persistence', 'P1', () => {
    storageService.clearGlobalChatMessages();
    expectEqual(storageService.getGlobalChatMessages().length, 0, 'Clear global chat không hoạt động');
  });

  await test('STORE-003', 'persistence', 'P0', () => {
    const p = {
      type: 'clarification',
      data: { actionType: 'CHOOSE_SUPPORT_MODE', payload: { proposedGoal: 'Đi khám bệnh' } },
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 60000,
    } as any;
    storageService.savePendingInteraction(p);
    const loaded = storageService.getPendingInteraction();
    expectEqual(loaded?.data?.payload?.proposedGoal, 'Đi khám bệnh', 'Pending mất context sau persistence');
  });

  await test('STORE-004', 'persistence', 'P1', () => {
    const expired = {
      type: 'clarification', data: { actionType: 'X' }, createdAt: new Date().toISOString(), expiresAt: Date.now() - 1,
    } as any;
    storageService.savePendingInteraction(expired);
    expectEqual(storageService.getPendingInteraction(), null, 'Expired pending phải tự clear');
  });

  // ---------------------------------------------------------------------------
  // 10) SOURCE-LEVEL ARCHITECTURE GUARDS
  // These catch regressions that are difficult to exercise without a mounted React DOM.
  // ---------------------------------------------------------------------------
  const managerSrc = source('src/hooks/useSessionManager.ts');
  const globalChatSrc = source('src/components/chat/GlobalChatPage.tsx');
  const createModalSrc = source('src/components/home/CreateSessionModal.tsx');
  const interactionTypesSrc = source('src/services/interaction/interactionTypes.ts');
  const storageSrc = source('src/services/storageService.ts');
  const validatorSrc = source('src/services/interaction/appActionValidator.ts');
  const groqProviderSrc = source('src/services/ai/GroqProvider.ts');
  const geminiProviderSrc = source('src/services/ai/GeminiProvider.ts');

  await test('ARCH-001', 'context-isolation', 'P0', () => {
    expectTrue(
      managerSrc.includes('session: isSessionContext ? activeSession : null'),
      'Fast router phải dùng route-scoped session context'
    );
  });

  await test('ARCH-002', 'context-isolation', 'P0', () => {
    expectTrue(
      managerSrc.includes('const sessionToUse = isSessionContext ? activeSession : null'),
      'AI fallback không được lấy active/first session khi ở Global Chat'
    );
    expectTrue(
      !/const sessionToUse\s*=\s*activeSession\s*\|\|[\s\S]{0,180}sessionsList\[0\]/.test(managerSrc),
      'Không được fallback sessionsList[0] làm AI context'
    );
  });

  await test('ARCH-003', 'context-isolation', 'P0', () => {
    expectTrue(
      /activeSessionId:\s*isSessionContext\s*\?/.test(managerSrc),
      'AppInteractionContext.activeSessionId phải route-scoped; Global Chat không được gắn reminder vào session cũ'
    );
    expectTrue(
      /hasActiveSession:\s*isSessionContext\s*&&/.test(managerSrc),
      'AppInteractionContext.hasActiveSession phải false ngoài /session/:id'
    );
  });

  await test('ARCH-004', 'global-chat-memory', 'P0', () => {
    // 1. Client must send history to /api/chat
    const clientSendsHistory = /conversationHistory\s*:/.test(managerSrc);
    expectTrue(clientSendsHistory, 'useSessionManager chưa truyền conversationHistory vào /api/chat');

    // 2. GroqProvider must destructure conversationHistory and add to LLM messages
    const groqConsumesHistory =
      /conversationHistory/.test(groqProviderSrc) &&
      /historyMessages/.test(groqProviderSrc);
    expectTrue(groqConsumesHistory, 'GroqProvider chưa tiêu thụ conversationHistory hoặc chưa inject historyMessages vào LLM payload');

    // 3. GeminiProvider must destructure conversationHistory and add to contents
    const geminiConsumesHistory =
      /conversationHistory/.test(geminiProviderSrc) &&
      /cleanHistory/.test(geminiProviderSrc);
    expectTrue(geminiConsumesHistory, 'GeminiProvider chưa tiêu thụ conversationHistory hoặc chưa inject contents vào LLM payload');
  });

  await test('ARCH-005', 'global-chat-memory', 'P1', () => {
    expectTrue(storageSrc.includes("KEY_GLOBAL_CHAT = 'lovira_global_chat_v1'"), 'Thiếu persistent global chat key');
    expectTrue(storageSrc.includes('getGlobalChatMessages()'), 'Thiếu getGlobalChatMessages');
    expectTrue(storageSrc.includes('saveGlobalChatMessages('), 'Thiếu saveGlobalChatMessages');
  });

  await test('ARCH-006', 'pending-scope', 'P0', () => {
    // 1. Interface check
    const hasScope = /scope\??:|conversationId\??:|pageContext\??:|sessionId\??:/.test(interactionTypesSrc.split('export interface PendingInteraction')[1] || '');
    expectTrue(hasScope, 'PendingInteraction cần scope/conversationId/page/session để tránh pending cũ bắt nhầm câu ở trang khác');

    // 2. Exact session ID isolation check
    const enforcesSessionId = /pendingInteraction\.sessionId\s*===\s*currentSessionId/.test(managerSrc);
    expectTrue(enforcesSessionId, 'useSessionManager phải kiểm tra exact sessionId khi validate pendingInteraction scope');

    // 3. Page context check for vision / easy-understand
    const enforcesPageScope = /currentPage\s*===\s*'vision'/.test(managerSrc) && /currentPage\s*===\s*'easy-understand'/.test(managerSrc);
    expectTrue(enforcesPageScope, 'useSessionManager phải kiểm tra exact page context khi validate vision/easy-understand pending scope');
  });

  await test('ARCH-007', 'global-chat-ui', 'P0', () => {
    expectTrue(!/navigate\(`\/session\//.test(globalChatSrc), 'GlobalChatPage không được auto redirect sang LifeSession');
  });

  await test('ARCH-008', 'session-consent-ui', 'P1', () => {
    // Product rule: even explicit session creation should have a confirmation step.
    expectTrue(
      !/onClick=\{\(\) => onCreateSessionFromTemplate\('medical'\)\}/.test(globalChatSrc),
      'Quick scenario "Đi khám bệnh" đang gọi create trực tiếp; cần đi qua confirmation flow'
    );
  });

  await test('ARCH-009', 'session-consent-ui', 'P1', () => {
    expectTrue(
      !/await onCreateFromTemplate\('custom',\s*finalTopic\)/.test(createModalSrc),
      'CreateSessionModal nút "Tiếp tục" đang tạo session ngay; cần bước preview/confirm trước khi create'
    );
  });

  await test('ARCH-010', 'validator-security', 'P0', () => {
    expectTrue(validatorSrc.includes('trustedSource?: boolean'), 'Validator cần trustedSource nội bộ');
    expectTrue(/isTrusted\s*&&\s*\(action\.payload\?\.appConfirmed/.test(validatorSrc), 'AI payload không được tự bypass CREATE_SESSION confirmation');
  });

  await test('ARCH-011', 'page-context', 'P2', () => {
    const pageUnion = interactionTypesSrc.match(/export type LoviraPage\s*=([\s\S]*?);/)?.[1] || '';
    expectTrue(pageUnion.includes("'chat'"), 'LoviraPage nên khai báo chat thay vì dựa vào any');
    expectTrue(pageUnion.includes("'vision'"), 'LoviraPage nên khai báo vision');
  });

  await test('ARCH-012', 'clear-chat-pending', 'P1', () => {
    const clearsPendingOnChatClear = /pendingInteraction\?\.scope\s*===\s*'global-chat'/.test(managerSrc) && /setPendingInteraction\(null\)/.test(managerSrc);
    expectTrue(clearsPendingOnChatClear, 'clearGlobalChat phải xóa pendingInteraction của global-chat');
  });

  await test('ARCH-013', 'callback-dependencies', 'P1', () => {
    const hasGlobalMsgDep = /globalMessages,[\s\S]{0,80}addGlobalMessage,[\s\S]{0,80}setPendingInteraction/.test(managerSrc);
    expectTrue(hasGlobalMsgDep, 'sendInteraction useCallback phải đưa globalMessages, addGlobalMessage, setPendingInteraction vào dependency array');
  });

  // ---------------------------------------------------------------------------
  // 11) COMPLEX PROMPTS SHOULD NOT BE OVER-EAGERLY EXECUTED LOCALLY
  // ---------------------------------------------------------------------------
  const complexPrompts = [
    'Mai chú đi phỏng vấn nhưng chú đi xe lăn, chưa biết công ty có lối vào phù hợp không',
    'Bác sĩ dặn chú uống thuốc sau ăn nhưng sáng mai chú phải nhịn ăn xét nghiệm thì làm sao',
    'Mai chú đi khám mà chưa biết mang giấy tờ gì và cũng không nhớ giờ hẹn',
    'Chú hơi lo lúc tới bệnh viện vì không biết phải vào cổng nào',
  ];
  let complexCounter = 0;
  for (const text of complexPrompts) {
    complexCounter++;
    await test(`AI-FALLBACK-${String(complexCounter).padStart(2, '0')}`, 'ai-fallback', 'P1', async () => {
      const m = classifyLocalBrain(text);
      // It is acceptable to detect a life-event scenario locally, but it must not emit a destructive/final action.
      if (m) {
        const exec = await executeLocalBrain(text, { session: null, hasActiveSession: false } as any);
        expectTrue((exec.appAction?.type as string) !== 'CREATE_SESSION', 'Complex prompt không được auto-create session');
        expectTrue((exec.appAction?.type as string) !== 'DELETE_SESSION', 'Complex prompt không được destructive action');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // SUMMARY + OUTPUT FILES
  // ---------------------------------------------------------------------------
  const finishedAt = new Date();
  const executed = results.filter(r => r.status !== 'SKIP');
  const passed = executed.filter(r => r.status === 'PASS').length;
  const failed = executed.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  const totalWeight = executed.reduce((sum, r) => sum + weight[r.severity], 0);
  const passedWeight = executed.filter(r => r.status === 'PASS').reduce((sum, r) => sum + weight[r.severity], 0);
  const score = totalWeight ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const p0Fails = results.filter(r => r.status === 'FAIL' && r.severity === 'P0');

  let grade = 'FAIL';
  if (p0Fails.length === 0 && score >= 95) grade = 'EXCELLENT';
  else if (p0Fails.length === 0 && score >= 90) grade = 'GOOD';
  else if (p0Fails.length === 0 && score >= 80) grade = 'NEEDS_IMPROVEMENT';

  const categories = Array.from(new Set(results.map(r => r.category))).sort();
  const categoryRows = categories.map(category => {
    const rs = results.filter(r => r.category === category && r.status !== 'SKIP');
    const p = rs.filter(r => r.status === 'PASS').length;
    const f = rs.filter(r => r.status === 'FAIL').length;
    const wAll = rs.reduce((s, r) => s + weight[r.severity], 0);
    const wPass = rs.filter(r => r.status === 'PASS').reduce((s, r) => s + weight[r.severity], 0);
    return {
      category,
      total: rs.length,
      pass: p,
      fail: f,
      score: wAll ? Math.round((wPass / wAll) * 100) : 0,
    };
  });

  const logLines: string[] = [];
  logLines.push('LOVIRA INTERACTION TEST LOG');
  logLines.push(`Started: ${startedAt.toISOString()}`);
  logLines.push(`Finished: ${finishedAt.toISOString()}`);
  logLines.push(`Total: ${executed.length} | Pass: ${passed} | Fail: ${failed} | Skip: ${skipped}`);
  logLines.push(`Weighted suitability score: ${score}/100 | Grade: ${grade}`);
  logLines.push(`P0 failures: ${p0Fails.length}`);
  logLines.push('');

  for (const r of results) {
    logLines.push(`[${r.status}] [${r.severity}] [${r.category}] ${r.id} (${r.durationMs}ms) - ${r.details}`);
  }

  fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n', 'utf8');

  const failedRows = results.filter(r => r.status === 'FAIL');
  const md: string[] = [];
  md.push('# Lovira Interaction Automation Test Report');
  md.push('');
  md.push(`- **Started:** ${startedAt.toISOString()}`);
  md.push(`- **Finished:** ${finishedAt.toISOString()}`);
  md.push(`- **Executed tests:** ${executed.length}`);
  md.push(`- **Passed:** ${passed}`);
  md.push(`- **Failed:** ${failed}`);
  md.push(`- **Skipped:** ${skipped}`);
  md.push(`- **Weighted suitability score:** **${score}/100**`);
  md.push(`- **Grade:** **${grade}**`);
  md.push(`- **P0 failures:** **${p0Fails.length}**`);
  md.push('');
  md.push('## Scoring policy');
  md.push('');
  md.push('- P0 = weight 5: safety, consent, wrong-session/context mutation, destructive actions.');
  md.push('- P1 = weight 3: key UX/intent/context quality.');
  md.push('- P2 = weight 1: polish/type completeness.');
  md.push('- Any P0 failure prevents GOOD/EXCELLENT status.');
  md.push('');
  md.push('## Category summary');
  md.push('');
  md.push('| Category | Tests | Pass | Fail | Score |');
  md.push('|---|---:|---:|---:|---:|');
  for (const c of categoryRows) {
    md.push(`| ${c.category} | ${c.total} | ${c.pass} | ${c.fail} | ${c.score}% |`);
  }
  md.push('');
  md.push('## Failed tests');
  md.push('');
  if (failedRows.length === 0) {
    md.push('No failed tests.');
  } else {
    md.push('| Severity | ID | Category | Failure |');
    md.push('|---|---|---|---|');
    for (const r of failedRows) {
      md.push(`| ${r.severity} | ${r.id} | ${r.category} | ${r.details.replace(/\|/g, '\\|')} |`);
    }
  }
  md.push('');
  md.push('## Required P0 acceptance scenarios');
  md.push('');
  md.push('1. `Mai chú phải đi khám bệnh` must not create a session.');
  md.push('2. Selecting `Nhắc chú` must collect date, event time, and reminder lead time before CREATE_REMINDER.');
  md.push('3. Selecting `Hỗ trợ từng bước` must ask explicit confirmation before CREATE_SESSION.');
  md.push('4. `Không tạo`, `không xóa`, `không kết thúc`, `chưa hoàn thành` must never execute the destructive action.');
  md.push('5. Global Chat must not use an old LifeSession as semantic/action context.');
  md.push('6. Global Chat reminder creation must not attach to an unrelated old active session.');
  md.push('7. Global conversation history must be provided to AI fallback, not merely displayed/persisted in UI.');
  md.push('8. Persisted PendingInteraction must be scoped so it cannot intercept speech on an unrelated page/session.');
  md.push('');
  md.push('## Recommended CI command');
  md.push('');
  md.push('```bash');
  md.push('npx tsx scripts/test-lovira-interactions.ts');
  md.push('```');
  md.push('');
  md.push('Recommended package.json entry:');
  md.push('');
  md.push('```json');
  md.push('"test:interactions": "tsx scripts/test-lovira-interactions.ts"');
  md.push('```');
  md.push('');
  md.push('Then make the project gate:');
  md.push('');
  md.push('```json');
  md.push('"check": "npm run lint && npm run test:local-brain && npm run test:interactions && npm run build"');
  md.push('```');

  fs.writeFileSync(REPORT_PATH, md.join('\n') + '\n', 'utf8');

  console.log('');
  console.log(`Tests: ${executed.length} | Passed: ${passed} | Failed: ${failed} | P0 fails: ${p0Fails.length}`);
  console.log(`Suitability: ${score}/100 | Grade: ${grade}`);
  console.log(`Log: ${LOG_PATH}`);
  console.log(`Report: ${REPORT_PATH}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exitCode = 2;
});
