# 09. Kiểm thử và tiêu chí nghiệm thu

## 1. Chiến lược kiểm thử

| Lớp | Mục tiêu |
|---|---|
| Unit | Luật chuyển trạng thái, dedupe, quyền, template và matcher |
| Integration | PostgreSQL constraints, outbox, queue, object storage, adapter email |
| API contract | Request/response, error code, pagination và backward compatibility |
| E2E | Luồng ứng viên → ứng tuyển → trúng tuyển → hành trình → email |
| Security | Negative authorization, export/download, upload độc hại, rate limit |
| Performance | List/search, import, report, queue email và concurrent users |
| Recovery | Restore DB + object, retry/DLQ, rollback deployment |

Test logic thuần dùng unit test/factory nhỏ; constraint, transaction và permission chạy integration test với PostgreSQL/Redis/object storage thật trong môi trường cô lập. Provider email được kiểm bằng contract test và fake adapter có hành vi timeout/bounce/webhook trùng; không mock chính code nghiệp vụ đang được kiểm thử. E2E chỉ giữ các critical path để tránh chậm/flaky.

## 2. Kịch bản nghiệm thu nghiệp vụ

### AC-01 — Một ứng viên tham gia nhiều đơn hàng

**Given** một candidate đã tồn tại.  
**When** nhân viên tạo application cho hai job order.  
**Then** hệ thống có một candidate, hai applications và trạng thái độc lập.

### AC-02 — Phát hiện hồ sơ trùng

**Given** email/điện thoại chuẩn hóa đã thuộc candidate.  
**When** nhập hồ sơ mới có tín hiệu trùng.  
**Then** hệ thống cảnh báo hoặc tạo review case, không âm thầm tạo/merge.

### AC-03 — Nhiều vòng phỏng vấn

**Given** application đang chờ phỏng vấn.  
**When** hoàn tất vòng một và tạo vòng hai.  
**Then** lưu đủ lịch sử và feedback từng vòng; application vẫn `IN_INTERVIEW_PROCESS`, view “Đã phỏng vấn” vẫn có bản ghi và view “Chờ phỏng vấn” có bản ghi khi vòng hai ở trạng thái `SCHEDULED`.

### AC-04 — Tạo lộ trình cung ứng sau khi đỗ

**Given** application được xác nhận `PASSED`.  
**When** điều phối khởi tạo Supply Journey.  
**Then** chỉ có tối đa một lộ trình hiệu lực và có các milestone chuẩn từ xác nhận nhận việc đến doanh nghiệp Nhật tiếp nhận/hoàn tất cung ứng; không bắt buộc thực thể chuyến bay riêng.

### AC-05 — Gửi email không trùng

**Given** người dùng nhấn gửi một lần nhưng worker retry do timeout.  
**When** job được xử lý lại.  
**Then** provider chỉ nhận một email logic và CMS lưu toàn bộ lần thử.

### AC-06 — Tự động ghi nhận phản hồi

**Given** ứng viên reply email do CMS gửi.  
**When** webhook/poller nhận message.  
**Then** nội dung, thời gian, header liên quan và attachment được lưu vào đúng conversation.

### AC-07 — Email không xác định

**Given** email đến không có reply token/thread ID và khớp nhiều candidate.  
**When** matcher chạy.  
**Then** email vào `Needs Review`, không tự ghép đoán.

### AC-08 — Email không tự đổi trạng thái

**Given** body có nội dung giống “tôi đồng ý” hoặc “đã có visa”.  
**When** message được lưu.  
**Then** hệ thống chỉ tạo tín hiệu/tác vụ; trạng thái nghiệp vụ không đổi nếu chưa có người xác nhận.

### AC-09 — Tệp đính kèm không an toàn

**Given** attachment chưa scan hoặc bị phát hiện độc hại.  
**When** người dùng cố tải.  
**Then** hệ thống từ chối và ghi audit.

### AC-10 — Phạm vi dữ liệu

**Given** recruiter đội A.  
**When** gọi trực tiếp API candidate đội B.  
**Then** hệ thống trả lỗi phù hợp và không rò rỉ metadata.

### AC-11 — Admin không mặc định đọc nội dung

**Given** tài khoản chỉ có vai trò quản trị cấu hình.  
**When** mở body email hoặc tài liệu candidate.  
**Then** hệ thống từ chối trừ khi được cấp thêm quyền nghiệp vụ.

### AC-12 — Khôi phục

**Given** snapshot DB và object backup hợp lệ.  
**When** diễn tập restore vào môi trường cô lập.  
**Then** dữ liệu, attachment checksum và liên kết hồ sơ đạt đối soát trong RTO được duyệt.

### AC-13 — Webhook email trùng

**Given** provider gửi cùng một message qua webhook hai lần.  
**When** ingest xử lý bằng khóa `(provider, mailbox_id, provider_message_id)`.  
**Then** chỉ tồn tại một `EmailMessage`, còn các lần nhận được ghi metric/audit kỹ thuật phù hợp.

### AC-14 — Poller bắt kịp sau gián đoạn

**Given** webhook dừng một khoảng thời gian nhưng mailbox vẫn nhận email.  
**When** poller chạy lại từ cursor/watermark đã lưu.  
**Then** mọi message còn thiếu được nhập đúng một lần và sync lag trở về ngưỡng bình thường.

### AC-15 — Chống vòng lặp tự động trả lời

**Given** mailbox nhận out-of-office, mailer-daemon hoặc message do chính mailbox gửi.  
**When** rule xử lý tự động chạy.  
**Then** hệ thống không phát sinh chuỗi reply tự động vô hạn và đưa ngoại lệ cần thiết vào hàng đợi phù hợp.

### AC-16 — Hiển thị HTML email an toàn

**Given** body HTML chứa script, event handler, tracking image hoặc URL nguy hiểm.  
**When** nhân viên mở email trong CMS.  
**Then** nội dung đã sanitize, script không chạy, remote tracking bị chặn mặc định và plain text vẫn đọc được.

### AC-17 — Import Excel/CSV lặp lại và export an toàn

**Given** cùng file Excel/CSV được import lại và có ô bắt đầu bằng ký tự công thức bảng tính.  
**When** import/export chạy.  
**Then** hệ thống không âm thầm tạo candidate trùng, sinh review case khi cần và escape dữ liệu chống CSV formula injection.

### AC-18 — Ghi đồng thời

**Given** hai nhân viên mở cùng một candidate/application ở cùng phiên bản.  
**When** người thứ hai lưu sau khi người thứ nhất đã cập nhật.  
**Then** API trả conflict có thể xử lý, không ghi đè im lặng và UI cho phép tải lại/so sánh.

### AC-19 — Token mailbox hết hạn

**Given** OAuth token hoặc webhook subscription sắp hết hạn/hết hạn.  
**When** scheduler kiểm tra kết nối.  
**Then** hệ thống gia hạn nếu có thể, cảnh báo đúng owner nếu thất bại và poller catch-up sau khi khôi phục.

### AC-20 — Ngoại lệ lộ trình cung ứng

**Given** COE/visa phải nộp lại hoặc ứng viên thay đổi kế hoạch sau trúng tuyển.  
**When** điều phối cập nhật milestone thành `BLOCKED`/mở attempt mới.  
**Then** lịch sử cũ được giữ, deadline/task mới được tạo có owner và báo cáo không ghi nhận nhầm là hoàn tất cung ứng.

### AC-21 — Chuyển owner

**Given** candidate được chuyển từ đội A sang đội B.  
**When** quản lý xác nhận bàn giao.  
**Then** quyền và task được tính lại theo chính sách, owner cũ không giữ quyền riêng ngoài scope và sự kiện được audit.

### AC-22 — Một ứng viên có nhiều hồ sơ nghề

**Given** một Candidate có kinh nghiệm ở hai nghề thuộc hai ngành khác nhau.  
**When** nhân viên cập nhật kỹ năng/chứng chỉ của một profile.  
**Then** hồ sơ gốc vẫn là một Candidate, profile còn lại không bị ghi đè và tìm kiếm theo cả hai nghề trả đúng kết quả.

### AC-23 — Snapshot yêu cầu đơn hàng

**Given** Application được tạo từ JobOrder version 3.  
**When** khách hàng thay đổi JLPT, kỹ năng hoặc tuyến visa của JobOrder lên version 4.  
**Then** Application cũ vẫn hiển thị snapshot version 3; application mới dùng version 4 và báo cáo không viết lại lịch sử.

### AC-24 — Câu hỏi phỏng vấn theo ngành/nghề

**Given** vòng phỏng vấn đã dùng bộ câu hỏi ngành ở version 2.  
**When** quản trị cập nhật template lên version 3.  
**Then** nội dung đã dùng ở vòng cũ không thay đổi; vòng mới có thể chọn version 3 và audit ghi người thay đổi.

### AC-25 — Journey Template theo trường hợp cung ứng

**Given** một ứng viên tuyển mới từ Việt Nam và một ứng viên đang ở Nhật chuyển việc.  
**When** hai SupplyJourney được khởi tạo.  
**Then** journey đầu có các mốc COE/visa/xuất cảnh phù hợp; journey thứ hai không bị ép qua mốc xuất cảnh và mọi mốc waived có lý do/audit.

## 3. Gate phát hành

- Không còn lỗi lint/type/build.
- Toàn bộ unit, integration, contract và E2E critical path đạt.
- Permission-negative suite đạt 100% kịch bản bắt buộc.
- Migration rehearsal và rollback plan đã kiểm tra trên staging.
- Không có lỗ hổng critical/high chưa có quyết định chấp nhận rủi ro.
- Backup mới và lần restore test còn hiệu lực.
- Monitoring/alert/runbook cho thay đổi mới đã sẵn sàng.
- Product owner và đại diện từng bộ phận ký nghiệm thu UAT.

## 4. Kiểm thử tải trước go-live

Tạo profile theo số liệu thực tế, tối thiểu gồm:

- 200 tài khoản, số concurrent thực đo trong giờ cao điểm.
- 100.000 candidate và tỷ lệ application/interview/supply journey gần production.
- Số conversation/message mỗi candidate mỗi năm, tỷ lệ reply, kích thước/tổng dung lượng attachment và retention gần production.
- Danh sách phân trang, search, filter phức hợp và report phổ biến.
- Filter và báo cáo theo ngành, nghề, tuyến visa, nơi cư trú và Journey Template trên catalog có quy mô gần production.
- Burst gửi/nhận email, attachment lớn trong giới hạn cho phép.
- Queue backlog và worker restart để chứng minh recovery/idempotency.

Không chốt cấu hình CPU/RAM cuối cùng trước khi chạy profile này.
