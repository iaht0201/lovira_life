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

  console.log(`\n========================================`);
  console.log(`Result: ${passed}/${passed + failed} test cases passed.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
