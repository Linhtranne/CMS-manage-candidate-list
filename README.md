# Japan Candidate Supply CMS

Hồ sơ thiết kế cho CMS nội bộ quản lý tuyển dụng và cung ứng ứng viên đa ngành sang Nhật Bản. Hệ thống theo dõi từ nguồn ứng viên, ứng tuyển, phỏng vấn, trúng tuyển đến quá trình doanh nghiệp Nhật tiếp nhận; ứng viên không đăng nhập CMS và chỉ giao tiếp qua email.

## Trạng thái hiện tại

- Phiên bản tài liệu: **Design Baseline 1.2**.
- Repository hiện chỉ bàn giao **tài liệu thiết kế** và **bản trình bày HTML độc lập**.
- Chưa có mã nguồn Next.js/NestJS, database migration, API chạy thật hoặc môi trường production.
- Danh mục ngành/nghề/visa và các Journey Template ban đầu vẫn cần business owner phê duyệt trước khi khóa schema.

## Các quyết định cốt lõi

- CMS chỉ dành cho nhân viên nội bộ; ứng viên không có tài khoản hoặc portal.
- Hỗ trợ đa ngành bằng catalog `IndustrySector`, `Occupation` và `VisaRoute`; IT chỉ là một ngành cấu hình.
- Một người có một `Candidate`, nhiều hồ sơ nghề và nhiều `Application` theo đơn hàng.
- `Candidate`, `Application`, `Interview` và `SupplyJourney` là các lớp dữ liệu tách biệt.
- MVP dùng một hộp thư doanh nghiệp chung; CMS lưu nội dung, thời gian, tệp đính kèm và lịch sử phản hồi.
- Supply Journey quản lý quá trình cung ứng nhân sự, không phải hệ thống quản lý chuyến bay.
- Kiến trúc mục tiêu là modular monolith chạy trên Ubuntu Server bằng Docker Compose.

## Xem nhanh

1. Đọc [Tổng quan hồ sơ](./docs/00-tong-quan.md).
2. Mở [bản trình bày HTML](./presentation/candidate-cms-presentation.html) bằng trình duyệt.
3. Dùng `←` / `→`, `Page Up` / `Page Down`, `Home` / `End` để điều khiển slide.
4. Dùng nút **Trình chiếu** để bật toàn màn hình hoặc `Ctrl+P` để in/xuất PDF ngang.

Bản trình bày là một file HTML tự chứa, không tải thư viện hoặc tài nguyên từ Internet. Font **Be Vietnam Pro** đã được nhúng trực tiếp để hiển thị tiếng Việt ổn định trên máy trình chiếu.

## Bộ tài liệu

| Mã | Tài liệu | Nội dung chính |
|---:|---|---|
| 00 | [Tổng quan](./docs/00-tong-quan.md) | Mục tiêu, phạm vi và bản đồ tài liệu |
| 01 | [Yêu cầu nghiệp vụ](./docs/01-yeu-cau-nghiep-vu.md) | Chức năng, quy tắc và ranh giới sản phẩm |
| 02 | [Vòng đời ứng viên](./docs/02-vong-doi-ung-vien.md) | Candidate, Application, Interview và Supply Journey |
| 03 | [Kiến trúc và stack](./docs/03-kien-truc-va-stack.md) | Kiến trúc logic và công nghệ mục tiêu |
| 04 | [Mô hình dữ liệu](./docs/04-mo-hinh-du-lieu.md) | Thực thể, quan hệ và nguồn sự thật |
| 05 | [Email Hub](./docs/05-email-hub.md) | Gửi, nhận, ghép phản hồi và lưu tệp |
| 06 | [Phân quyền và bảo mật](./docs/06-phan-quyen-bao-mat.md) | Action, scope, dữ liệu nhạy cảm và audit |
| 07 | [Thiết kế CMS](./docs/07-thiet-ke-cms.md) | Màn hình, thao tác và báo cáo |
| 08 | [Vận hành Ubuntu](./docs/08-van-hanh-ubuntu.md) | Topology, backup, restore và monitoring |
| 09 | [Kiểm thử và nghiệm thu](./docs/09-kiem-thu-nghiem-thu.md) | Acceptance criteria và chất lượng |
| 10 | [Lộ trình MVP](./docs/10-lo-trinh-mvp.md) | Thứ tự triển khai và gate từng phase |
| 11 | [Từ điển dữ liệu](./docs/11-tu-dien-du-lieu.md) | Trường, enum, snapshot và ràng buộc |
| 12 | [Ma trận email](./docs/12-ma-tran-email-thong-bao.md) | Sự kiện, template, phê duyệt và reply |
| 13 | [Hợp đồng API/UI](./docs/13-hop-dong-chuc-nang.md) | Hành động, endpoint, guard và lỗi |
| 14 | [Quyết định kiến trúc](./docs/14-quyet-dinh-kien-truc.md) | ADR và điều kiện xem xét lại |
| 15 | [Ma trận truy vết](./docs/15-truy-vet-yeu-cau.md) | Yêu cầu gốc, thiết kế và bằng chứng nghiệm thu |

## Chính sách nội dung Git

`.gitignore` được cấu hình theo allowlist. Git chỉ nhận:

- `.gitignore`;
- `README.md`;
- các file Markdown trực tiếp trong `docs/`;
- `presentation/candidate-cms-presentation.html`.

Toàn bộ nội dung khác bị bỏ qua, bao gồm agent/skill cục bộ, script hỗ trợ, file kế hoạch tạm, secrets, dữ liệu ứng viên, import/export, email attachment, backup, database volume, log và build artifact.

Không đưa dữ liệu ứng viên thật, nội dung email, hộ chiếu, credential hoặc backup production vào repository. `.gitignore` chỉ là lớp phòng ngừa nhầm lẫn, không phải cơ chế bảo vệ dữ liệu đã từng commit.

## Các quyết định cần chốt trước khi triển khai

1. Danh mục ngành, nghề, visa route, chứng chỉ và trường chuyên môn ban đầu.
2. Journey Template cho ứng viên ngoài Nhật, đang ở Nhật, chuyển việc và đổi tư cách lưu trú.
3. Provider và địa chỉ hộp thư chung.
4. Cơ cấu đội/phòng ban và ma trận quyền cuối cùng.
5. Topology máy chủ, ngân sách, RPO và RTO chính thức.
6. Nguồn dữ liệu hiện tại và kế hoạch làm sạch/import.
