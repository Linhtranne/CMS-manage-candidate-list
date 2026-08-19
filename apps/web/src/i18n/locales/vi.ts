export const vi = {
  common: {
    brand: {
      name: 'Candidate Supply',
      cmsName: 'Candidate Supply CMS'
    },
    metadata: {
      description: 'CMS nội bộ quản lý tuyển dụng và cung ứng nhân sự sang Nhật'
    },
    a11y: {
      skipToContent: 'Bỏ qua đến nội dung chính'
    },
    actions: {
      save: 'Lưu',
      cancel: 'Hủy',
      close: 'Đóng',
      retry: 'Thử lại',
      addCandidate: 'Thêm ứng viên',
      logout: 'Đăng xuất'
    },
    greeting: 'Xin chào, {name}',
    files: {
      one: '{count} tệp',
      other: '{count} tệp'
    },
    fallbackOnly: 'Nội dung dự phòng',
    states: {
      loading: 'Đang tải dữ liệu',
      noResults: 'Không tìm thấy kết quả phù hợp'
    },
    language: {
      label: 'Ngôn ngữ'
    },
    user: {
      internalStaff: 'Nhân viên nội bộ'
    },
    search: {
      label: 'Tìm kiếm toàn hệ thống',
      placeholder: 'Tìm ứng viên, khách hàng, đơn hàng',
      results: 'Kết quả tìm kiếm',
      loading: 'Đang tìm kiếm',
      empty: 'Không tìm thấy kết quả'
    },
    notifications: {
      title: 'Thông báo',
      hasNew: 'Có thông báo mới',
      list: 'Danh sách thông báo',
      markRead: 'Đánh dấu đã xem',
      tones: {
        danger: 'Cần chú ý',
        warning: 'Sắp đến hạn',
        info: 'Mới'
      },
      items: {
        scheduleTitle: 'Ứng viên cần xác nhận lịch',
        scheduleDetail: '{name} · trong 15 phút',
        emailTitle: 'Email mới chưa ghép',
        emailDetail: '1 thư trong hộp thư chung · hôm nay',
        journeyTitle: 'Lộ trình có mốc sắp quá hạn',
        journeyDetail: '{name} · ngày mai'
      }
    }
  },
  auth: {
    login: {
      title: 'Đăng nhập CMS',
      staffOnly: 'Chỉ dành cho nhân viên nội bộ.',
      email: 'Email công việc',
      password: 'Mật khẩu',
      submitting: 'Đang đăng nhập…',
      submit: 'Đăng nhập',
      connectionError: 'Không thể kết nối hệ thống. Vui lòng thử lại.'
    },
    sessionExpired: {
      title: 'Phiên làm việc đã hết hạn',
      description: 'Vui lòng đăng nhập lại để tiếp tục quản lý ứng viên.',
      loginAgain: 'Đăng nhập lại'
    },
    forbidden: {
      title: 'Bạn không có quyền truy cập',
      description: 'Nếu cần quyền bổ sung, hãy liên hệ quản trị hệ thống.',
      backToWork: 'Về việc của tôi'
    },
    checkingSession: 'Đang kiểm tra phiên đăng nhập',
    sessionUnavailable: 'Phiên làm việc không khả dụng. Vui lòng đăng nhập lại hoặc thử lại.'
  },
  navigation: {
    ariaLabel: 'Điều hướng CMS',
    internalCms: 'CMS nội bộ',
    openMobile: 'Mở điều hướng',
    work: 'Việc của tôi',
    clients: 'Khách hàng',
    orders: 'Đơn tuyển',
    candidates: 'Ứng viên',
    applications: 'Ứng tuyển & Phỏng vấn',
    journeys: 'Lộ trình cung ứng',
    mailbox: 'Hộp thư chung',
    reports: 'Báo cáo',
    admin: 'Quản trị'
  },
  validation: {},
  work: {},
  clients: {},
  orders: {},
  candidates: {},
  applications: {},
  journeys: {},
  mailbox: {},
  reports: {},
  admin: {}
} as const;
