# 00. Tổng quan hồ sơ thiết kế

## 1. Mục tiêu

Xây dựng một nguồn dữ liệu thống nhất cho bộ phận kinh doanh tuyển dụng và cung ứng ứng viên đa ngành sang Nhật, từ lúc phát hiện ứng viên tiềm năng đến khi ứng viên được doanh nghiệp Nhật tiếp nhận. IT là một ngành trong danh mục nghiệp vụ, không phải phạm vi duy nhất của sản phẩm.

Hệ thống cần trả lời nhanh năm câu hỏi:

1. Ứng viên này là ai và có bị trùng hồ sơ không?
2. Ứng viên đang tham gia đơn hàng nào, ở bước nào?
3. Ai đang chịu trách nhiệm và việc tiếp theo là gì?
4. Lộ trình cung ứng sau trúng tuyển — hợp đồng, COE, visa, đào tạo, kế hoạch xuất cảnh và tiếp nhận — đang ở trạng thái nào?
5. Email nào đã gửi, ứng viên đã phản hồi gì và bằng chứng nằm ở đâu?

## 2. Bối cảnh vận hành

| Thuộc tính | Thiết kế mục tiêu |
|---|---|
| Loại hệ thống | CMS nội bộ |
| Đối tượng | Bộ phận kinh doanh, tuyển dụng, điều phối Nhật, quản lý, quản trị viên |
| Phạm vi tuyển dụng | Đa ngành; ngành, nghề và tuyến visa được quản trị bằng danh mục cấu hình |
| Ứng viên | Không đăng nhập; nhận và phản hồi qua email |
| Email | Một hộp thư chung chính danh trong MVP; lưu toàn bộ lịch sử gửi/nhận |
| Quy mô dữ liệu | Đến khoảng 100.000 ứng viên |
| Quy mô người dùng | Đến khoảng 200 nhân viên nội bộ |
| Hạ tầng | Ubuntu Server LTS, Docker Compose |
| Kiến trúc | Modular monolith, Web/API và Worker tách tiến trình |

Các con số trên là năng lực thiết kế ban đầu, không phải cam kết tải cuối cùng. Trước khi go-live cần đo lại theo khối lượng email, dung lượng tệp và số người dùng đồng thời thực tế.

## 3. Nguyên tắc thiết kế

- **Một ứng viên, một hồ sơ gốc:** ứng tuyển nhiều đơn hàng không tạo nhiều ứng viên.
- **Đa ngành nhưng một lõi dữ liệu:** thông tin chung nằm trên Candidate; năng lực, chứng chỉ, câu hỏi và checklist chuyên ngành tham chiếu danh mục có version, không tạo một kho ứng viên riêng cho mỗi ngành.
- **Tách hồ sơ và lần ứng tuyển:** trạng thái phỏng vấn thuộc `Application`, không thuộc `Candidate`.
- **Không đoán dữ liệu:** email không ghép chắc chắn phải vào hàng chờ xử lý thủ công.
- **Con người xác nhận nghiệp vụ:** email đến không tự động đổi kết quả phỏng vấn hoặc trạng thái visa.
- **Lưu vết trước, tự động hóa sau:** mọi thay đổi nhạy cảm, gửi email và tải tệp đều có audit.
- **Không xóa cứng dữ liệu nghiệp vụ:** dùng trạng thái ngừng hoạt động/lưu trữ theo chính sách.
- **Tối ưu cho quy mô trung bình:** tránh microservices và Kubernetes ở giai đoạn đầu.
- **Lộ trình là quy trình cung ứng, không phải lịch hàng không:** chuyến bay chỉ là thông tin tùy chọn trong mốc kế hoạch xuất cảnh.

## 4. Ranh giới sản phẩm

Hệ thống là **Candidate Operations CMS/ATS nội bộ đa ngành** của bộ phận kinh doanh cung ứng nhân sự. Module khách hàng và đơn hàng chỉ cung cấp ngữ cảnh để quản lý ứng viên, yêu cầu tuyển và tiến độ cung ứng. Việc hỗ trợ nhiều ngành không mở rộng sản phẩm thành CRM bán hàng đầy đủ: hệ thống không quản lý báo giá, doanh thu, công nợ hay hợp đồng thương mại. Hệ thống cũng không thay thế HRM/payroll sau khi nhân sự đã được doanh nghiệp Nhật tiếp nhận.

## 5. Bản đồ tài liệu

| Tài liệu | Trả lời câu hỏi |
|---|---|
| [Yêu cầu nghiệp vụ](./01-yeu-cau-nghiep-vu.md) | Hệ thống làm gì và không làm gì? |
| [Vòng đời ứng viên](./02-vong-doi-ung-vien.md) | Trạng thái nào thuộc đối tượng nào? |
| [Kiến trúc và stack](./03-kien-truc-va-stack.md) | Hệ thống được cấu tạo và triển khai ra sao? |
| [Mô hình dữ liệu](./04-mo-hinh-du-lieu.md) | Các thực thể liên hệ với nhau thế nào? |
| [Email Hub](./05-email-hub.md) | Gửi, nhận, ghép luồng và lưu tệp ra sao? |
| [Phân quyền](./06-phan-quyen-bao-mat.md) | Ai được thấy và làm gì? |
| [Thiết kế CMS](./07-thiet-ke-cms.md) | Nhân viên thao tác trên các màn hình nào? |
| [Vận hành Ubuntu](./08-van-hanh-ubuntu.md) | Chạy, sao lưu và khôi phục thế nào? |
| [Kiểm thử](./09-kiem-thu-nghiem-thu.md) | Bằng chứng nào xác nhận hệ thống đạt yêu cầu? |
| [Lộ trình MVP](./10-lo-trinh-mvp.md) | Nên xây theo thứ tự nào? |
| [Từ điển dữ liệu](./11-tu-dien-du-lieu.md) | Trường, enum và ràng buộc nào là chuẩn triển khai? |
| [Ma trận email](./12-ma-tran-email-thong-bao.md) | Sự kiện nào gửi email, ai duyệt và phản hồi được ghi nhận ra sao? |
| [Hợp đồng chức năng](./13-hop-dong-chuc-nang.md) | Hành động UI/API và lỗi quan sát được là gì? |
| [Quyết định kiến trúc](./14-quyet-dinh-kien-truc.md) | Những quyết định nào đã chốt và khi nào cần xem lại? |
| [Ma trận truy vết](./15-truy-vet-yeu-cau.md) | Mỗi yêu cầu ban đầu được thiết kế và nghiệm thu ở đâu? |

## 6. Chỉ số thành công cần đo

- Tỷ lệ hồ sơ trùng được phát hiện trước khi tạo mới và số ca merge sai.
- Funnel và tỷ lệ đáp ứng theo ngành, nghề, tuyến visa và đơn hàng; báo cáo vẫn phân biệt số Candidate duy nhất với số Application.
- Tỷ lệ ứng viên/ứng tuyển có owner và việc tiếp theo rõ ràng.
- Thời gian từ ghép đơn hàng đến lịch phỏng vấn, trúng tuyển và hoàn tất cung ứng.
- Tỷ lệ mốc cung ứng đúng hạn, số blocker quá hạn và thời gian xử lý.
- Tỷ lệ email gửi/nhận được lưu vết, tỷ lệ reply tự ghép đúng và số email `Needs Review` tồn đọng.
- Tỷ lệ thao tác nhạy cảm có audit đầy đủ và số lần truy cập bị từ chối đúng chính sách.

Mục tiêu số cụ thể chỉ được chốt sau khi đo baseline dữ liệu hiện tại; tài liệu không tự đặt KPI thiếu căn cứ.

## 7. Quyết định còn cần duyệt trước triển khai

- Nhà cung cấp hộp thư chung: Microsoft 365, Google Workspace hay SMTP/IMAP doanh nghiệp.
- Danh mục ngành, nghề, tuyến visa và bộ trường/chứng chỉ bắt buộc cho đợt triển khai đầu tiên.
- Các Journey Template ban đầu theo nơi cư trú, tuyến visa và trường hợp tuyển mới/chuyển việc.
- Địa chỉ cụ thể của một hộp thư chung và tên miền chính thức.
- Cơ cấu phòng ban/đội để định nghĩa phạm vi `self/team/department/company`.
- Thời hạn lưu email, tài liệu cá nhân và audit log.
- RPO/RTO cuối cùng theo ngân sách; hồ sơ hiện đề xuất RPO không quá 15 phút và RTO không quá 4 giờ.
- Triển khai một máy chủ hay tách máy ứng dụng và máy dữ liệu.
