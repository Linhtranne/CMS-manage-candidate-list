# UX-01. Khung CMS và kiến trúc thông tin

## 1. App shell desktop

```text
┌───────────────┬──────────────────────────────────────────────┐
│ Navigation    │ Tìm kiếm toàn hệ thống     Thông báo   User │
│               ├──────────────────────────────────────────────┤
│ Việc của tôi  │ Tiêu đề màn hình         [+ Thao tác chính] │
│ Khách hàng    │ Saved view • Bộ lọc • Sắp xếp • Xuất        │
│  & Đơn hàng   ├───────────────────────────────┬──────────────┤
│ Ứng viên      │                               │              │
│ Ứng tuyển     │        Bảng dữ liệu           │ Hồ sơ large  │
│ Lộ trình      │        nghiệp vụ              │ sheet        │
│ Hộp thư chung │                               │              │
│ Báo cáo       │                               │              │
└───────────────┴───────────────────────────────┴──────────────┘
```

Sidebar rộng khoảng `240px`, có thể thu xuống `72px`. Hồ sơ khách hàng mở dạng large sheet rộng khoảng `min(86vw, 72rem)`, giữ nguyên danh sách phía sau. Kích thước cuối cùng phải được kiểm qua dữ liệu tiếng Việt thực tế, không coi số trên là token cứng trước khi dựng prototype.

## 2. Điều hướng

| Khu vực | Nội dung chính |
|---|---|
| Việc của tôi | Hàng đợi công việc, SLA và hành động gần nhất |
| Khách hàng | Tổ chức tiếp nhận và quan hệ doanh nghiệp |
| Đơn tuyển | Nhu cầu, chỉ tiêu và tiến độ cung ứng |
| Ứng viên | Hồ sơ gốc, năng lực, tài liệu và lịch sử |
| Ứng tuyển & Phỏng vấn | Pipeline theo đơn và các vòng phỏng vấn |
| Lộ trình cung ứng | Quy trình sau trúng tuyển đến khi tiếp nhận |
| Hộp thư chung | Email gửi/nhận, phân công và phản hồi |
| Báo cáo | Chỉ số vận hành và khả năng drill-down |

Menu `Quản trị` chỉ xuất hiện theo quyền. Navigation luôn có nhãn chữ; icon nếu dùng không được thay thế tên khu vực.

## 3. Thanh đầu trang

- Tìm kiếm toàn hệ thống.
- Thông báo nội bộ cần chú ý.
- Danh tính người dùng, đội và menu tài khoản.
- Không đặt nhiều shortcut hoặc icon trang trí.

Tìm kiếm hỗ trợ mã/tên ứng viên, email, điện thoại, tên khách hàng, mã đơn, vị trí và người phụ trách. Kết quả chia theo loại đối tượng và áp dụng quyền trước khi trả dữ liệu.

## 4. Cấu trúc màn hình chuẩn

1. Tiêu đề và mô tả ngắn.
2. Tối đa một primary action.
3. Saved view: `Của tôi`, `Cần xử lý`, `Quá hạn`, `Tất cả` hoặc view theo nghiệp vụ.
4. Tìm kiếm, filter, sort và chọn cột.
5. Bảng phân trang server-side.
6. Bulk action theo quyền.
7. Large sheet hồ sơ xử lý các tab và thao tác theo ngữ cảnh.
8. Trang chi tiết dự phòng cho truy cập trực tiếp, bookmark hoặc nghiệp vụ dài.

Filter, sort, trang hiện tại và bản ghi đang mở phải được giữ khi người dùng quay lại. Các view được chia sẻ cần URL ổn định và không chứa dữ liệu nhạy cảm ngoài định danh tối thiểu.

## 5. Large sheet hồ sơ

- Click dòng mở thẳng large sheet hồ sơ, không cần bước drawer tóm tắt trung gian và không điều hướng khỏi list.
- Sheet có header đối tượng, trạng thái, owner, KPI và việc tiếp theo.
- Chỉ hiển thị hành động thường dùng; hành động phụ nằm trong menu.
- Khi record bị cập nhật bởi người khác, sheet không ghi đè âm thầm.
- Trên tablet, sheet chuyển thành lớp chi tiết toàn màn hình và giữ đường quay lại danh sách.
- Sheet chiếm một phần màn hình không hiển thị nút X riêng; người dùng đóng bằng click vùng nền hoặc `Escape`.
- Khi đóng, sheet chạy exit motion ngắn rồi mới unmount để tránh cảm giác giật; modal nghiệp vụ có form/chọn dữ liệu vẫn giữ nút đóng rõ ràng.

### 5.1. Cấp độ hồ sơ đầy đủ

Hồ sơ đầy đủ dùng cùng một ngữ cảnh với danh sách, không ép nhân viên rời màn hình:

- Click một dòng mở trực tiếp large sheet với các tab `Tổng quan`, `Đơn tuyển`, `Ứng viên cung ứng`, `Liên hệ`, `Tệp & ghi chú`, `Lịch sử thay đổi`.
- Large sheet giữ nguyên `selectedId` và filter của danh sách; đóng bằng vùng nền hoặc `Escape` để quay lại đúng vị trí trong list.
- Route `/clients/[clientId]` vẫn tồn tại cho truy cập trực tiếp, bookmark hoặc nghiệp vụ dài; không phải luồng mặc định từ danh sách.
- Trên mobile, large sheet xếp thành một cột toàn chiều rộng; tab cuộn ngang và dùng vùng nền hoặc `Escape` để đóng.

## 6. Hành vi bảng

- Sticky header khi danh sách dài.
- Phân trang, filter và sort phía server.
- Chọn cột và lưu view.
- Tối đa hai hành động nhanh trên mỗi dòng; phần còn lại dùng menu.
- Không bulk quyết định đỗ/trượt, miễn milestone hoặc thao tác nhạy cảm tương tự.
- Dữ liệu rỗng, quá dài hoặc chưa xác định phải có cách hiển thị ổn định.

## 7. Responsive và bàn phím

- Desktop là bố cục đầy đủ.
- Tablet thu sidebar, ưu tiên list và mở chi tiết theo lớp.
- Không ẩn hành động cốt lõi chỉ vì viewport hẹp.
- Mobile navigation mở theo dạng panel một phần màn hình, không lặp thêm nút đóng trong sidebar; click vùng nền, chọn menu hoặc `Escape` để đóng.
- Focus rõ, thứ tự tab hợp lý, `Escape` đóng lớp khi an toàn.
- Mọi control icon-only hợp lệ phải có accessible name và tooltip.
- Tôn trọng `prefers-reduced-motion`; không dùng animation làm điều kiện hiểu trạng thái.

## 8. Trạng thái bắt buộc

- Đang tải.
- Chưa có dữ liệu.
- Không có kết quả theo filter.
- Không có quyền.
- Lỗi có thể thử lại.
- Lỗi cần liên hệ quản trị.
- Phiên đăng nhập hết hạn.
- Mất kết nối tạm thời.
- Dữ liệu vừa được người khác cập nhật.
- Tác vụ nền đang chạy.
- Thao tác hàng loạt thành công một phần.

Thông báo phải nói rõ chuyện gì xảy ra và người dùng có thể làm gì tiếp theo.

## 9. Tiêu chí nghiệm thu

- Điều hướng hiển thị đúng theo quyền và giữ mục đang hoạt động.
- Tải lại URL không làm mất filter, sort, trang và ngữ cảnh sheet được phép chia sẻ.
- Search không trả metadata của bản ghi ngoài phạm vi quyền.
- Tablet vẫn truy cập được primary action, filter và chi tiết.
- Mọi trạng thái có nhãn chữ, không phụ thuộc màu hoặc icon.
- Điều hướng bàn phím đi qua đủ control và focus không bị che.
