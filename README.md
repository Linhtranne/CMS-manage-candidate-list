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

Local mặc định dùng API thật ở `http://localhost:3100/api/v1`, PostgreSQL/Redis trong Docker, OIDC tắt, mailbox provider `DISABLED`, và MSW tắt. Không đặt credential production vào `.env`.

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
```

Seed mặc định là repeatable và chỉ dành cho local. Tài khoản mặc định:

Lệnh seed cũng tạo một interview-question template local ở trạng thái `ACTIVE`, để luồng lên lịch phỏng vấn trên UI chạy được ngay sau khi khởi động.

| Email | Password | Role |
| --- | --- | --- |
| `admin@local.test` | `LocalOnly-2026!` | `MANAGER`, `CONFIG_ADMIN` |

Có thể đổi tài khoản seed bằng `LOCAL_AUTH_EMAIL`, `LOCAL_AUTH_PASSWORD`, `LOCAL_AUTH_DISPLAY_NAME` và `LOCAL_AUTH_ROLES` trong `.env`, sau đó chạy lại `db:seed:local`.

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
docker compose up -d --build api web
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
- `MAIL_PROVIDER=DISABLED` là mặc định an toàn. Provider thật cần approval record tương ứng.
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
