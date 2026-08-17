# UX-06. Báo cáo và quản trị

# A. Báo cáo vận hành

## 1. Nguyên tắc đo lường

- Báo cáo giúp phát hiện bottleneck và ra quyết định, không phải dashboard trang trí.
- Bảng và số liệu là nguồn chính; chart chỉ cho xu hướng/so sánh.
- Mọi KPI phải drill-down được về danh sách record cấu thành.
- Candidate, Application, Interview và Journey có mẫu số riêng; không đếm trùng người.
- Hiển thị khoảng thời gian, filter, timezone và thời điểm dữ liệu được cập nhật.

## 2. Tổng quan quản lý

Chỉ số: Candidate mới, Application mới, Chờ phỏng vấn, Đã phỏng vấn chưa có kết quả, Trúng tuyển, Journey đang chạy, Hoàn tất cung ứng, Task quá hạn và Email chưa xử lý.

Filter chung: thời gian, đội, nhân viên, khách hàng, đơn tuyển, ngành nghề, nguồn và trạng thái. Filter được lưu trên URL và có thể thành saved view.

## 3. Báo cáo tuyển dụng

```text
Tiềm năng → Đưa vào đơn → Chờ phỏng vấn → Đã phỏng vấn → Trúng tuyển → Cung ứng
```

Đo số lượng, tỷ lệ chuyển đổi, thời gian ở stage, record quá SLA và lý do không đạt/rút. Tỷ lệ hiển thị cả tử số/mẫu số, ví dụ `18/60 — 30%`.

Báo cáo nguồn ứng viên theo số Candidate duy nhất, Application, Interview, trúng tuyển, hoàn tất cung ứng, thời gian và tỷ lệ; không đánh giá nguồn chỉ bằng đầu vào.

## 4. Khách hàng và đơn tuyển

- Đơn mở và tổng chỉ tiêu.
- Chỉ tiêu còn thiếu.
- Hồ sơ đang trong pipeline.
- Trúng tuyển và hoàn tất cung ứng.
- Đơn sắp hết hạn/thiếu hồ sơ.
- Thời gian phản hồi kết quả của khách hàng.
- Tỷ lệ hoàn thành theo khách hàng/ngành.

## 5. Lộ trình cung ứng

- Đang hoạt động, đúng tiến độ, có nguy cơ, quá hạn.
- Chờ ứng viên/đối tác.
- Sắp hoàn tất, đã hoàn tất, đã hủy và lý do.
- Thời gian từ trúng tuyển đến hoàn tất.
- Milestone thường chậm, số ngày chậm và hồ sơ thường thiếu.

Chuyến bay không phải KPI hoàn thành journey.

## 6. Hộp thư chung

- Email mới, chưa phân công, chưa xử lý.
- Thời gian phản hồi đầu tiên.
- Conversation quá SLA.
- Gửi thất bại/bounce.
- Email không ghép được.
- Tệp bị cách ly.

Không báo cáo “đã đọc” nếu không có evidence đáng tin cậy.

## 7. Công việc và chất lượng dữ liệu

Task: đang mở, quá hạn, thời gian xử lý, khối lượng theo đội và loại thường chậm. Dùng để phân phối nguồn lực, không biến thành công cụ giám sát vi mô.

Data quality: thiếu liên hệ, duplicate candidate, chưa có owner, tệp chưa xác minh, email chưa ghép, application thiếu kết quả, journey thiếu hạn/mốc và record không hợp lệ.

## 8. Xuất dữ liệu

- CSV/XLSX theo quyền và filter hiện tại.
- Export lớn chạy nền.
- Tệp tải có thời hạn.
- Trường nhạy cảm được mask/loại theo quyền.
- Mọi export có audit.
- Scope `self/team/all` được áp ở server, không chỉ UI.

# B. Quản trị

## 9. Người dùng và đội

Admin có thể tạo/mời, khóa/mở, gán đội/vai trò, đặt quản lý, thu hồi session và xem lịch sử đăng nhập/thay đổi quyền. Candidate không xuất hiện ở đây vì không có tài khoản CMS.

## 10. Vai trò và phạm vi

| Vai trò | Phạm vi chính |
|---|---|
| Kinh doanh/Tuyển dụng | Record được giao hoặc thuộc đội theo policy |
| Điều phối Nhật | Journey và tài liệu cần cho cung ứng |
| Quản lý | Đội/phòng ban hoặc toàn bộ theo phân công |
| Quản trị viên | Cấu hình, tài khoản, catalog; không mặc định đọc nghiệp vụ |
| Kiểm tra viên | Chỉ đọc dữ liệu/audit được cấp quyền |

Quyền là tổ hợp `action × scope × sensitivity`; một số field/tệp nhạy cảm có quyền riêng.

## 11. Danh mục

Quản trị ngành/nhóm nghề, kỹ năng, chứng chỉ, tiếng Nhật, nguồn ứng viên, loại tổ chức, khu vực, loại tài liệu và các lý do kết thúc. Giá trị đã dùng chỉ được ngừng hoạt động, không xóa vật lý.

## 12. Cấu hình quy trình

Journey Template: version, milestone, phụ thuộc, deadline, role, hồ sơ và điều kiện hoàn thành.

Email Template: nhóm nghiệp vụ, subject/body, biến, preview, version và trạng thái sử dụng.

SLA/rule: hạn xử lý email, hạn nhập kết quả, cảnh báo milestone, tạo task và đội nhận cảnh báo.

Admin không được sửa tùy ý state machine cốt lõi theo cách phá lịch sử hoặc invariant.

## 13. Cấu hình mailbox

Hiển thị địa chỉ gửi, tên gửi, chữ ký, adapter/kết nối, thư mục nhận/gửi, giới hạn tệp, retry policy, địa chỉ cảnh báo, trạng thái và lần kiểm tra gần nhất. Credential không hiển thị lại sau khi lưu.

## 14. Audit log

Filter theo actor, thời gian, loại đối tượng, mã record, action và nguồn thay đổi. Audit chỉ đọc, không sửa/xóa qua CMS, mask dữ liệu nhạy cảm và chỉ export theo quyền.

## 15. Tiêu chí nghiệm thu

- KPI drill-down trả đúng record và cùng filter/mẫu số.
- Export không vượt scope và có audit.
- Report phân biệt Candidate duy nhất với Application/Journey.
- Admin cấu hình không mặc định đọc email/tài liệu Candidate.
- Catalog/template có version và không viết ngược lịch sử.
- Permission âm tính được cưỡng chế ở API, không chỉ ẩn nút.
- Credential mailbox không xuất hiện trong response sau khi lưu.
