# UX-07. Hệ thống giao diện và chất lượng

## 1. Nguyên tắc thị giác

- CMS doanh nghiệp trung tính, nghiêm túc và dễ quét.
- Nền gần trắng, chữ than, xanh dương tiết chế.
- Đỏ chỉ cho lỗi, quá hạn hoặc hành động nguy hiểm.
- Mật độ vừa phải; bảng là thành phần chủ đạo.
- Không dùng gradient, illustration hoặc motif Nhật Bản nếu không có mục đích nghiệp vụ.
- Typography tiếng Việt phải có đầy đủ dấu và trọng lượng cần dùng.

Token màu, khoảng cách, radius, shadow và typography được định nghĩa tập trung. Không hard-code mã màu hoặc magic spacing trong feature component.

## 2. Component chuẩn

- Button và button group.
- Input, textarea, select, combobox.
- Date/time picker có timezone.
- Table, filter, saved view, pagination.
- Status label/badge.
- Drawer, dialog và tabs.
- Toast/inline alert.
- Upload và file row.
- Timeline/milestone.
- Empty/error/permission state.

Feature component xây trên component chuẩn; không tạo component mới chỉ vì khác vài pixel.

### Modal nghiệp vụ dùng chung

`apps/web/src/components/ui/modal.tsx` là primitive bắt buộc cho form/chọn dữ liệu mở giữa màn hình. Modal chuẩn phải có:

- backdrop và nút X có accessible name;
- đóng bằng Escape và click backdrop;
- focus vào panel, khóa scroll trang nền và giữ DOM trong thời gian exit animation;
- tiêu đề/description liên kết đúng với `role="dialog"`;
- footer thống nhất: Hủy ở bên trái nhóm hành động, primary action ở cuối.

Drawer vẫn dành cho xem context hoặc hồ sơ; modal dành cho nhập liệu, xác nhận và mutation nghiệp vụ. Không tạo lớp `fixed inset-0` riêng trong feature nếu có thể dùng primitive này.

## 3. Hạn chế icon và ký hiệu

- Dùng một icon set duy nhất, cùng độ dày nét.
- Không dùng emoji hoặc ký hiệu `✈`, `★`, `✓`, `⚠` làm control.
- Không dùng cờ Nhật, máy bay hoặc biểu tượng quốc gia để đại diện Supply Journey.
- Navigation luôn có nhãn chữ; icon không thay thế tên khu vực.
- Nút nghiệp vụ quan trọng phải có chữ: `Thêm ứng viên`, `Gửi email`, `Chuyển trạng thái`.
- Icon-only chỉ dành cho hành vi phổ quát và hạn chế không gian như đóng, thu gọn, mở rộng hoặc menu ba chấm.
- Mọi icon-only có tooltip, accessible name, focus state và hit area phù hợp.
- Mỗi dòng bảng tối đa hai hành động nhanh; phần còn lại nằm trong menu.
- Không gắn icon vào mọi KPI, header, badge hoặc cell nếu không bổ sung ý nghĩa.
- Trạng thái luôn có nhãn chữ; không dựa vào icon/màu duy nhất.

Nguyên tắc: **chữ truyền đạt nghiệp vụ, icon chỉ hỗ trợ nhận biết thao tác**.

## 4. Phân cấp hành động

- Mỗi màn hình tối đa một primary action nổi bật.
- Secondary action dùng kiểu trung tính.
- Hành động nguy hiểm tách khỏi nhóm thường và có confirm phù hợp.
- Không đặt hàng dài button/icon ở cuối mỗi dòng.
- Menu ba chấm không được che giấu hành động quan trọng nhất của màn hình.

## 5. Form

- Label luôn hiện; placeholder không thay label.
- Required/optional được mô tả nhất quán.
- Error cạnh đúng field, summary ở đầu form khi cần.
- Không làm mất dữ liệu đã nhập khi request lỗi.
- Form dài chia section nghiệp vụ.
- Cảnh báo trước khi rời trang có thay đổi chưa lưu.
- Transition quan trọng hiển thị tác động và yêu cầu xác nhận/lý do.
- Date/time liên quan Nhật Bản hiển thị timezone rõ.

## 6. Trạng thái, màu và nội dung

- Status label dùng text ngắn, nhất quán từ từ điển dữ liệu.
- Màu chỉ hỗ trợ; tương phản phải đạt chuẩn được duyệt.
- Error message nói rõ nguyên nhân quan sát được và bước tiếp theo.
- Không dùng thuật ngữ kỹ thuật/provider trong thông báo cho nhân viên nếu không cần.
- Không dùng từ “thành công” khi thao tác mới chỉ được đưa vào queue; phải nói `Đã xếp hàng gửi` hoặc trạng thái tương ứng.

## 7. Loading, empty và error

Mỗi surface phải có:

- skeleton/progress phù hợp;
- empty lần đầu có hướng dẫn/primary action;
- no-results giữ filter và cho xóa filter;
- permission denied không rò rỉ metadata;
- retry cho lỗi tạm thời;
- support reference cho lỗi không tự xử lý;
- partial success liệt kê record thành công/thất bại;
- background job có trạng thái và kết quả tải lại được.

## 8. Đồng thời và dữ liệu lớn

- Optimistic concurrency ở server; UI không ghi đè im lặng.
- Khi record đổi, thông báo ai/thời điểm nếu policy cho phép và cho tải lại.
- List/search/sort/filter server-side; không tải 100.000 Candidate vào browser.
- Import/export/report/email lớn chạy nền và có retry an toàn.
- Saved view và URL không chứa PII ngoài phần cần thiết.

## 9. Accessibility

- Điều hướng đầy đủ bằng bàn phím.
- Focus nhìn thấy rõ và không bị sticky region che.
- Label/description/error liên kết đúng control.
- Status không phụ thuộc màu.
- Icon-only có accessible name.
- Dialog/drawer quản lý focus và trả focus đúng nơi mở.
- Hỗ trợ zoom, tablet và `prefers-reduced-motion`.
- Panel/drawer có enter và exit motion ngắn, bounded; trạng thái đóng được giữ đến khi animation kết thúc hoặc fallback timeout rồi mới tháo khỏi DOM.
- Font hiển thị tiếng Việt đầy đủ; nội dung dùng thuật ngữ nghiệp vụ nhất quán.

Mục tiêu WCAG cụ thể cần được owner chốt trước release gate; baseline triển khai không được thấp hơn các yêu cầu trên.

## 10. Quy tắc frontend

- Token nằm trong global theme/CSS, feature không hard-code màu.
- Component theo nghiệp vụ nằm cùng feature; component UI dùng chung nằm ở lớp UI.
- Text người dùng nhìn thấy đi qua cơ chế i18n/dictionary phù hợp, không rải hard text.
- Server state dùng API/query layer; chỉ thêm global client store khi có state UI xuyên màn hình thật sự.
- Boundary giữa app, feature, shared UI và API client phải được lint kiểm tra.

## 11. Checklist nghiệm thu giao diện

- Dữ liệu tiếng Việt dài không làm vỡ layout.
- List, drawer, form và dialog đủ loading/empty/error/permission/conflict.
- Primary action rõ và không có icon trang trí thừa.
- Điều hướng bàn phím/focus hoạt động.
- Tablet giữ đủ tác vụ cốt lõi.
- Trạng thái có text và thuật ngữ đúng nguồn sự thật.
- Hành động nhạy cảm có confirm, guard và audit.
- Export/upload/email hiển thị đúng trạng thái bất đồng bộ.
- Không có màu/font/spacing hard-code ngoài token được duyệt.
- Không có emoji, cờ, máy bay hoặc icon dùng như nguồn thông tin duy nhất.
