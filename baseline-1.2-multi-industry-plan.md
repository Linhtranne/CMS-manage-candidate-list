# Nâng Design Baseline 1.2 lên phạm vi đa ngành

## Goal

Chuyển toàn bộ hồ sơ thiết kế từ phạm vi bị diễn giải hẹp thành CMS nội bộ tuyển dụng và cung ứng ứng viên đa ngành sang Nhật, trong đó IT là một ngành cấu hình, không làm thay đổi các invariant Candidate/Application/Interview, Email Hub và SupplyJourney.

## Tasks

- [x] Đổi tên sản phẩm và mô tả phạm vi trong README, tổng quan, ADR, truy vết và presentation → Verify: không còn cụm định danh chỉ tuyển IT.
- [x] Bổ sung IndustrySector, Occupation, VisaRoute và hồ sơ năng lực/chứng chỉ theo ngành → Verify: domain/data dictionary/API có nguồn sự thật thống nhất.
- [x] Bổ sung requirement snapshot cho Application và ngân hàng câu hỏi theo ngành → Verify: yêu cầu đơn hàng thay đổi không làm sai lịch sử ứng tuyển.
- [x] Bổ sung SupplyJourneyTemplate theo tuyến visa/nơi cư trú/ngành → Verify: hỗ trợ ứng viên từ Việt Nam và đang ở Nhật mà không ép một chuỗi mốc cứng.
- [x] Cập nhật UI, report, MVP, acceptance và traceability cho bộ lọc/nghiệp vụ đa ngành → Verify: mỗi yêu cầu có màn hình và tiêu chí nghiệm thu.
- [x] Thay gap audit portal bằng tài liệu bài học từ portal tham khảo → Verify: portal không còn được mô tả như implementation target hay legacy bắt buộc migration.
- [x] Đồng bộ HTML và validation scripts lên Baseline 1.2 → Verify: scripts validation chạy xanh và presentation render không lỗi.

## Done When

- [x] Không còn tuyên bố sản phẩm chỉ tuyển IT.
- [x] IT được mô tả là một ngành trong catalog mở rộng.
- [x] Các tài liệu nghiệp vụ, dữ liệu, API, ADR, test, MVP và presentation không mâu thuẫn.
- [x] Markdown links, invariants và presentation validation đều đạt.

## Notes

- Giữ CMS chỉ dành cho nhân viên nội bộ; ứng viên không có portal.
- Giữ một hộp thư chung trong MVP.
- Giữ khách hàng/đơn hàng ở mức ngữ cảnh cung ứng; không mở rộng ngầm thành CRM tài chính.
- CTV/Partner/Output Review/AI content không thuộc core nếu chưa có quyết định mới.
