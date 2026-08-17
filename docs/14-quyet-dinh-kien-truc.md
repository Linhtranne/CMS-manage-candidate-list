# 14. Quyết định kiến trúc

Tài liệu này ghi các quyết định đã chốt ở mức thiết kế. `Accepted` nghĩa là baseline hiện tại; thay đổi phải có lý do và cập nhật tác động lên tài liệu/test.

## ADR-001 — Modular monolith

**Status:** Accepted

**Context:** Khoảng 100.000 candidate, tối đa khoảng 200 người dùng nội bộ, nghiệp vụ giao dịch chặt và đội vận hành tự quản trị trên Ubuntu.

**Decision:** Một backend NestJS theo module, một PostgreSQL, Web/API/Worker/Scheduler tách tiến trình; module giao tiếp qua service contract.

**Trade-offs:** Dễ deploy, backup và giữ transaction hơn microservices; đổi lại phải cưỡng chế ranh giới module trong code và không scale độc lập hoàn toàn từng domain.

**Revisit trigger:** Một module có tải/đội sở hữu/release cadence độc lập đã đo được, hoặc giới hạn scale dọc/ngang hiện tại không đáp ứng SLO.

## ADR-002 — PostgreSQL + Prisma và object storage riêng

**Status:** Accepted

**Context:** Dữ liệu candidate/application/journey có quan hệ, constraint, audit và báo cáo; email attachment có dung lượng lớn.

**Decision:** PostgreSQL làm nguồn dữ liệu quan hệ; Prisma quản lý schema/query; MinIO/S3-compatible lưu binary private.

**Trade-offs:** Transaction và constraint rõ; Prisma migration cần raw SQL cho partial index/constraint nâng cao. Vận hành thêm object storage nhưng backup DB không phình vì binary.

**Revisit trigger:** Query/report đã tối ưu vẫn không đạt profile tải, hoặc chuyển sang managed service có lợi ích vận hành rõ và kế hoạch migration được duyệt.

## ADR-003 — Tách Candidate, Application, Interview và SupplyJourney

**Status:** Accepted

**Context:** Một người có thể tham gia nhiều đơn hàng, nhiều vòng phỏng vấn và chỉ một cơ hội cụ thể chuyển sang cung ứng.

**Decision:** Candidate là hồ sơ gốc; Application là lần ứng tuyển theo JobOrder; Interview giữ trạng thái từng vòng; SupplyJourney giữ quy trình sau trúng tuyển.

**Trade-offs:** Nhiều bảng/join hơn nhưng tránh trạng thái tổng sai và báo cáo đếm nhầm. Saved view được dẫn xuất từ dữ liệu đúng thay vì tạo bảng danh sách riêng.

**Revisit trigger:** Không có; đây là ranh giới domain cốt lõi. Chỉ thay đổi chi tiết enum/field qua migration được duyệt.

## ADR-004 — Lộ trình cung ứng, không phải quản lý chuyến bay

**Status:** Accepted

**Context:** Sản phẩm quản lý cung ứng nhân sự đa ngành đến doanh nghiệp Nhật, không vận hành logistics hàng không. IT chỉ là một ngành trong phạm vi cấu hình.

**Decision:** SupplyJourney đi từ xác nhận nhận việc đến doanh nghiệp Nhật tiếp nhận/hoàn tất cung ứng. Một Candidate chỉ có tối đa một journey `ACTIVE`/`ON_HOLD` dù đã đỗ nhiều Application; DB cưỡng chế bằng khóa ứng viên bất biến trên journey. Chi tiết bay chỉ là dữ liệu tùy chọn trong milestone `DEPARTURE_PLAN`; không có module/aggregate hàng không riêng.

**Trade-offs:** Đúng trọng tâm nghiệp vụ và đơn giản hơn; nếu sau này cần logistics nhiều chặng chuyên sâu sẽ phải mở rộng có chủ đích.

**Revisit trigger:** Doanh nghiệp phát sinh nhu cầu quản lý booking, nhiều chặng, nhà vận chuyển và thay đổi lịch như một năng lực độc lập có owner riêng.

## ADR-005 — Một hộp thư chung trong MVP

**Status:** Accepted

**Context:** Ứng viên không có portal; bộ phận nội bộ muốn giao tiếp chính danh, gom lịch sử và đã chọn phương án một hộp thư chung.

**Decision:** Kết nối một mailbox hoạt động. Quyền đọc/gửi theo candidate/application/journey scope; actor nội bộ được audit dù From address dùng chung.

**Trade-offs:** Dễ triển khai, đối soát và tạo thói quen dùng chung; inbox có thể đông và cần view/owner/SLA tốt.

**Revisit trigger:** Tách pháp nhân/thương hiệu, yêu cầu dữ liệu bắt buộc tách biệt, hoặc lưu lượng/quyền truy cập đã chứng minh một mailbox không còn phù hợp.

## ADR-006 — Outbox là nguồn sự thật, queue là cơ chế xử lý

**Status:** Accepted

**Context:** API có thể commit dữ liệu nhưng mất sự kiện queue; worker/provider có thể timeout và retry.

**Decision:** Message và outbox được tạo trong một DB transaction. Dispatcher định kỳ quét outbox pending và đẩy BullMQ. Worker/idempotency bảo đảm retry không gửi logic trùng.

**Trade-offs:** Thêm dispatcher/reconciliation nhưng tránh thất lạc giữa DB và queue. Không tuyên bố exactly-once với provider; dùng idempotency và đối soát để đạt effectively-once ở mức nghiệp vụ.

**Revisit trigger:** Chuyển sang hạ tầng event streaming/managed queue có transactional integration được chứng minh và giảm rủi ro vận hành.

## ADR-007 — Email đến không tự đổi trạng thái nghiệp vụ

**Status:** Accepted

**Context:** Nội dung tự do có thể mơ hồ; kết quả phỏng vấn, COE/visa và hoàn tất cung ứng là quyết định có trách nhiệm.

**Decision:** Email đến chỉ ghi dữ liệu, tạo signal/task hoặc đề xuất; người có quyền xác nhận transition.

**Trade-offs:** Ít tự động hơn nhưng tránh quyết định sai/không audit. Có thể tự động reminder và phân loại an toàn khi rule đã duyệt.

**Revisit trigger:** Chỉ mở rộng automation cho hành động rủi ro thấp sau khi có dữ liệu chất lượng, tỷ lệ lỗi đo được, khả năng rollback và human override.

## ADR-008 — Ubuntu LTS + Docker Compose

**Status:** Accepted

**Context:** Hệ thống chạy trên máy chủ Ubuntu do đơn vị tự quản trị, quy mô trung bình.

**Decision:** Container hóa bằng Docker Compose; baseline hai máy App/Data và backup ngoài failure domain. Một máy chỉ là phương án ngân sách thấp có chấp nhận single point of failure.

**Trade-offs:** Đơn giản hơn Kubernetes nhưng HA/failover không tự động ở mức cluster. Cần runbook, monitoring, PITR và restore drill nghiêm túc.

**Revisit trigger:** Yêu cầu HA/SLO cao hơn, nhiều instance/nhiều node khó vận hành bằng Compose, hoặc doanh nghiệp chuyển sang nền tảng managed/container orchestrator.

## ADR-009 — Không có portal ứng viên ở baseline

**Status:** Accepted

**Context:** Chỉ nhân viên nội bộ dùng CMS; ứng viên nhận và phản hồi email.

**Decision:** Không xây tài khoản/portal/mobile app cho ứng viên trong MVP.

**Trade-offs:** Giảm đáng kể scope IAM/UX/support; đổi lại việc thu thập dữ liệu có cấu trúc dựa vào nhân viên, template và attachment.

**Revisit trigger:** Khối lượng cập nhật giấy tờ qua email gây quá tải đo được, yêu cầu pháp lý cần kênh upload/xác nhận riêng hoặc chiến lược sản phẩm thay đổi.

## ADR-010 — Phân quyền theo action × scope × sensitivity

**Status:** Accepted

**Context:** Vai trò giống nhau không có nghĩa được xem cùng dữ liệu; admin hạ tầng không mặc nhiên cần đọc PII/email.

**Decision:** Backend cưỡng chế action-level, data scope và field sensitivity; export/download/merge/manual link có quyền/audit riêng; hỗ trợ break-glass có thời hạn.

**Trade-offs:** Policy/test phức tạp hơn RBAC thuần, nhưng phù hợp dữ liệu cá nhân và chuyển giao giữa đội.

**Revisit trigger:** Cơ cấu tổ chức/thẩm quyền thay đổi hoặc cần policy engine riêng do số rule/tenant tăng đáng kể.

## ADR-011 — Đa ngành bằng danh mục có version, IT là một ngành

**Status:** Accepted

**Context:** Nghiệp vụ cần tuyển và cung ứng nhiều nhóm nghề sang Nhật. Các ngành có trường năng lực, chứng chỉ và câu hỏi khác nhau, nhưng Candidate, Application, Interview, email và audit vẫn có cùng bản chất.

**Decision:** Dùng danh mục `IndustrySector`, `Occupation`, `VisaRoute` có version; Candidate giữ dữ liệu chung và có nhiều `CandidateOccupationProfile`. JobOrder tham chiếu ngành/nghề/visa route, còn Application lưu `requirement_snapshot`. Trường chuyên môn mở rộng theo schema được quản trị; không tạo một pipeline hoặc bảng Candidate riêng cho mỗi ngành.

**Trade-offs:** Có thể thêm ngành mà không sửa toàn bộ lõi và vẫn báo cáo thống nhất; đổi lại cần quản trị catalog/schema/version chặt, kiểm thử migration và tránh biến JSONB thành nơi chứa dữ liệu không kiểm soát.

**Revisit trigger:** Một ngành có quy trình, quyền, dữ liệu và đội vận hành khác biệt đủ lớn đã được chứng minh bằng nghiệp vụ thực tế; khi đó đánh giá module chuyên biệt nhưng vẫn giữ Candidate/Application chung nếu có thể.

## ADR-012 — SupplyJourney dùng template theo bối cảnh, không có một pipeline cố định

**Status:** Accepted

**Context:** Ứng viên có thể đang ngoài Nhật, đã ở Nhật, chuyển việc hoặc đổi tư cách lưu trú. Ép mọi người qua COE, visa và xuất cảnh tạo trạng thái giả và làm sai báo cáo.

**Decision:** Mỗi SupplyJourney khóa một `SupplyJourneyTemplate` và version phù hợp `residence_context`, visa route, case type và khi cần ngành/nghề. Template định nghĩa mốc, thứ tự, điều kiện, SLA và evidence. Mốc ngoài bối cảnh được bỏ khỏi template hoặc đánh dấu `NOT_APPLICABLE` có lý do; `WAIVED` chỉ dành cho miễn trừ có thẩm quyền đối với mốc vốn áp dụng và phải lưu người duyệt/audit.

**Trade-offs:** Phản ánh đúng nhiều tuyến cung ứng và mở rộng được; đổi lại cần UI chọn template rõ, rule kiểm tra tính phù hợp và quản trị version để không làm đổi hành trình đang chạy.

**Revisit trigger:** Có đủ dữ liệu để chứng minh việc chọn template có thể tự động an toàn; ngay cả khi đó vẫn cần khả năng giải thích và override có audit.

## Quy trình thay đổi ADR

1. Mô tả bằng chứng/constraint mới.
2. Nêu phương án, trade-off và tác động migration/permission/test.
3. Gán status `Proposed`, lấy duyệt business/tech/security phù hợp.
4. Khi accepted, cập nhật tài liệu liên quan và kế hoạch rollback/chuyển đổi.
5. Không sửa lịch sử ADR cũ; đánh dấu `Superseded by ADR-xxx`.
