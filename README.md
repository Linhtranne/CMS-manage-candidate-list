# Japan Candidate Supply CMS

CMS nội bộ cho đội Kinh doanh, Tuyển dụng và Điều phối quản lý ứng viên đa ngành, khách hàng Nhật, Job Order, Application/Interview, Supply Journey, mailbox và báo cáo vận hành.

Ứng viên không đăng nhập vào CMS. Nhân viên nội bộ đăng nhập bằng email/password ở local; OIDC, provider email thật, object storage và các activation gate production vẫn được bật fail-closed.

## Quick start local bằng Docker

### Yêu cầu

- Docker Desktop đang chạy và có Compose v2.
- Node.js `>=22.15`.
- pnpm `>=11.6` (`corepack enable` nếu máy chưa có pnpm).
- Cổng trống: `3000` (web), `3100` (API), `5432` (PostgreSQL), `6379` (Redis).

### 1. Tạo môi trường local

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Local mặc định dùng API thật ở `http://localhost:3100/api/v1`, PostgreSQL/Redis trong Docker, OIDC tắt, mailbox provider `FAKE` (không gửi mail ra ngoài), queue worker/scheduler local và MSW tắt. Không đặt credential production vào `.env`.

### 2. Cài dependency và khởi động database

```bash
pnpm install --frozen-lockfile
docker compose up -d postgres redis
```

### 3. Apply migration và tạo tài khoản local

```bash
pnpm --filter @cms/api db:migrate:deploy
pnpm --filter @cms/api db:migrate:status
pnpm --filter @cms/api db:seed:local
pnpm --filter @cms/api db:seed:local-data
```

Seed mặc định là repeatable và chỉ dành cho local. Tài khoản mặc định:

Lệnh seed cũng tạo một interview-question template local ở trạng thái `ACTIVE`, để luồng lên lịch phỏng vấn trên UI chạy được ngay sau khi khởi động.

| Email | Password | Role |
| --- | --- | --- |
| `admin@local.test` | `LocalOnly-2026!` | `MANAGER`, `CONFIG_ADMIN` |
| `demo.admin@local.test` | `LocalDemo-2026!` | `CONFIG_ADMIN`, `MANAGER` |
| `demo.manager@local.test` | `LocalDemo-2026!` | `MANAGER` |
| `demo.recruiter@local.test` | `LocalDemo-2026!` | `RECRUITER` |
| `demo.coordinator@local.test` | `LocalDemo-2026!` | `JAPAN_COORDINATOR` |
| `demo.business@local.test` | `LocalDemo-2026!` | `BUSINESS` |

`db:seed:local-data` nạp bộ dữ liệu nghiệp vụ repeatable để review UI: 4 khách hàng, 4 đơn tuyển, 8 ứng viên, 6 hồ sơ ứng tuyển, 3 lịch phỏng vấn, mailbox, supply journey, task, tài liệu và dữ liệu báo cáo. Seed chỉ thêm/cập nhật bản ghi local; lịch sử/audit append-only của các lần chạy trước được giữ nguyên theo policy bảo toàn truy vết.

Có thể đổi tài khoản seed bằng `LOCAL_AUTH_EMAIL`, `LOCAL_AUTH_PASSWORD`, `LOCAL_AUTH_DISPLAY_NAME` và `LOCAL_AUTH_ROLES` trong `.env`, sau đó chạy lại `db:seed:local`.

Nếu đổi `MAIL_SENDER_ADDRESS` cho SES, chạy lại `pnpm --filter @cms/api db:seed:local-data` để mailbox demo dùng đúng địa chỉ From (seed vẫn giữ provider `FAKE` cho tới khi bạn chủ động chuyển adapter).

Ví dụ tạo recruiter local bằng PowerShell:

```powershell
$env:LOCAL_AUTH_EMAIL = 'recruiter@local.test'
$env:LOCAL_AUTH_PASSWORD = 'LocalRecruiter-2026!'
$env:LOCAL_AUTH_DISPLAY_NAME = 'Local Recruiter'
$env:LOCAL_AUTH_ROLES = 'RECRUITER'
pnpm --filter @cms/api db:seed:local
Remove-Item Env:LOCAL_AUTH_EMAIL,Env:LOCAL_AUTH_PASSWORD,Env:LOCAL_AUTH_DISPLAY_NAME,Env:LOCAL_AUTH_ROLES
```

### 4. Build và chạy web/API

```bash
docker compose --profile queue up -d --build api web worker scheduler
docker compose ps
```

Mở:

- Web: [http://localhost:3000/login](http://localhost:3000/login)
- API liveness: [http://localhost:3100/api/v1/health/live](http://localhost:3100/api/v1/health/live)
- API readiness: [http://localhost:3100/api/v1/health/ready](http://localhost:3100/api/v1/health/ready)

Đăng nhập bằng tài khoản seed rồi vào `/work`. Các route chính:

| Route | Chức năng |
| --- | --- |
| `/candidates` | Candidate master và hồ sơ nghề nghiệp |
| `/clients` | Khách hàng/receiving organization |
| `/orders` | Job Order, trạng thái và pipeline |
| `/applications` | Application, Interview và decision |
| `/supply-journeys` | Supply Journey và milestone |
| `/mailbox` | Shared mailbox nội bộ |
| `/reports` | Báo cáo vận hành |
| `/admin/users` | User/role administration |

Nếu thay đổi `NEXT_PUBLIC_API_BASE_URL`, phải build/recreate web để giá trị được nhúng vào Next.js:

```bash
docker compose build web
docker compose up -d web
```

## Chạy không dùng Docker cho web

Có thể dùng Docker cho PostgreSQL/Redis và chạy Next.js bằng pnpm:

```bash
docker compose up -d postgres redis
pnpm --filter @cms/api db:migrate:deploy
pnpm --filter @cms/api db:seed:local
pnpm --filter @cms/web dev
```

Trong trường hợp này `.env` phải giữ `NEXT_PUBLIC_API_BASE_URL=http://localhost:3100/api/v1`, còn API có thể chạy riêng bằng:

```bash
pnpm --filter @cms/api dev
```

## Kiểm tra chất lượng

Chạy từ repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm docs:validate
```

Frontend E2E dùng Playwright:

```bash
pnpm e2e
```

Sinh lại TypeScript contract từ OpenAPI:

```bash
pnpm generate:contracts
```

## Dừng và reset dữ liệu local

```bash
docker compose down
```

Lệnh trên giữ volume dữ liệu. Muốn reset toàn bộ database/Redis local (mất dữ liệu synthetic) mới dùng:

```bash
docker compose down -v
```

Sau reset, chạy lại bước migration và seed ở trên.

## Cấu hình và activation gate

- `.env.example` chỉ chứa giá trị development an toàn; `.env` không được commit.
- Local login là email/password. OIDC không cần để chạy local và không xuất hiện trên màn hình login.
- Local dùng `MAIL_PROVIDER=FAKE`, chỉ lưu/đẩy mail synthetic qua worker, không gửi ra Internet. `MAIL_MODE=NOTIFICATION_ONLY` là mặc định: trạng thái ứng tuyển/lịch phỏng vấn có thể tạo email một chiều từ `MAIL_SENDER_ADDRESS`, còn reply, inbound ingest, soạn thư và liên kết thủ công đều bị khóa.
- `MAIL_SENDER_ADDRESS` phải là địa chỉ `noreply` thuộc miền công ty khi triển khai thật. Provider thật vẫn cần adapter cụ thể, credential, DNS mail (SPF/DKIM/DMARC) và approval record DEC-003; khi thiếu bất kỳ điều kiện nào hệ thống giữ fail-closed.
- Khi đã có SES SMTP credential, xem [hướng dẫn setup SES + Nodemailer local](docs/backend/decisions/DEC-003-local-ses-setup.md). Không commit SMTP password; local seed vẫn dùng `FAKE` cho tới khi bạn chủ động đổi provider.
- Catalog production, document storage, bulk export, purge, break-glass và các tính năng rủi ro cao chỉ bật khi có approval artifact đúng decision register.
- API không tự chạy migration khi boot; migration là release/local step riêng.

## Cấu trúc repository

```text
apps/api/                 NestJS API, Prisma, workers và scheduler
apps/web/                 Next.js frontend
packages/contracts/       OpenAPI canonical contract và generated types
apps/api/prisma/          Schema và migrations
tests/e2e/                Playwright UI tests
docs/                     BRD/SRS, kiến trúc, dữ liệu, vận hành và backend handoff
docs/backend/             Contract, security, release gates và phase plans
```

Tài liệu chính:

- [Hướng dẫn sử dụng HTML tự chứa có ảnh](./presentation/candidate-cms-presentation.html)
- [Bản nguồn Markdown](./docs/USER_GUIDE.md)
- [Thiết kế Figma chính · cập nhật toàn bộ UI](https://www.figma.com/design/YAg8I8FmOutAuUQGTBznFp)
- [Figma bản tham chiếu UI coverage](https://www.figma.com/design/3ANKdwAmkgK6Bm7LcqgmP4)
- [PRODUCT.md](./PRODUCT.md)
- [Tổng quan sản phẩm](./docs/00-tong-quan.md)
- [Backend Production Handoff](./docs/backend/README.md)
- [Implementation plans Phase 0–4](./docs/backend/plans/README.md)
- [OpenAPI contract](./packages/contracts/openapi/cms.yaml)

## Ranh giới an toàn

- CMS chỉ dành cho nhân viên nội bộ; không có candidate portal trong baseline.
- Candidate, Application, Interview và Supply Journey là các aggregate/lớp dữ liệu riêng.
- Không dùng AI để tự quyết định đỗ/trượt.
- Không commit PII thật, email thật, credential, upload, backup, `.env`, build output hoặc runtime data.
