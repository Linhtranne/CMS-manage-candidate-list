# 07. Thiết kế CMS và báo cáo

## 1. Kiến trúc thông tin

Thanh điều hướng chính giới hạn bảy khu vực để giảm tải nhận thức:

1. **Việc của tôi**
2. **Khách hàng & Đơn hàng**
3. **Ứng viên**
4. **Ứng tuyển**
5. **Cung ứng sang Nhật**
6. **Email chung**
7. **Báo cáo**

`Quản trị` nằm trong menu người dùng và chỉ xuất hiện khi có quyền.

Trong `Quản trị` có khu vực **Danh mục & mẫu quy trình** cho ngành, nghề, tuyến visa, bộ trường/chứng chỉ, ngân hàng câu hỏi và Journey Template. Nhân viên nghiệp vụ chỉ chọn giá trị đang hoạt động; thay đổi cấu hình cần version và audit.

## 2. Danh sách là saved view, không phải bảng riêng

Các mục “Danh sách tiềm năng”, “Chờ phỏng vấn”, “Đã phỏng vấn” và “Đã trúng tuyển” là bộ lọc lưu sẵn trên các thực thể đúng:

| View | Nguồn dữ liệu | Điều kiện cốt lõi |
|---|---|---|
| Tiềm năng | Candidate | `status = POTENTIAL` |
| Chờ phỏng vấn | Application + Interview | application đang hoạt động và tồn tại Interview `SCHEDULED` chưa hoàn tất |
| Đã phỏng vấn | Application + Interview | tồn tại ít nhất một Interview `COMPLETED` |
| Đã trúng tuyển | Application | `status = PASSED` |
| Chờ COE/visa | JourneyMilestone | mốc chưa hoàn tất và đến hạn |

“Chờ phỏng vấn” và “Đã phỏng vấn” không loại trừ nhau. Ứng viên đã hoàn tất vòng 1 và đang chờ vòng 2 phải xuất hiện trong cả hai view; cột `Vòng gần nhất` và `Vòng tiếp theo` giúp nhân viên hiểu ngữ cảnh.

Nhân viên có thể lưu view riêng; quản lý có thể xuất bản view chuẩn cho đội. Mọi list dùng phân trang server-side, sort ổn định và filter có thể chia sẻ bằng URL.

Mọi saved view hỗ trợ filter chéo theo ngành, nghề, tuyến visa, nơi cư trú, khách hàng, đơn hàng, nguồn và owner. Filter ngành không thay thế trạng thái Candidate/Application/Interview.

## 3. Hồ sơ Candidate 360

Các tab:

- **Tổng quan:** liên hệ, nơi cư trú/tình trạng lưu trú, tiếng Nhật, owner, cảnh báo trùng.
- **Năng lực:** các hồ sơ ngành/nghề, kinh nghiệm, kỹ năng, chứng chỉ, mức xác minh và tài liệu bằng chứng.
- **Ứng tuyển:** toàn bộ đơn hàng và kết quả theo thời gian.
- **Cung ứng sang Nhật:** lộ trình hồ sơ, chuẩn bị xuất cảnh, bàn giao và tiếp nhận sau trúng tuyển.
- **Email:** conversation, trạng thái gửi/nhận, unread.
- **Tài liệu:** loại, phiên bản, scan status và quyền tải.
- **Lịch sử:** trạng thái, audit nghiệp vụ và tác vụ.

Header hồ sơ luôn hiển thị `candidate_code`, owner, trạng thái chung, việc kế tiếp và cảnh báo nhạy cảm. Hành động đổi trạng thái được đặt cạnh trạng thái tương ứng, không gom vào menu khó tìm.

Form Candidate có nhóm trường chung và các section chuyên ngành được sinh từ catalog. IT có thể hiển thị tech stack/portfolio; ngành khác dùng bộ trường/chứng chỉ riêng nhưng vẫn lưu dưới profile có version.

## 4. Việc của tôi

Ưu tiên hiển thị theo hành động, không chỉ theo biểu đồ:

- phản hồi email chưa đọc;
- phỏng vấn hôm nay và cần nhập kết quả;
- follow-up đến hạn;
- email failed/bounced;
- COE/visa/đào tạo quá hạn;
- mốc xác nhận nhận việc, kế hoạch xuất cảnh hoặc tiếp nhận bị chặn/quá hạn;
- email chưa ghép và tệp bị quarantine;
- tác vụ được giao.

Task có `New/In progress/Done`, owner, due date, priority, liên kết candidate/application/journey và nguồn tạo thủ công/tự động.

## 5. Shared Inbox

Layout ba vùng trên desktop:

1. Danh sách mailbox/view.
2. Danh sách conversation.
3. Nội dung + bảng ngữ cảnh ứng viên/ứng tuyển.

Trên màn hình hẹp chuyển thành từng lớp điều hướng. Các hành động ghép thủ công, retry và tải tệp phải có focus state, xác nhận phù hợp và thông báo kết quả ngay.

MVP chỉ hiển thị một hộp thư chung. Cột bên trái là các **view xử lý** (`Chưa đọc`, `Cần ghép`, `Gửi lỗi`, `Tệp cách ly`), không phải danh sách nhiều mailbox.

## 6. Màn hình lộ trình cung ứng sang Nhật

Màn hình hiển thị tên/version Journey Template và timeline/checklist các mốc được sinh cho trường hợp thực tế, không dùng giao diện theo dõi chuyến bay. Hai nhóm flow tối thiểu:

- tuyển từ ngoài Nhật: có thể gồm COE, visa, chuẩn bị và kế hoạch xuất cảnh;
- ứng viên đang ở Nhật: có thể gồm đổi tư cách lưu trú/chuyển việc và bàn giao, không bắt buộc mốc xuất cảnh.

Bộ mốc chuẩn để template lựa chọn:

1. Xác nhận nhận việc.
2. Hợp đồng và hồ sơ.
3. COE.
4. Visa.
5. Chuẩn bị trước xuất cảnh.
6. Kế hoạch xuất cảnh.
7. Đã sang Nhật và doanh nghiệp tiếp nhận.
8. Hoàn tất cung ứng.

Mỗi giai đoạn hiển thị owner, trạng thái, hạn dự kiến, ngày thực tế, blocker, task và tài liệu. Chỉ khi mở giai đoạn “Kế hoạch xuất cảnh” mới hiển thị các trường tùy chọn như ngày/chặng bay hoặc tệp lịch trình.

## 7. Báo cáo quản trị

| Báo cáo | Định nghĩa |
|---|---|
| Funnel | Candidate → qualified → application → interview → pass → supply journey → completed supply |
| Theo ngành/nghề | Candidate duy nhất, application, tỷ lệ đáp ứng và thời gian tuyển theo `IndustrySector`/`Occupation` |
| Theo tuyến visa | Pipeline và blocker theo `VisaRoute`, nơi cư trú và Journey Template |
| Theo đơn hàng | Số vị trí, giới thiệu, PV, đỗ, đã sang Nhật |
| Nguồn ứng viên | Số candidate duy nhất và tỷ lệ chuyển đổi |
| Hiệu suất đội | Số hồ sơ xử lý, SLA, tỷ lệ chuyển đổi theo scope |
| Thời gian trạng thái | Median/P90 thời gian ở mỗi stage |
| Lộ trình cung ứng | Tỷ lệ hoàn tất/đúng hạn theo hợp đồng, COE, visa, chuẩn bị, xuất cảnh và tiếp nhận |
| Email | sent, delivered, bounced, failed, reply latency, unmatched |

Quy ước đếm: candidate là người duy nhất; một candidate tham gia ba đơn hàng tạo ba applications. Báo cáo phải ghi rõ mẫu số để tránh diễn giải sai.

## 8. Nguyên tắc UX

- Giao diện desktop-first nhưng thao tác được trên tablet.
- Tìm kiếm toàn cục theo mã, tên, email, điện thoại và đơn hàng.
- List-first: hiển thị ngành/nghề chính, owner, lần liên hệ gần nhất, việc tiếp theo và cảnh báo thiếu dữ liệu; cho bulk assign theo quyền nhưng không bulk quyết định đỗ/trượt.
- Primary action rõ ràng; hành động nguy hiểm/nhạy cảm không dùng cùng màu.
- Không phụ thuộc màu để truyền đạt trạng thái; luôn có nhãn/icon.
- Bảng có sticky header, chọn cột, empty state và export theo quyền.
- Mọi thao tác nền hiển thị trạng thái đang xử lý/thành công/thất bại.
- Tôn trọng `prefers-reduced-motion` và điều hướng bàn phím.
