# 01. Yêu cầu nghiệp vụ và phạm vi

## 1. Mục tiêu kinh doanh

- Giảm thất lạc ứng viên, email và tài liệu giữa các nhân viên.
- Theo dõi được hiệu suất từ nguồn ứng viên đến trúng tuyển và sang Nhật theo ngành, nghề, tuyến visa, khách hàng và đơn hàng.
- Bảo đảm mỗi đơn hàng có danh sách ứng viên, lịch phỏng vấn và kết quả rõ ràng.
- Điều phối đầy đủ lộ trình cung ứng sau trúng tuyển: xác nhận nhận việc, hợp đồng/hồ sơ, COE, visa, chuẩn bị trước xuất cảnh, tiếp nhận và hoàn tất cung ứng.
- Cung cấp bằng chứng giao tiếp chính danh qua hộp thư doanh nghiệp.

## 2. Vai trò nghiệp vụ

| Vai trò | Trách nhiệm chính |
|---|---|
| Kinh doanh/Đối ngoại | Khách hàng Nhật, đơn hàng, yêu cầu tuyển, tiến độ cung ứng |
| Tuyển dụng | Nguồn ứng viên, sàng lọc, ứng tuyển, phỏng vấn, kết quả |
| Điều phối Nhật | Hợp đồng, hồ sơ, COE, visa, đào tạo, kế hoạch xuất cảnh, bàn giao và tiếp nhận |
| Quản lý | Phân công, giám sát SLA, phê duyệt ngoại lệ, báo cáo |
| Quản trị hệ thống | Tài khoản, vai trò, cấu hình; không mặc định đọc dữ liệu nghiệp vụ |

## 3. Phạm vi chức năng

### 3.1 Khách hàng và đơn hàng

- Quản lý doanh nghiệp Nhật, người liên hệ và yêu cầu tuyển.
- Ghi nhận ngành, nghề/vị trí, kỹ năng, tiếng Nhật, tuyến visa chấp nhận, điều kiện tuyển, số lượng, địa điểm, lương tham chiếu, thời hạn và người phụ trách.
- Quản trị danh mục `IndustrySector`, `Occupation` và `VisaRoute`; IT là một ngành trong danh mục, không phải schema riêng.
- Theo dõi số ứng viên được giới thiệu, phỏng vấn, đỗ và đã sang Nhật.

Module này chỉ giữ dữ liệu khách hàng/đơn hàng cần cho cung ứng ứng viên; không mở rộng thành CRM bán hàng, quản lý báo giá, doanh thu hoặc công nợ.

### 3.2 Kho ứng viên

- Tạo, nhập CSV, tìm kiếm và cập nhật hồ sơ ứng viên.
- Phát hiện trùng theo email, số điện thoại và hộ chiếu đã chuẩn hóa.
- Gán nguồn, chủ sở hữu, đội phụ trách, trình độ tiếng Nhật, nơi cư trú hiện tại và tình trạng lưu trú.
- Một Candidate có thể có nhiều hồ sơ năng lực theo nghề, gồm kinh nghiệm, kỹ năng, chứng chỉ, mức xác minh và tài liệu liên quan; các trường chung không bị lặp theo ngành.
- Lưu tài liệu trong kho riêng tư và cấp liên kết tải có thời hạn.

### 3.3 Ứng tuyển và phỏng vấn

- Gắn một ứng viên vào một hoặc nhiều đơn hàng qua hồ sơ ứng tuyển.
- Khi tạo Application, lưu snapshot yêu cầu tuyển quan trọng của JobOrder để lịch sử không thay đổi khi đơn hàng được cập nhật sau đó.
- Hỗ trợ nhiều vòng phỏng vấn, lịch, người tham gia, nhận xét và kết quả.
- Hỗ trợ ngân hàng câu hỏi chung và câu hỏi theo ngành/nghề; câu hỏi được dùng trong một vòng phỏng vấn phải lưu snapshot/version.
- Lưu lịch sử thay đổi trạng thái và người thực hiện.

### 3.4 Lộ trình cung ứng sang Nhật

- Khởi tạo lộ trình từ `SupplyJourneyTemplate` phù hợp với nơi cư trú, tuyến visa, trường hợp tuyển mới/chuyển việc và, khi cần, ngành/nghề.
- Theo dõi xác nhận nhận việc, hợp đồng/giấy tờ, COE, visa, đào tạo trước xuất cảnh, kế hoạch xuất cảnh, đã sang Nhật, doanh nghiệp tiếp nhận và hoàn tất cung ứng.
- Mốc nằm ngoài bối cảnh được bỏ khỏi template hoặc đánh dấu `NOT_APPLICABLE` kèm lý do; `WAIVED` chỉ dùng cho miễn trừ có thẩm quyền đối với mốc vốn phải áp dụng, bắt buộc ghi lý do, người duyệt và audit. Không ép ứng viên đang ở Nhật đi qua toàn bộ luồng xuất cảnh từ Việt Nam.
- Sinh việc cần làm, hạn xử lý, cảnh báo trễ và người phụ trách.
- Cho phép xử lý nộp lại, tạm dừng, rút lui, đổi kế hoạch hoặc blocker mà không làm mất lịch sử.
- Ngày/chặng bay và mã đặt chỗ, nếu cần lưu, chỉ là trường tùy chọn của mốc **Kế hoạch xuất cảnh**, không phải module nghiệp vụ riêng.

### 3.5 Email Hub

- Gửi từ một hộp thư chung với mẫu email được quản lý và chữ ký người xử lý.
- Nhận phản hồi, nội dung, thời gian và tệp đính kèm.
- Liên kết chuỗi email với ứng viên và, khi xác định được, với lần ứng tuyển/hành trình.
- Cung cấp Shared Inbox cho email chưa ghép hoặc cần người xác nhận.
- Lưu trạng thái gửi, lỗi, retry và audit.

### 3.6 Báo cáo và công việc

- Funnel ứng viên theo ngành, nghề, tuyến visa, nguồn, nhân viên, đội, khách hàng và đơn hàng.
- Thời gian ở từng trạng thái, việc trễ hạn, email lỗi/bounce.
- Bảng việc cá nhân và đội: mới, đang làm, hoàn thành.

## 4. Ngoài phạm vi giai đoạn đầu

- Cổng tự phục vụ hoặc tài khoản dành cho ứng viên.
- Payroll, chấm công, tính lương hoặc quản lý nhân sự sau khi sang Nhật.
- CRM bán hàng đầy đủ, báo giá, doanh thu, công nợ và hợp đồng thương mại với khách hàng.
- AI tự quyết định đỗ/trượt hoặc tự thay đổi trạng thái pháp lý.
- Data warehouse/BI riêng; báo cáo MVP dùng PostgreSQL và bảng tổng hợp.
- Microservices, Kubernetes và đa vùng active-active.
- Theo dõi `email opened` như bằng chứng chắc chắn; cơ chế này không đáng tin cậy tuyệt đối.

## 5. Yêu cầu phi chức năng ban đầu

| Nhóm | Yêu cầu |
|---|---|
| Khả dụng | Có health check, cảnh báo và quy trình rollback |
| Hiệu năng | Danh sách phân trang phía server; tìm kiếm thường dùng phản hồi mục tiêu dưới 2 giây ở tải danh định |
| Toàn vẹn | Ràng buộc DB, idempotency, optimistic concurrency |
| Bảo mật | SSO/MFA, least privilege, mã hóa truyền tải và dữ liệu nhạy cảm |
| Khôi phục | Đề xuất RPO ≤ 15 phút, RTO ≤ 4 giờ; phải diễn tập restore |
| Truy vết | Audit append-only cho hành động nhạy cảm và lịch sử trạng thái |
| Khả năng mở rộng | Ưu tiên scale dọc, tách Worker/storage trước khi tách dịch vụ |
