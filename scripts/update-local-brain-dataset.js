import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, '../src/data/localBrain/localBrain.json');

const dataset = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function addExamples(intentId, newExamples) {
  const intent = dataset.intents.find(i => i.id === intentId);
  if (intent) {
    if (!intent.examples) intent.examples = [];
    for (const ex of newExamples) {
      if (!intent.examples.includes(ex)) {
        intent.examples.push(ex);
      }
    }
  } else {
    console.warn(`Intent not found: ${intentId}`);
  }
}

function addNegativeExamples(intentId, newNegatives) {
  const intent = dataset.intents.find(i => i.id === intentId);
  if (intent) {
    if (!intent.negativeExamples) intent.negativeExamples = [];
    for (const neg of newNegatives) {
      if (!intent.negativeExamples.includes(neg)) {
        intent.negativeExamples.push(neg);
      }
    }
  } else {
    console.warn(`Intent not found: ${intentId}`);
  }
}

// 1. social.greeting
addExamples('social.greeting', ['alo lovira', 'alo']);
addNegativeExamples('social.greeting', ['chào con nha']); // ensure "Chào con nha" goes to goodbye

// 2. social.goodbye
addExamples('social.goodbye', ['chào con nha', 'tạm biệt con nhé']);

// 3. social.capabilities
addExamples('social.capabilities', [
  'lovira giúp được gì',
  'con có thể giúp chú việc gì',
  'ứng dụng này làm được gì',
]);

// 4. social.identity
addExamples('social.identity', ['lovira là ai']);

// 5. nav.home
addExamples('nav.home', ['cho chú về nhà']);

// 6. nav.profile
addExamples('nav.profile', ['xem thông tin của chú']);

// 7. nav.reminders
addExamples('nav.reminders', ['xem lịch nhắc', 'cho chú xem các nhắc nhở']);

// 8. utility.current_time
addExamples('utility.current_time', ['giờ là mấy giờ', 'hiện tại mấy giờ']);

// 9. utility.day_of_week
addExamples('utility.day_of_week', ['nay thứ mấy']);

// 10. utility.today_schedule
addExamples('utility.today_schedule', ['hôm nay chú có việc gì']);

// 11. utility.tomorrow_schedule
addExamples('utility.tomorrow_schedule', ['mai chú có việc gì', 'mai có lịch chi không']);

// 12. reminder.create
addExamples('reminder.create', [
  'tối nay 9 giờ nhắc tôi gọi cho con',
  '30 phút nữa nhắc chú tắt bếp',
]);
addNegativeExamples('reminder.create', [
  'đừng nhắc chú uống thuốc',
  'đừng nhắc chú',
  'đừng nhắc',
  'không cần nhắc',
]);

// 13. unsupported.email
addExamples('unsupported.email', ['gửi mail cho bác sĩ giúp tôi', 'gửi email cho bác sĩ']);

// 14. unsupported.ride
addExamples('unsupported.ride', ['đặt xe giúp tôi']);

// 15. unsupported.payment
addExamples('unsupported.payment', [
  'chuyển 5 triệu cho con chú',
  'chuyển 5 triệu',
  'chuyển tiền cho con chú',
]);

// 16. nav.camera
addNegativeExamples('nav.camera', [
  'chú không muốn mở camera',
  'không cần chụp ảnh nữa',
  'không muốn mở camera',
  'không cần chụp ảnh',
  'không chụp ảnh nữa',
]);

// 17. utility.weather
addNegativeExamples('utility.weather', [
  'tôi vừa xem dự báo thời tiết',
  'vừa xem dự báo thời tiết',
  'mới xem dự báo thời tiết',
]);

// 18. scenario.create.work
addExamples('scenario.create.work', [
  'chiều mai tôi có cuộc họp ở công ty',
  'tôi có cuộc họp ở công ty',
]);

// 19. scenario.create.shopping
addExamples('scenario.create.shopping', [
  'chiều nay tôi ra siêu thị mua đồ',
  'tôi ra siêu thị mua đồ',
]);

// 20. scenario.create.finance
addExamples('scenario.create.finance', [
  'chiều mai chú ra ngân hàng',
  'chú ra ngân hàng',
]);

fs.writeFileSync(jsonPath, JSON.stringify(dataset, null, 2), 'utf8');
console.log('✅ localBrain.json updated successfully');
