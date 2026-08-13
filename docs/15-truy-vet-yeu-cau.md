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
| RQ-09 | Gửi email chính danh, lưu nội dung/thời gian/tệp/lịch sử | Đã chốt | [05](./05-email-hub.md), [12](./12-ma-tran-email-thong-bao.md) | AC-05–AC-09, AC-13–AC-16 tại [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-10 | Ứng viên phản hồi email và CMS tự ghi nhận | Đã chốt | Reply matcher + Shared Inbox tại [05](./05-email-hub.md) | AC-06, AC-07, AC-14 |
| RQ-11 | Dùng một hộp thư chung | Đã chốt | Baseline một Mailbox tại [05](./05-email-hub.md), ADR-005 | EM-AC-01–04 tại [12](./12-ma-tran-email-thong-bao.md) |
| RQ-12 | Quy mô trung bình | Đã chốt ở mức mục tiêu thiết kế | Modular monolith và sizing theo workload tại [03](./03-kien-truc-va-stack.md), [08](./08-van-hanh-ubuntu.md) | Load profile tại [09](./09-kiem-thu-nghiem-thu.md); chưa phải capacity cam kết |
| RQ-13 | Chạy trên Ubuntu Server | Đã chốt | Docker Compose topology/hardening/backup tại [08](./08-van-hanh-ubuntu.md), ADR-008 | Smoke, restore drill và release gate tại [08](./08-van-hanh-ubuntu.md), [09](./09-kiem-thu-nghiem-thu.md) |
| RQ-14 | Stack Next.js/NestJS/PostgreSQL/Redis/MinIO | Đã chốt | [03](./03-kien-truc-va-stack.md) | Build/integration/deployment gates khi triển khai |
| RQ-15 | Tài liệu nhiều file Markdown và một HTML trình bày | Đã chốt | README, bộ `docs/` và file HTML độc lập | `node scripts/validate-docs.mjs`, `node scripts/validate-presentation.mjs`, browser QA |
| RQ-16 | Phạm vi tuyển dụng đa ngành; IT không phải ngành duy nhất | Đã chốt | Danh mục có version, CandidateOccupationProfile, JobOrder và snapshot tại [01](./01-yeu-cau-nghiep-vu.md), [04](./04-mo-hinh-du-lieu.md), ADR-011 tại [14](./14-quyet-dinh-kien-truc.md) | AC-22–AC-24; API catalog/profile tại [13](./13-hop-dong-chuc-nang.md) |

## 2. Phân biệt ba mức hoàn thiện

| Mức | Ý nghĩa | Trạng thái hiện tại |
|---|---|---|
| Khớp ý tưởng | Phạm vi đa ngành, vai trò, lộ trình, email và hạ tầng không mâu thuẫn yêu cầu gốc | Đạt ở baseline 1.2 |
| Đủ lập kế hoạch | Có domain model, quyền, data dictionary, API/UI contract, acceptance và ADR | Đạt để lập kế hoạch Phase 0–1B |
| Đủ bắt đầu code production | Trường bắt buộc, policy, provider, retention, topology và từng feature spec được business/tech/security phê duyệt | Chưa đạt; còn quyết định mở |

Không dùng việc tài liệu “đủ trình bày” để suy ra hệ thống đã production-ready.

## 3. Quyết định còn mở và người chịu trách nhiệm duyệt

| Quyết định | Accountable đề xuất | Consulted | Tác động nếu chưa chốt |
|---|---|---|---|
| Trường/tài liệu/evidence bắt buộc | Business/Product Owner | Recruiter, Business, Japan Coordinator | Chưa khóa schema/form/transition guard |
| Ma trận quyền cuối | Business Manager | Security/IT, trưởng đội | Chưa đặt `approved` cho API/UI permission |
| Provider + địa chỉ mailbox | IT/Business Owner | Security, vận hành | Chưa kết nối staging/production |
| Template, SLA, reminder | Business Manager | Các đội nghiệp vụ, pháp chế | Chưa bật gửi tự động |
| Retention/legal hold/purge | Business Owner/Pháp chế | Security, IT | Chưa khóa lifecycle dữ liệu |
| Một hay hai máy, RPO/RTO | IT Owner | Business Owner, tài chính | Chưa chốt BOM/runbook chính thức |
| Mapping dữ liệu cũ | Data Owner | Recruiter/Business | Chưa chạy migration rehearsal |
| Danh mục ngành/nghề/visa, field schema và chứng chỉ ban đầu | Business/Product Owner | Recruiter, Japan Coordinator, Tech Lead | Chưa khóa catalog, form động và mapping import |
| Journey Template theo bối cảnh cư trú/visa | Business/Product Owner | Japan Coordinator, Recruiter, Tech Lead | Chưa khóa milestone, SLA và evidence theo từng tuyến |

## 4. Gate phê duyệt trước triển khai

1. Business owner duyệt flow, trường bắt buộc, định nghĩa KPI và transition guards.
2. Security/IT duyệt permission, PII, retention, mailbox provider và threat controls.
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
- Một mailbox chung trong MVP; actor, body, timestamp, attachment và reply đều được lưu/audit.
- Ứng viên không đăng nhập; nhân viên nội bộ chịu trách nhiệm xác nhận trạng thái nghiệp vụ.
- Hệ thống là Candidate Operations CMS/ATS-lite, không mở rộng âm thầm thành CRM/HRM.
