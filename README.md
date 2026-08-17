# Japan Candidate Supply CMS

CMS nội bộ cho bộ phận Kinh doanh/Tuyển dụng quản lý ứng viên đa ngành và cung ứng nhân sự sang Nhật. Nhân viên làm việc trên CMS; ứng viên không đăng nhập mà nhận và phản hồi qua hộp thư chung có lưu vết.

## Phạm vi sản phẩm

- Quản lý hồ sơ ứng viên gốc, nghề nghiệp và trạng thái vận hành.
- Quản lý khách hàng, đơn tuyển và pipeline ứng viên.
- Theo dõi lịch phỏng vấn, kết quả và quyết định trúng tuyển.
- Theo dõi Supply Journey từ sau trúng tuyển đến khi doanh nghiệp Nhật tiếp nhận.
- Hộp thư chung: lưu nội dung, thời gian, tệp đính kèm, phản hồi và lịch sử ghép email.
- Báo cáo vận hành, audit log, người dùng, quyền, danh mục và template.

IT chỉ là một ngành trong catalog. Hệ thống được thiết kế để mở rộng cho điều dưỡng, cơ khí, sản xuất, dịch vụ lưu trú và các ngành khác.

## Trạng thái hiện tại

Frontend và mock runtime của Sprint 0–4 đã được triển khai bằng Next.js. Các route chính, modal/form nghiệp vụ, trạng thái loading/empty/error/permission và critical path đã có test tương ứng.

Phần chưa phải production gồm backend NestJS, database migration, email provider thật, worker gửi email, object storage, persistence cho audit và kết nối dữ liệu thật. MSW chỉ dùng cho development/test.

## Chạy local

Yêu cầu Node.js `>=22.15` và pnpm `>=11.6`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Mở [http://localhost:3000/work](http://localhost:3000/work). Một số route chính:

- `/clients` — khách hàng
- `/orders` — đơn tuyển
- `/candidates` — ứng viên
- `/applications` — ứng tuyển và phỏng vấn
- `/supply-journeys` — lộ trình cung ứng
- `/mailbox` — hộp thư chung
- `/reports` — báo cáo
- `/admin/users` — quản trị người dùng và quyền

Trong development, MSW tự khởi động để mô phỏng API. Khi chạy production, đặt `NEXT_PUBLIC_MSW_ENABLED=false` và cung cấp API thật qua `NEXT_PUBLIC_API_BASE_URL`.

## Kiểm tra chất lượng

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

Sinh lại TypeScript types từ OpenAPI:

```bash
pnpm generate:contracts
```

## Docker trên Ubuntu

```bash
docker compose build web
docker compose up -d web
```

Docker Compose hiện phục vụ frontend. Production cần API backend tương ứng; không bật fixture cho môi trường thật.

## Thiết kế và tài liệu

- [Thiết kế Figma](https://www.figma.com/design/bbLcUuOo0iyVbgroPGS8Mc)
- [Bản trình bày HTML](./presentation/candidate-cms-presentation.html)
- [PRODUCT.md](./PRODUCT.md) — mục tiêu, người dùng và ranh giới sản phẩm
- [Tổng quan tài liệu](./docs/00-tong-quan.md)
- [Roadmap UI/UX](./docs/backlogs/00-ui-ux-roadmap.md)
- [OpenAPI contract](./packages/contracts/openapi/cms.yaml)

## Cấu trúc repository

```text
apps/web/                 Next.js frontend
packages/contracts/       OpenAPI và generated TypeScript types
tests/e2e/                Playwright smoke và critical-path tests
docs/                     SRS, kiến trúc, ERD, UI/UX và backlog
presentation/             HTML deck trình bày dự án
```

## Nguyên tắc ranh giới

- CMS chỉ dành cho nhân viên nội bộ; không xây candidate portal trong baseline này.
- Candidate, Application, Interview và Supply Journey là các lớp dữ liệu riêng.
- Supply Journey là lộ trình cung ứng nhân sự, không phải hệ thống quản lý chuyến bay.
- Không dùng AI để tự quyết định đỗ/trượt.
- Không đưa PII, nội dung email thật, credential, file upload hoặc backup production vào Git.

`.gitignore` loại dependency, build output, secrets, dữ liệu runtime, file agent/skill và script cục bộ khỏi repository.
