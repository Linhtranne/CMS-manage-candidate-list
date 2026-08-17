# 15. Ma trận truy vết yêu cầu


## 1. Yêu cầu gốc và bằng chứng thiết kế

| ID | Yêu cầu/Quyết định | Trạng thái | Thiết kế nguồn sự thật | Bằng chứng nghiệm thu |
|---|---|---|---|---|
| RQ-01 | CMS chỉ dành cho nhân viên nội bộ | Đã chốt | [01](./01-yeu-cau-nghiep-vu.md), [06](./06-phan-quyen-bao-mat.md) | AC-10, AC-11 tại [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-02 | Ứng viên không có portal/tài khoản | Đã chốt | [01](./01-yeu-cau-nghiep-vu.md), ADR-009 tại [14](./14-quyet-dinh-kien-truc.md) | Scope review + E2E không tạo candidate login |
| RQ-03 | Danh sách ứng viên tiềm năng | Đã chốt | Candidate `readiness_status=POTENTIAL` tại [02](./02-vong-doi-ung-vien.md), [07](./07-thiet-ke-cms.md) | Candidate view contract tại [13](./13-hop-dong-chuc-nang.md) |
| RQ-04 | Danh sách chờ phỏng vấn | Đã chốt | Saved view từ Interview `SCHEDULED`, không phải application enum tại [02](./02-vong-doi-ung-vien.md) | AC-03 tại [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-05 | Danh sách đã phỏng vấn | Đã chốt | Saved view “tồn tại Interview `COMPLETED`” tại [02](./02-vong-doi-ung-vien.md), [07](./07-thiet-ke-cms.md) | AC-03; vòng 1 xong/vòng 2 chờ xuất hiện ở cả hai view |
| RQ-06 | Danh sách đã trúng tuyển | Đã chốt | Application `PASSED` tại [02](./02-vong-doi-ung-vien.md), [07](./07-thiet-ke-cms.md) | Application decision contract tại [13](./13-hop-dong-chuc-nang.md) |
| RQ-07 | Quản lý lộ trình cung ứng nhân sự sang Nhật | Đã chốt | SupplyJourney từ nhận việc đến tiếp nhận/hoàn tất cung ứng tại [02](./02-vong-doi-ung-vien.md), [11](./11-tu-dien-du-lieu.md) | AC-04, AC-20, AC-25 tại [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-08 | Không đặt trọng tâm vào máy bay | Đã chốt | Flight chỉ là field/document tùy chọn của `DEPARTURE_PLAN`; ADR-004 tại [14](./14-quyet-dinh-kien-truc.md) | AC-04; schema không có aggregate hàng không |
| RQ-09 | Gửi email chính danh, lưu nội dung/thời gian/tệp/lịch sử | Đã chốt | [05](./05-email-hub.md), [12](./12-ma-tran-email-thong-bao.md) | AC-05–AC-09, AC-13–AC-16, AC-26 tại [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-10 | Ứng viên phản hồi email và CMS tự ghi nhận | Đã chốt | Reply matcher + Shared Inbox tại [05](./05-email-hub.md) | AC-06, AC-07, AC-14 |
| RQ-11 | Dùng một hộp thư chung | Đã chốt | Baseline một Mailbox tại [05](./05-email-hub.md), ADR-005 | EM-AC-01–04 tại [12](./12-ma-tran-email-thong-bao.md) |
| RQ-12 | Quy mô trung bình | Đã chốt ở mức mục tiêu thiết kế | Modular monolith và sizing theo workload tại [03](./03-kien-truc-va-stack.md), [08](./08-van-hanh-ubuntu.md) | Load profile tại [09](./09-kiem-thu-nghiem-thu.md); chưa phải capacity cam kết |
| RQ-13 | Chạy trên Ubuntu Server | Đã chốt | Docker Compose topology/hardening/backup tại [08](./08-van-hanh-ubuntu.md), ADR-008 | Smoke, restore drill và release gate tại [08](./08-van-hanh-ubuntu.md), [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-14 | Stack Next.js/NestJS/PostgreSQL/Redis/MinIO | Đã chốt | [03](./03-kien-truc-va-stack.md) | Build/integration/deployment gates khi triển khai |
| RQ-15 | Tài liệu nhiều file Markdown và một HTML trình bày | Đã chốt | `PRODUCT.md`, README, bộ `docs/` gồm các chương UI/UX và file HTML độc lập | Git allowlist, scan liên kết Markdown, kiểm tra font/tài nguyên nhúng và browser QA tại mục 6 |
| RQ-16 | Phạm vi tuyển dụng đa ngành; IT không phải ngành duy nhất | Đã chốt | Danh mục có version, CandidateOccupationProfile, JobOrder và snapshot tại [01](./01-yeu-cau-nghiep-vu.md), [04](./04-mo-hinh-du-lieu.md), ADR-011 tại [14](./14-quyet-dinh-kien-truc.md) | AC-22–AC-24; API catalog/profile tại [13](./13-hop-dong-chuc-nang.md) |
| RQ-17 | Bảo vệ dữ liệu và chia sẻ hồ sơ sang Nhật có kiểm soát | Phải chốt trước go-live | Privacy notice có version, mục đích/phạm vi/người nhận và approval gate tại [06](./06-phan-quyen-bao-mat.md) | AC-27 tại [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-18 | Hạn chế ký hiệu/icon; chữ là nguồn truyền đạt nghiệp vụ chính | Đã chốt | [UX-01](./ui-ux/01-khung-cms.md), [UX-07](./ui-ux/07-he-thong-giao-dien-va-chat-luong.md) | AC-29, AC-30 tại [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-19 | Có kế hoạch code cho đủ tám khu vực UI/UX | Đã chốt | [Roadmap UI/UX](./backlogs/00-ui-ux-roadmap.md) và tám plan Sprint 0–4 | Ma trận bao phủ, test/gate/commit checkpoint trong từng plan |

## 2. Phân biệt ba mức hoàn thiện

| Mức | Ý nghĩa | Trạng thái hiện tại |
|---|---|---|
| Khớp ý tưởng | Phạm vi đa ngành, vai trò, lộ trình, email và hạ tầng không mâu thuẫn yêu cầu gốc | Đạt ở baseline 1.4 |
| Đủ lập kế hoạch | Có domain model, quyền, data dictionary, API/UI contract, acceptance và ADR | Đạt để lập kế hoạch Phase 0–1B |
| Đủ bắt đầu code production | Trường bắt buộc, policy, provider, retention, topology và từng feature spec được business/tech/security phê duyệt | Chưa đạt; còn quyết định mở |

Không dùng việc tài liệu “đủ trình bày” để suy ra hệ thống đã production-ready.

## 3. Quyết định còn mở và người chịu trách nhiệm duyệt

| Quyết định | Accountable đề xuất | Consulted | Tác động nếu chưa chốt |
|---|---|---|---|
| Trường/tài liệu/evidence bắt buộc | Business/Product Owner | Recruiter, Business, Japan Coordinator | Chưa khóa schema/form/transition guard |
| Ma trận quyền cuối | Business Manager | Security/IT, trưởng đội | Chưa đặt `approved` cho API/UI permission |
| Provider, địa chỉ mailbox, owner DNS/tenant và chính sách SPF/DKIM/DMARC | IT/Business Owner | Security, vận hành | Chưa đạt gate email chính danh ở staging/production |
| Template, SLA, reminder | Business Manager | Các đội nghiệp vụ, pháp chế | Chưa bật gửi tự động |
| Retention/legal hold/purge | Business Owner/Pháp chế | Security, IT | Chưa khóa lifecycle dữ liệu |
| Một hay hai máy, RPO/RTO | IT Owner | Business Owner, tài chính | Chưa chốt BOM/runbook chính thức |
| Mapping dữ liệu cũ | Data Owner | Recruiter/Business | Chưa chạy migration rehearsal |
| Danh mục ngành/nghề/visa, field schema và chứng chỉ ban đầu | Business/Product Owner | Recruiter, Japan Coordinator, Tech Lead | Chưa khóa catalog, form động và mapping import |
| Journey Template theo bối cảnh cư trú/visa | Business/Product Owner | Japan Coordinator, Recruiter, Tech Lead | Chưa khóa milestone, SLA và evidence theo từng tuyến |
| Privacy notice, mục đích/căn cứ xử lý, preference và quy tắc chia sẻ/chuyển dữ liệu sang Nhật | Business Owner/Pháp chế | Security, IT, Recruiter, Business | Chưa được bật chia sẻ hồ sơ production |

## 4. Gate phê duyệt trước triển khai

1. Business owner duyệt flow, trường bắt buộc, định nghĩa KPI và transition guards.
2. Security/IT/Pháp chế duyệt permission, PII, retention, privacy notice/chia sẻ sang Nhật, mailbox provider, DNS authentication và threat controls.
3. Tech lead duyệt OpenAPI, schema/index/migration, outbox/idempotency và test strategy.
4. Infrastructure owner duyệt topology, capacity profile, backup/RPO/RTO và monitoring.
5. Product owner đổi status spec Phase 0–1B từ `reviewed` thành `approved`; các câu hỏi còn mở phải được trả lời hoặc defer có owner/date.

## 5. Definition of alignment

Bộ hồ sơ chỉ được coi là còn khớp dự án khi mọi thay đổi tương lai vẫn giữ các invariant:

- Một người là một Candidate; nhiều đơn hàng là nhiều Application.
- Candidate có dữ liệu chung và nhiều hồ sơ nghề; IT là một ngành trong catalog, không phải hardcode của hệ thống.
- JobOrder giữ ngành/nghề/visa route; Application và Interview giữ snapshot/version đã dùng để lịch sử không bị thay đổi hồi tố.
- Nhiều vòng thuộc Interview; “Chờ PV” và “Đã PV” là view theo sự kiện.
- SupplyJourney theo dõi cung ứng đến tiếp nhận bằng Journey Template phù hợp nơi cư trú/visa; không biến thành module chuyến bay hoặc ép mọi hồ sơ qua xuất cảnh.
- Một mailbox chung trong MVP; actor, body, timestamp, attachment và reply đều được lưu/audit; miền gửi phải qua gate SPF/DKIM/DMARC trước production.
- Ứng viên không đăng nhập; nhân viên nội bộ chịu trách nhiệm xác nhận trạng thái nghiệp vụ.
- Hệ thống là Candidate Operations CMS/ATS-lite, không mở rộng âm thầm thành CRM/HRM.

## 6. Bằng chứng QA gói bàn giao baseline 1.4

Gói bàn giao không phụ thuộc script bị ẩn hoặc file ngoài phạm vi. Mỗi lần phát hành tài liệu phải chạy và lưu kết quả của các kiểm tra sau:

- allowlist Git chỉ cho phép `.gitignore`, `README.md`, `PRODUCT.md`, Markdown trong cây `docs/` và đúng file `presentation/candidate-cms-presentation.html`;
- đủ bộ tài liệu `00`–`15`, không có liên kết Markdown tương đối bị gãy và không còn tham chiếu đến artifact đã loại bỏ;
- mọi font/tài nguyên nhúng trong HTML giải mã hợp lệ; HTML không cần mạng khi trình chiếu;
- JavaScript parse được, đủ 15 slide/điều khiển, điều hướng bàn phím/nút hoạt động, không overflow ở viewport trình chiếu và không có console error nghiêm trọng;
- kết quả QA phải được chạy lại sau mọi thay đổi thay vì coi nội dung mục này là bằng chứng vĩnh viễn.

Kết quả chạy lại ngày **2026-08-14** cho baseline hiện tại:

| Kiểm tra | Kết quả |
|---|---|
| Git allowlist | Đạt — đúng 37 file thuộc phạm vi version: `.gitignore`, `README.md`, `PRODUCT.md`, 33 Markdown trong `docs/` và một HTML trình bày; không có sai lệch phạm vi |
| Tài liệu | Đạt — đủ `00`–`15`, tám chương UI/UX, roadmap và tám implementation plan; 0 link tương đối gãy, 0 lỗi UTF-8/NFC |
| Implementation plan | Đạt — 8 plan, 39 task, 195 bước checkbox; đủ header/spec/global constraints/interface/test/commit; 0 lỗi cấu trúc, 0 placeholder cấm và 0 đường dẫn PowerShell chưa quote |
| HTML tự chứa | Đạt — không có URL tài nguyên runtime bên ngoài; 4/4 font WOFF2 giải mã đúng header `wOF2`; JavaScript parse thành công |
| Browser 1366×768 | Đạt — 15 slide, font 400/800 hiển thị tiếng Việt, không slide nào overflow, Next/chấm/Home/End hoạt động, mỗi thời điểm đúng một slide hiển thị và console không có lỗi |
