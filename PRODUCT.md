# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Frontend: Next.js + TypeScript.
- Backend: NestJS + TypeScript, REST API `/api/v1` và OpenAPI.
- Dữ liệu và tác vụ nền: PostgreSQL, Prisma, Redis/BullMQ, MinIO hoặc S3-compatible.
- Triển khai: Docker Compose trên Ubuntu Server, Web/API/Worker tách tiến trình.

## Users

Người dùng chính là **nhân viên Kinh doanh/Tuyển dụng nội bộ**. Họ làm việc hằng ngày theo danh sách: tìm và cập nhật ứng viên, ghép đơn hàng, theo dõi phỏng vấn, xử lý email, xác định owner và hành động tiếp theo.

Các vai trò hỗ trợ:

- **Điều phối Nhật:** quản lý hồ sơ, COE/visa, chuẩn bị, bàn giao và mốc tiếp nhận sau trúng tuyển.
- **Quản lý:** phân công, duyệt ngoại lệ, theo dõi SLA, funnel và hiệu suất đội.
- **Quản trị hệ thống:** quản lý tài khoản, quyền và cấu hình; không mặc định được đọc dữ liệu nghiệp vụ.

Ứng viên không phải người dùng CMS, không có tài khoản và chỉ nhận/phản hồi qua email.

## Product Purpose

CMS tạo một nguồn dữ liệu thống nhất cho bộ phận kinh doanh tuyển dụng và cung ứng nhân sự đa ngành sang Nhật, từ ứng viên tiềm năng đến khi doanh nghiệp Nhật tiếp nhận. Sản phẩm phải giúp nhân viên biết nhanh ứng viên là ai, đang tham gia đơn hàng nào, ai chịu trách nhiệm, việc tiếp theo là gì, lộ trình cung ứng đang vướng ở đâu và toàn bộ trao đổi/bằng chứng nằm ở đâu.

Thành công nghĩa là giảm thất lạc hồ sơ, email và tài liệu; mỗi ứng viên/ứng tuyển có owner và bước tiếp theo rõ ràng; trạng thái phỏng vấn và cung ứng phản ánh đúng lịch sử; báo cáo có mẫu số đúng; thao tác nhạy cảm được phân quyền và audit.

## Positioning

Đây là **Candidate Operations CMS/ATS-lite đa ngành dành cho cung ứng nhân sự sang Nhật**, không phải CRM bán hàng, HRM hay cổng ứng viên. Điểm khác biệt cốt lõi là kết hợp một hồ sơ Candidate gốc, nhiều Application theo đơn hàng, Supply Journey theo bối cảnh cư trú/visa và một Shared Inbox chính danh có lưu vết, trong khi các quyết định nghiệp vụ quan trọng vẫn do nhân viên xác nhận.

## Operating Context

- Quy mô thiết kế ban đầu: đến khoảng 100.000 ứng viên và 200 nhân viên nội bộ; đây chưa phải cam kết capacity trước load test.
- Giao diện desktop-first, thao tác được trên tablet; hoạt động chính diễn ra trong giờ làm việc tại bộ phận Kinh doanh/Tuyển dụng và Điều phối Nhật.
- Dữ liệu có thể bắt đầu từ bảng tính/CSV và cần preview, mapping, phát hiện trùng, review lỗi trước khi nhập.
- Nhân viên làm việc qua saved views, Candidate 360, timeline phỏng vấn, Supply Journey, Shared Inbox, task và báo cáo quản trị.
- MVP dùng đúng một hộp thư doanh nghiệp chung. Reply, body, timestamp, attachment, trạng thái gửi và quyết định ghép đều phải lưu vết.
- Danh mục ngành, nghề, tuyến visa, trường chuyên môn, câu hỏi và Journey Template được quản trị có version; IT chỉ là một ngành cấu hình.

## Capabilities and Constraints

- Một người tương ứng một `Candidate`; ứng tuyển nhiều đơn hàng tạo nhiều `Application`, không nhân bản hồ sơ gốc.
- “Tiềm năng”, “Chờ phỏng vấn”, “Đã phỏng vấn” và “Đã trúng tuyển” là saved views từ thực thể/trạng thái đúng, không phải các bảng dữ liệu độc lập.
- Supply Journey quản lý quá trình cung ứng đến tiếp nhận, không phải hệ thống theo dõi chuyến bay. Dữ liệu bay chỉ là trường tùy chọn của mốc kế hoạch xuất cảnh.
- Email không chắc chắn phải vào hàng chờ xử lý; email đến không tự đổi kết quả phỏng vấn, visa hoặc trạng thái cung ứng.
- Hành động nhạy cảm tuân theo `role × action × data scope × sensitivity`, có audit append-only và bảo vệ PII.
- Không thuộc baseline: portal ứng viên, payroll/HRM, CRM doanh thu/công nợ, AI tự quyết định đỗ/trượt, microservices, Kubernetes và data warehouse riêng.
- Tìm kiếm/list thường dùng có mục tiêu phản hồi dưới 2 giây ở tải danh định; mọi list dùng phân trang server-side.
- Trước production phải chốt provider/hộp thư, SPF/DKIM/DMARC, retention, privacy notice, quy tắc chia sẻ dữ liệu sang Nhật, permission matrix, catalog ban đầu và Journey Template.

Các quyết định còn mở:

- trường và tài liệu bắt buộc cho hồ sơ/milestone;
- catalog ngành/nghề/visa và Journey Template của đợt đầu;
- quyền action-level cuối cùng và người có thẩm quyền duyệt các quyết định nhạy cảm;
- provider email, địa chỉ hộp thư, retention và giới hạn attachment;
- KPI mục tiêu sau khi có baseline dữ liệu thực;
- có cần giao diện quản trị song ngữ Việt/Nhật ngay MVP hay ở giai đoạn sau.

## Brand Commitments

Tên làm việc hiện tại là **Japan Candidate Supply CMS**. Nội dung nghiệp vụ và tài liệu dành cho nhân viên Việt Nam được viết ưu tiên bằng tiếng Việt. Chưa có bộ nhận diện thương hiệu ứng dụng, logo hoặc hệ thống hình ảnh được xác nhận; công việc thiết kế sau `init` không được tự coi phong cách của bản trình bày là brand bắt buộc.

## Evidence on Hand

- Bộ tài liệu nguồn sự thật từ `docs/00-tong-quan.md` đến `docs/15-truy-vet-yeu-cau.md`.
- Gói backend production tại `docs/backend/README.md`: contract, kiến trúc, IAM, dữ liệu, module, security, operations, testing, decision register, traceability, DoD và kế hoạch Phase 0–4; trạng thái `ready_for_human_approval`.
- Bản trình bày tự chứa tại `presentation/candidate-cms-presentation.html`, dùng để truyền đạt baseline chứ chưa phải giao diện sản phẩm.
- Sprint 0 đã có code Next.js frontend, route `/work`, health route, OpenAPI client, MSW fixture và Docker runtime smoke test. Chưa có backend NestJS/Prisma chạy thật, dữ liệu production, nghiên cứu người dùng, analytics sử dụng hoặc KPI baseline.
- Các lựa chọn provider/SSO/privacy/retention/topology/KPI vẫn cần đúng owner phê duyệt theo `docs/backend/12-decision-register.md`; tài liệu không tự biến các quyết định đó thành approved.
- Chưa có logo, ảnh thương hiệu, testimonial, danh sách khách hàng công khai hoặc số liệu hiệu quả được phép dùng. Thiết kế không được tự tạo các bằng chứng này.

## Product Principles

1. **Action-first, list-first:** ưu tiên việc cần làm, owner, hạn và bước tiếp theo hơn dashboard trang trí.
2. **Một người, một hồ sơ gốc:** mọi màn hình phải làm rõ ranh giới Candidate, Application, Interview và Supply Journey.
3. **Không đoán thay nghiệp vụ:** dữ liệu mơ hồ cần review; quyết định quan trọng cần người có quyền xác nhận.
4. **Lưu vết trước, tự động hóa sau:** trạng thái, email, tài liệu, override và hành động nhạy cảm phải giải thích được.
5. **Đa ngành trên một lõi nhất quán:** mở rộng bằng catalog/schema có version, không tách pipeline tùy tiện theo ngành.

## Accessibility & Inclusion

- Hỗ trợ điều hướng bàn phím, focus rõ ràng và nhãn có thể hiểu ngoài ngữ cảnh.
- Không dùng màu hoặc icon làm tín hiệu trạng thái duy nhất; trạng thái luôn có nhãn chữ, icon chỉ hỗ trợ khi thực sự cần.
- Hạn chế icon và ký hiệu trang trí; không dùng emoji, cờ hoặc máy bay làm ngôn ngữ điều hướng/nghiệp vụ.
- Tôn trọng `prefers-reduced-motion`, hỗ trợ zoom và layout tablet mà không mất thao tác cốt lõi.
- Nội dung tiếng Việt phải rõ, nhất quán thuật ngữ và không phụ thuộc kiến thức kỹ thuật.
- Chuẩn WCAG mục tiêu cụ thể chưa được phê duyệt; phải chốt trước gate phát hành giao diện production.
