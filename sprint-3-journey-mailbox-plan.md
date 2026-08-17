# Sprint 3 — Lộ trình cung ứng và Hộp thư chung

status: approved

## Mục tiêu

Hoàn thiện hai khu vực nghiệp vụ sau khi ứng viên trúng tuyển: theo dõi lộ trình cung ứng nhân sự sang Nhật và xử lý giao tiếp qua một hộp thư chung chính danh.

## Trong phạm vi

- Hợp đồng OpenAPI, generated types, fixture và MSW cho journey/mailbox.
- Danh sách, drawer, trang chi tiết, mốc công việc, bằng chứng, blocker/waiver và trường xuất cảnh tùy chọn.
- Inbox, thread bất biến, soạn thư, template, trạng thái gửi bất đồng bộ, unmatched review, quarantine và optimistic conflict.
- Unit test, E2E critical path, lint/typecheck/build và runtime local.

## Ngoài phạm vi

- Kết nối Microsoft 365/Google Workspace/SMTP thật.
- Database/NestJS persistence thật, scheduler/poller production và candidate portal.
- Flight tracker độc lập hoặc logic hoàn tất journey dựa riêng vào chuyến bay.

## Tiêu chí nghiệm thu

- Một Candidate không thể có hai journey `ACTIVE`/`ON_HOLD`.
- `BLOCKED`, `NOT_APPLICABLE`, `WAIVED` có lý do phù hợp; waiver yêu cầu quyền và người duyệt.
- Milestone xuất cảnh chỉ hiện với template có mốc tương ứng.
- Email đã gửi/nhận không sửa được; unmatched phải liên kết thủ công; attachment `QUARANTINED` không có link tải.
- Gửi thư trả về `QUEUED`, dùng idempotency key và chặn khi thread đã có message mới.
- Các route mới có loading/empty/error/permission và không dùng icon/màu làm trạng thái duy nhất.

## Kế hoạch thực thi

- [x] Contract, domain, fixtures và MSW handlers.
- [x] Journey list/detail/milestone workflow.
- [x] Mailbox list/thread/composer/safety workflow.
- [x] Unit/E2E và cập nhật backlog.
- [x] Quality gate và runtime.
