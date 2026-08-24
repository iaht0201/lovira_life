# Hướng dẫn Cấu hình Firebase Authentication & Firestore cho Lovira

Lovira hỗ trợ cả **Chế độ Trên Thiết Bị (Guest Mode)** và **Tài khoản Đám Mây (Firebase Cloud Sync)**.

---

## 1. Các biến môi trường cần thiết

Thêm các khóa sau vào tệp `.env` hoặc phần cấu hình môi trường:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## 2. Kích hoạt Phương thức Đăng nhập (Firebase Authentication)

1. Mở **Firebase Console** → Chọn Dự án của bạn.
2. Vào mục **Build** → **Authentication** → Tab **Sign-in method**.
3. Bật 2 phương thức:
   - **Email/Password**: Bật và Lưu.
   - **Google**: Bật, chọn email hỗ trợ dự án và Lưu.

---

## 3. Cấu hình Firestore Database

1. Vào mục **Build** → **Firestore Database** → Nhấn **Create database**.
2. Chọn khu vực (Region) gần nhất (ví dụ: `asia-southeast1` - Singapore).
3. Sử dụng tệp `firestore.rules` đã tạo sẵn trong dự án:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
      match /sessions/{sessionId} { allow read, write: if isOwner(userId); }
      match /profile/{profileId} { allow read, write: if isOwner(userId); }
      match /sync/{syncId} { allow read, write: if isOwner(userId); }
    }

    match /{document=**} {
      allow read, write: false;
    }
  }
}
```

---

## 4. Bảo mật dữ liệu & Nguyên tắc Guest-First của Lovira

- **Chế độ Khách (Guest)**: Mọi thao tác ghi chú, tạo phiên công việc và tùy chỉnh trợ năng đều hoạt động bình thường trên thiết bị mà không bắt buộc phải đăng nhập.
- **Đồng bộ đám mây**: Khi người dùng đăng nhập tài khoản, họ có quyền chọn bật/tắt đồng bộ phiên công việc và đồng bộ hồ sơ.
- **Thông tin sức khỏe & Trợ năng**: Có công tắc bảo mật riêng biệt; chỉ tải lên đám mây khi người dùng bật công tắc "Thông tin sức khỏe & Trợ năng".
