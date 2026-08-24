/**
 * Maps Firebase Auth and Firestore error codes to friendly Vietnamese messages
 */
export function mapFirebaseAuthError(error: unknown): string {
  if (!error) return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';

  const code = (error as { code?: string })?.code || '';
  const message = (error as Error)?.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Email chưa đúng định dạng. Chú vui lòng kiểm tra lại.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng. Chú có thể đăng nhập hoặc dùng email khác.';
    case 'auth/weak-password':
      return 'Mật khẩu chưa đủ mạnh. Vui lòng nhập tối thiểu 6 ký tự.';
    case 'auth/network-request-failed':
      return 'Không thể kết nối mạng. Bạn vẫn có thể tiếp tục dùng Lovira ở chế độ trên thiết bị.';
    case 'auth/too-many-requests':
      return 'Có quá nhiều lần thử đăng nhập không thành công. Vui lòng thử lại sau ít phút.';
    case 'auth/popup-closed-by-user':
      return 'Cửa sổ đăng nhập đã được đóng lại trước khi hoàn tất.';
    case 'auth/popup-blocked':
      return 'Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để đăng nhập.';
    case 'auth/requires-recent-login':
      return 'Vì lý do bảo mật, vui lòng đăng nhập lại trước khi thực hiện thao tác này.';
    case 'auth/user-disabled':
      return 'Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ hỗ trợ.';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập này chưa được kích hoạt trên hệ thống.';
    case 'auth/expired-action-code':
      return 'Mã xác nhận hoặc liên kết đã hết hạn.';
    case 'auth/invalid-action-code':
      return 'Mã xác nhận không hợp lệ.';
    default:
      if (message.includes('popup')) {
        return 'Cửa sổ đăng nhập bị gián đoạn. Vui lòng thử lại.';
      }
      if (message.includes('network') || message.includes('offline')) {
        return 'Không thể kết nối máy chủ. Bạn vẫn có thể sử dụng dữ liệu cục bộ bình thường.';
      }
      return 'Không thể thực hiện đăng nhập lúc này. Bạn vẫn có thể dùng Lovira trên thiết bị.';
  }
}

export function mapFirestoreError(error: unknown): string {
  if (!error) return 'Lỗi truy xuất cơ sở dữ liệu.';

  const code = (error as { code?: string })?.code || '';
  const message = (error as Error)?.message || '';

  if (code === 'permission-denied' || message.includes('permission-denied')) {
    return 'Bạn không có quyền truy cập dữ liệu này hoặc phiên làm việc đã hết hạn.';
  }
  if (code === 'unavailable' || message.includes('offline') || message.includes('client is offline')) {
    return 'Hiện không có kết nối mạng. Dữ liệu đang được giữ an toàn trên thiết bị.';
  }
  if (code === 'not-found') {
    return 'Dữ liệu không tồn tại trên đám mây.';
  }
  return 'Lỗi đồng bộ dữ liệu đám mây.';
}
