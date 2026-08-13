# 10. Lộ trình MVP

## 1. Nguyên tắc triển khai

- Xây dữ liệu gốc trước tự động hóa email để matcher có candidate/application đáng tin cậy.
- Mỗi phase phải có dữ liệu nhập, quyền, audit, test và runbook tối thiểu; không dồn bảo mật về cuối.
- Phát hành theo vertical slice dùng được, không xây xong toàn bộ backend rồi mới làm CMS.

## 2. Phase 0 — Nền tảng

**Mục tiêu:** tạo đường ray kỹ thuật an toàn.

- Repository, CI/CD, môi trường dev/staging/production.
- SSO/MFA, user/team/role/scope.
- Khung catalog có version cho ngành, nghề, tuyến visa, bộ trường và template; chưa cần bật toàn bộ ngành ngay Phase 0.
- PostgreSQL migration, Redis queue, object storage private.
- Audit framework, observability, backup và restore thử nghiệm đầu tiên.
- Design system và layout CMS cơ bản.

**Gate:** đăng nhập theo scope, health/metrics, migration và restore mẫu đều có bằng chứng chạy.

## 3. Phase 1A — Tuyển dụng cốt lõi

**Mục tiêu:** thay thế danh sách rời rạc bằng nguồn dữ liệu chung.

- Client, contact, job order.
- Candidate, liên hệ, hồ sơ năng lực đa ngành, owner, dedupe và Excel/CSV import có preview.
- JobOrder gắn ngành/nghề/tuyến visa; Application lưu snapshot yêu cầu, nhiều vòng interview, câu hỏi theo ngành, kết quả và status history.
- Saved views: tiềm năng, chờ PV, đã PV, trúng tuyển.
- Candidate 360 bản đầu, task/follow-up và audit.

**Gate:** chạy được E2E một candidate có nhiều profile nghề → hai applications thuộc hai đơn hàng → yêu cầu một đơn thay đổi nhưng snapshot cũ được giữ → nhiều vòng PV → một kết quả đỗ; các view “Chờ PV/Đã PV” đúng khi có vòng tiếp theo và quyền đội không rò rỉ.

## 4. Phase 1B — Email chung cốt lõi

**Mục tiêu:** ngay sau khi định danh candidate/application ổn định, đưa kênh giao tiếp chính của ứng viên vào CMS.

- Kết nối đúng một hộp thư chung, template/version, outbox dispatcher và queue gửi.
- Gửi từ candidate/application; nhận reply, body, timestamp, headers và attachment.
- Matcher theo reply token, Message-ID/provider thread; email mơ hồ vào `Needs Review`.
- Shared Inbox tối thiểu: unread, needs review, failed/bounced, quarantine.
- Idempotent ingest/send, audit đọc/gửi/tải/ghép và cảnh báo mất kết nối.

**Gate:** gửi/reply end-to-end bằng mailbox staging, retry không gửi trùng, webhook/poller trùng không tạo message trùng và email mơ hồ không tự ghép.

## 5. Phase 2 — Lộ trình cung ứng sang Nhật

**Mục tiêu:** quản lý đầy đủ sau trúng tuyển.

- SupplyJourneyTemplate có version theo nơi cư trú, tuyến visa, trường hợp tuyển mới/chuyển việc và tùy chọn ngành/nghề.
- Supply Journey và milestones được sinh theo template: xác nhận nhận việc/hợp đồng-hồ sơ/COE/visa hoặc đổi tư cách/chuẩn bị-kế hoạch xuất cảnh/tiếp nhận/hoàn tất cung ứng khi áp dụng.
- Checklist, due date, blocker, task tự sinh.
- Document metadata, upload private, signed URL, version và malware scan.
- Dashboard quá hạn và báo cáo hành trình.

**Gate:** chạy được cả tuyển mới từ Việt Nam và chuyển việc trong Nhật; mỗi journey chỉ có milestone áp dụng, hoàn tất với bằng chứng/tài liệu và audit; thay đổi kế hoạch, tuyến visa hoặc nộp lại không làm mất lịch sử.

## 6. Phase 3 — Hoàn thiện Email Hub và tự động hóa có kiểm soát

**Mục tiêu:** hợp nhất trao đổi chính danh và phản hồi vào hồ sơ.

- Ma trận thông báo đầy đủ cho phỏng vấn, yêu cầu hồ sơ, COE/visa, đào tạo, kế hoạch xuất cảnh và tiếp nhận.
- Reminder được duyệt, SLA xử lý reply, template approval và báo cáo vận hành email.
- Hoàn thiện xử lý auto-reply, forward/CC/BCC, delayed bounce, inline image/CID và HTML sanitization.
- Tối ưu matcher từ dữ liệu thực; vẫn giữ human confirmation cho thay đổi nghiệp vụ.

**Gate:** gửi/reply end-to-end bằng mailbox staging, không gửi trùng khi retry, email mơ hồ không tự ghép.

## 7. Phase 4 — Báo cáo và tối ưu

**Mục tiêu:** giúp quản lý ra quyết định và chuẩn bị tăng tải.

- Funnel, source, client/order, team, stage duration và SLA.
- Breakdown theo ngành, nghề, tuyến visa, nơi cư trú và Journey Template với mẫu số rõ ràng.
- Aggregate table/cache cho report nặng.
- Load test với dataset gần production; index/query tuning.
- Hoàn thiện vận hành, DR drill và security review trước go-live.

## 8. Nguyên tắc thứ tự

Phase 1B là bắt buộc vì ứng viên chỉ giao tiếp qua email. Không trì hoãn lưu vết email đến sau toàn bộ lộ trình cung ứng; đồng thời cũng không kết nối mailbox production trước khi candidate ID, application model, permission và audit của Phase 1A ổn định.

## 9. Definition of Done cho mỗi feature

- Yêu cầu và acceptance criteria được duyệt.
- API/UI/DB migration hoàn chỉnh, không placeholder.
- Unit/integration/E2E phù hợp đạt.
- Permission allow/deny được kiểm tra.
- Audit, logging, metrics và error handling có đủ.
- Tài liệu và runbook cập nhật.
- UAT có bằng chứng và không còn lỗi chặn phát hành.

## 10. Việc cần chốt để lập kế hoạch chi tiết

1. Danh sách trường hồ sơ và tài liệu bắt buộc.
2. Danh mục ngành/nghề/tuyến visa triển khai đầu tiên, bộ trường/chứng chỉ và Journey Template tương ứng.
3. Cơ cấu đội/phòng ban và ma trận quyền action-level.
4. Provider email, địa chỉ hộp thư chung và chính sách retention.
5. Mẫu báo cáo ưu tiên cùng định nghĩa KPI.
6. Ngân sách hạ tầng, topology một hay hai máy chủ, RPO/RTO chính thức.
7. Nguồn dữ liệu hiện tại và kế hoạch làm sạch/import.
