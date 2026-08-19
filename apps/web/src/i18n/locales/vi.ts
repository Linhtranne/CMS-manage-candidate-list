export const vi = {
  common: {
    actions: {
      save: 'Lưu',
      cancel: 'Hủy',
      close: 'Đóng',
      retry: 'Thử lại',
      addCandidate: 'Thêm ứng viên'
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
    }
  },
  auth: {},
  navigation: {
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
