import { classifyLocalBrain } from '../src/services/localBrain/LocalBrainClassifier.js';
import { executeLocalBrain } from '../src/services/localBrain/LocalBrainEngine.js';

async function runTests() {
  console.log('🧪 Starting Lovira Local Brain Test Suite...\n');

  const testCases = [
    // 1. Greetings / Social
    { query: 'Xin chào', expectedIntent: 'social.greeting', shouldHandle: true },
    { query: 'Chào con', expectedIntent: 'social.greeting', shouldHandle: true },
    { query: 'Lovira ơi xin chào', expectedIntent: 'social.greeting', shouldHandle: true },
    { query: 'Cảm ơn con', expectedIntent: 'social.thanks', shouldHandle: true },
    { query: 'Tạm biệt con nhé', expectedIntent: 'social.goodbye', shouldHandle: true },
    { query: 'Con làm được gì', expectedIntent: 'social.capabilities', shouldHandle: true },
    { query: 'Con là ai', expectedIntent: 'social.identity', shouldHandle: true },

    // 2. Navigation
    { query: 'Về trang chủ', expectedIntent: 'nav.home', shouldHandle: true },
    { query: 'Quay lại', expectedIntent: 'nav.back', shouldHandle: true },
    { query: 'Mở camera', expectedIntent: 'nav.camera', shouldHandle: true },
    { query: 'Chụp tấm hình cho chú', expectedIntent: 'nav.camera', shouldHandle: true },
    { query: 'Mở ca mê ra cho tui', expectedIntent: 'nav.camera', shouldHandle: true },
    { query: 'Mở cài đặt', expectedIntent: 'nav.settings', shouldHandle: true },
    { query: 'Mở hồ sơ', expectedIntent: 'nav.profile', shouldHandle: true },
    { query: 'Mở nhắc nhở', expectedIntent: 'nav.reminders', shouldHandle: true },
    { query: 'Mở phiên phỏng vấn', expectedIntent: 'nav.open_named_session', shouldHandle: true },

    // 3. Utilities (Date / Time / Weather)
    { query: 'Mấy giờ rồi', expectedIntent: 'utility.current_time', shouldHandle: true },
    { query: 'Hôm nay thứ mấy', expectedIntent: 'utility.day_of_week', shouldHandle: true },
    { query: 'Hôm nay ngày mấy', expectedIntent: 'utility.current_date', shouldHandle: true },
    { query: 'Hôm nay có lịch gì', expectedIntent: 'utility.today_schedule', shouldHandle: true },
    { query: 'Bữa ni tui có lịch chi không', expectedIntent: 'utility.today_schedule', shouldHandle: true },
    { query: 'Ngày mai có lịch gì', expectedIntent: 'utility.tomorrow_schedule', shouldHandle: true },
    { query: 'Thời tiết hôm nay', expectedIntent: 'utility.weather', shouldHandle: true },
    { query: 'Bữa ni trời có mưa hông', expectedIntent: 'utility.weather', shouldHandle: true },

    // 4. Reminders
    { query: 'Nhắc chú uống thuốc lúc 7 giờ', expectedIntent: 'reminder.create', shouldHandle: true },
    { query: 'Ngày mai 8 giờ nhắc chú đi khám', expectedIntent: 'reminder.create', shouldHandle: true },

    // 5. Negative Blockers (Should NOT trigger false positive action)
    { query: 'Camera bị lỗi', expectedIntent: 'nav.camera', shouldReject: true },
    { query: 'Chú về nhà rồi', expectedIntent: 'nav.home', shouldReject: true },
    { query: 'Công ty mấy giờ mở cửa', expectedIntent: 'utility.current_time', shouldReject: true },
    { query: 'Chú không muốn chụp ảnh', expectedIntent: 'nav.camera', shouldReject: true },
    { query: 'Lịch hẹn mấy giờ', expectedIntent: 'utility.current_time', shouldReject: true },
    { query: 'Phỏng vấn thứ mấy', expectedIntent: 'utility.day_of_week', shouldReject: true },

    // 6. Unsupported In-App Capability
    { query: 'Gửi email giúp chú', expectedIntent: 'unsupported.email', shouldHandle: true },
    { query: 'Gọi taxi chở chú đi', expectedIntent: 'unsupported.ride', shouldHandle: true },
    { query: 'Chuyển tiền ngân hàng', expectedIntent: 'unsupported.payment', shouldHandle: true },

    // 7. Clarifications
    { query: 'Mở lên', expectedIntent: 'clarify.generic_open', shouldHandle: true },
    { query: 'Giúp chú với', expectedIntent: 'clarify.vague_help', shouldHandle: true },

    // 8. Complex AI-Required Prompts (Should NOT trigger local brain, pass to AI)
    { query: 'Mai chú đi phỏng vấn nhưng chú đi xe lăn, chưa biết công ty có lối vào phù hợp không', shouldPassToAI: true },
    { query: 'Bác sĩ dặn chú uống thuốc sau ăn nhưng sáng nay chú nhịn ăn để xét nghiệm máu thì phải làm sao', shouldPassToAI: true },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const match = classifyLocalBrain(tc.query);

    if (tc.shouldPassToAI) {
      if (!match) {
        console.log(`✅ [AI Fallback] "${tc.query}" -> Passed directly to AI reasoning.`);
        passed++;
      } else {
        console.error(`❌ [AI Fallback Failed] "${tc.query}" -> Falsely matched intent: ${match.intent.id}`);
        failed++;
      }
      continue;
    }

    if (tc.shouldReject) {
      if (!match || match.intent.id !== tc.expectedIntent) {
        console.log(`✅ [Negative Blocker Pass] "${tc.query}" -> Blocked from false positive (${tc.expectedIntent})`);
        passed++;
      } else {
        console.error(`❌ [Negative Blocker Failed] "${tc.query}" -> Falsely triggered: ${match.intent.id}`);
        failed++;
      }
      continue;
    }

    if (tc.shouldHandle) {
      if (match && match.intent.id === tc.expectedIntent) {
        const exec = await executeLocalBrain(tc.query);
        console.log(`✅ [Intent Match Pass] "${tc.query}" -> ${match.intent.id} (conf: ${match.confidence.toFixed(2)}) | Reply: "${exec.reply?.slice(0, 50)}..."`);
        passed++;
      } else {
        console.error(`❌ [Intent Match Failed] "${tc.query}" -> Expected ${tc.expectedIntent}, got ${match ? match.intent.id : 'null'}`);
        failed++;
      }
    }
  }

  // 9. Deep Regression Tests for PolicyGuard & Context Retention
  console.log('\n--- Deep Regression Tests ---');

  // A. Reminder missing time context retention
  const missingTimeQuery = 'Ngày mai nhắc chú uống thuốc';
  const missingTimeExec = await executeLocalBrain(missingTimeQuery);
  if (
    missingTimeExec.needsClarification &&
    missingTimeExec.clarificationPayload &&
    missingTimeExec.clarificationPayload.title &&
    missingTimeExec.clarificationPayload.title.toLowerCase().includes('uống thuốc') &&
    missingTimeExec.clarificationPayload.targetDateStr
  ) {
    console.log(`✅ [Context Retention Pass] "${missingTimeQuery}" -> Retained title="${missingTimeExec.clarificationPayload.title}", targetDateStr="${missingTimeExec.clarificationPayload.targetDateStr}"`);
    passed++;
  } else {
    console.error(`❌ [Context Retention Fail] "${missingTimeQuery}" -> clarificationPayload missing or incomplete:`, missingTimeExec.clarificationPayload);
    failed++;
  }

  // B. PolicyGuard check for COMPLETE_SESSION
  const completeSessionQuery = 'Hoàn thành phiên này';
  const completeSessionExec = await executeLocalBrain(completeSessionQuery, {
    session: {
      id: 'sess-123',
      title: 'Tập thể dục buổi sáng',
      category: 'health',
      goal: 'Tập thể dục',
      status: 'in_progress',
      tasks: [],
      messages: [],
      facts: [],
      keyNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    hasActiveSession: true,
  });

  if (completeSessionExec.requiresConfirmation && completeSessionExec.agentActions?.some((a) => a.type === 'COMPLETE_SESSION')) {
    console.log(`✅ [PolicyGuard Pass] "${completeSessionQuery}" -> Enforced requiresConfirmation=true before COMPLETE_SESSION`);
    passed++;
  } else {
    console.error(`❌ [PolicyGuard Fail] "${completeSessionQuery}" -> Did not enforce confirmation:`, completeSessionExec);
    failed++;
  }

  // C. PolicyGuard & Target Extraction for DELETE_REMINDER
  const deleteRemQuery = 'Xóa nhắc nhở uống thuốc của chú';
  const deleteRemExec = await executeLocalBrain(deleteRemQuery);
  if (
    deleteRemExec.requiresConfirmation &&
    deleteRemExec.appAction?.type === 'DELETE_REMINDER' &&
    deleteRemExec.appAction?.payload?.title?.toLowerCase().includes('uống thuốc')
  ) {
    console.log(`✅ [Reminder Target Resolver Pass] "${deleteRemQuery}" -> Resolved title="${deleteRemExec.appAction?.payload?.title}" with requiresConfirmation=true`);
    passed++;
  } else {
    console.error(`❌ [Reminder Target Resolver Fail] "${deleteRemQuery}" ->`, deleteRemExec);
    failed++;
  }

  // D. Reminder Target Resolver with "giúp chú" prefix
  const deleteGiupChuQuery = 'Xóa giúp chú nhắc nhở đi chợ';
  const deleteGiupChuExec = await executeLocalBrain(deleteGiupChuQuery);
  if (
    deleteGiupChuExec.requiresConfirmation &&
    deleteGiupChuExec.appAction?.type === 'DELETE_REMINDER' &&
    deleteGiupChuExec.appAction?.payload?.title?.toLowerCase().includes('đi chợ')
  ) {
    console.log(`✅ [Reminder Target Resolver Pass with 'giúp chú'] "${deleteGiupChuQuery}" -> Resolved title="${deleteGiupChuExec.appAction?.payload?.title}"`);
    passed++;
  } else {
    console.error(`❌ [Reminder Target Resolver Fail with 'giúp chú'] "${deleteGiupChuQuery}" ->`, deleteGiupChuExec);
    failed++;
  }

  // 10. End-to-End PendingInteraction & Validator Tests
  console.log('\n--- E2E Pending Flow Integration Tests ---');
  const { resolvePendingInteraction } = await import('../src/services/interaction/pendingInteractionResolver.ts');
  const { validateAppAction } = await import('../src/services/interaction/appActionValidator.ts');

  // E. P0 Test: Delete Reminder Confirmation does NOT ask confirmation a 2nd time
  const pendingConfirmDelete = {
    type: 'confirm_action',
    data: {
      action: {
        type: 'DELETE_REMINDER',
        payload: { reminderId: 'rem-1', title: 'Uống thuốc huyết áp', skipConfirmation: true },
      },
      question: 'Chú có chắc muốn xóa lịch nhắc "Uống thuốc huyết áp" không ạ?',
    },
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 180000,
  };

  const resolvedConfirm = await resolvePendingInteraction('Đồng ý xóa', pendingConfirmDelete);
  if (resolvedConfirm.resolved && resolvedConfirm.appAction && resolvedConfirm.appAction.payload?.skipConfirmation === true) {
    const valRes = validateAppAction(resolvedConfirm.appAction, { page: 'dashboard', hasActiveSession: false });
    if (valRes.valid && !valRes.action?.requiresConfirmation) {
      console.log('✅ [P0 Pass] Delete Reminder confirmation marks skipConfirmation:true and does not re-prompt');
      passed++;
    } else {
      console.error('❌ [P0 Fail] Validator re-prompted confirmation on delete:', valRes);
      failed++;
    }
  } else {
    console.error('❌ [P0 Fail] resolvePendingInteraction failed on affirmative delete:', resolvedConfirm);
    failed++;
  }

  // F. P0 Test: Ambiguous Delete Reminder requires confirmation before deleting
  const pendingAmbiguousDelete = {
    type: 'clarification',
    data: {
      actionType: 'DELETE_REMINDER',
      payload: {
        operation: 'DELETE_REMINDER',
        candidates: [
          { id: 'rem-1', title: 'Uống thuốc buổi sáng' },
          { id: 'rem-2', title: 'Đi khám tổng quát' },
        ],
      },
    },
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 180000,
  };

  const resolvedAmbiguousChoice = await resolvePendingInteraction('Uống thuốc buổi sáng', pendingAmbiguousDelete);
  if (
    resolvedAmbiguousChoice.resolved &&
    !resolvedAmbiguousChoice.clearPending &&
    resolvedAmbiguousChoice.newPending?.type === 'confirm_action' &&
    resolvedAmbiguousChoice.newPending.data.action?.type === 'DELETE_REMINDER' &&
    resolvedAmbiguousChoice.newPending.data.action?.payload?.reminderId === 'rem-1'
  ) {
    console.log('✅ [P0 Pass] Ambiguous delete choice creates confirmation prompt instead of deleting directly');
    passed++;
  } else {
    console.error('❌ [P0 Fail] Ambiguous delete did not require confirmation:', resolvedAmbiguousChoice);
    failed++;
  }

  // G. P1 Test: UPDATE_REMINDER 2-stage pending flow
  const pendingAmbiguousUpdate = {
    type: 'clarification',
    data: {
      actionType: 'UPDATE_REMINDER',
      payload: {
        operation: 'UPDATE_REMINDER',
        candidates: [
          { id: 'rem-1', title: 'Uống thuốc buổi sáng' },
          { id: 'rem-2', title: 'Đi khám tổng quát' },
        ],
      },
    },
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 180000,
  };

  // Stage 1: Choose which reminder
  const stage1Res = await resolvePendingInteraction('Uống thuốc', pendingAmbiguousUpdate);
  if (
    stage1Res.resolved &&
    !stage1Res.clearPending &&
    stage1Res.newPending?.type === 'clarification' &&
    stage1Res.newPending.data.actionType === 'UPDATE_REMINDER' &&
    stage1Res.newPending.data.payload?.reminderId === 'rem-1'
  ) {
    // Stage 2: Provide new time
    const stage2Res = await resolvePendingInteraction('8 giờ tối', stage1Res.newPending);
    if (
      stage2Res.resolved &&
      stage2Res.clearPending &&
      stage2Res.appAction?.type === 'UPDATE_REMINDER' &&
      stage2Res.appAction.payload?.reminderId === 'rem-1' &&
      stage2Res.appAction.payload.scheduledAt
    ) {
      console.log('✅ [P1 Pass] UPDATE_REMINDER 2-stage pending flow successfully resolves target and new time');
      passed++;
    } else {
      console.error('❌ [P1 Fail] Stage 2 UPDATE_REMINDER failed:', stage2Res);
      failed++;
    }
  } else {
    console.error('❌ [P1 Fail] Stage 1 UPDATE_REMINDER failed:', stage1Res);
    failed++;
  }

  // H. P1 Test: Snooze preset extraction & dynamic handling
  const snooze30mExec = await executeLocalBrain('Hoãn nhắc uống thuốc 30 phút');
  if (
    snooze30mExec.appAction?.type === 'SNOOZE_REMINDER' &&
    snooze30mExec.appAction.payload?.snoozePreset === '30m'
  ) {
    console.log('✅ [P1 Pass] Snooze 30 minutes dynamically extracts preset "30m"');
    passed++;
  } else {
    console.error('❌ [P1 Fail] Snooze 30 minutes failed:', snooze30mExec);
    failed++;
  }

  const snooze1hExec = await executeLocalBrain('Báo lại nhắc nhở sau 1 tiếng');
  if (
    snooze1hExec.appAction?.type === 'SNOOZE_REMINDER' &&
    snooze1hExec.appAction.payload?.snoozePreset === '1h'
  ) {
    console.log('✅ [P1 Pass] Snooze 1 hour dynamically extracts preset "1h"');
    passed++;
  } else {
    console.error('❌ [P1 Fail] Snooze 1 hour failed:', snooze1hExec);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`Result: ${passed}/${passed + failed} test cases passed.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
