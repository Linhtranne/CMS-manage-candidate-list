# Japan Candidate Supply CMS

CMS nội bộ cho bộ phận Kinh doanh/Tuyển dụng quản lý ứng viên đa ngành và cung ứng nhân sự sang Nhật. Ứng viên không đăng nhập CMS; mọi trao đổi chính danh đi qua hộp thư chung và được lưu vết.

## Trạng thái Sprint 3

Sprint 0–3 đã có frontend/mock runtime chạy được:

- Next.js App Router + TypeScript strict, Tailwind CSS v4, font Be Vietnam Pro local.
- OpenAPI contract sinh type tự động, `openapi-fetch`, TanStack Query, MSW fixtures.
- App shell permission-aware với bảy khu vực: Việc của tôi, Khách hàng & Đơn hàng, Ứng viên, Ứng tuyển & Phỏng vấn, Lộ trình cung ứng, Hộp thư chung, Báo cáo.
- Design primitives: Button, StatusLabel, EmptyState, LoadingState, ErrorState; không dùng icon/emoji để thay cho nhãn nghiệp vụ.
- URL state cho list, saved view theo quyền, bảng generic và detail drawer.
- Sprint 1: hàng đợi công việc, khách hàng, đơn tuyển và thêm ứng viên vào đơn.
- Sprint 2: pipeline ứng tuyển, nhiều vòng phỏng vấn, kết quả/quyết định và cổng khởi tạo journey.
- Sprint 3: danh sách/chi tiết lộ trình cung ứng, milestone guard, evidence, blocker/waiver, departure tùy chọn; shared inbox, immutable thread, queued send, unmatched review, quarantine và conflict.
- Health route, Playwright + axe smoke test, Docker Compose và Docker image chạy non-root.

## Chạy local

Yêu cầu Node 22 và pnpm 11.6+.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Mở `http://localhost:3000/work`, `http://localhost:3000/supply-journeys` hoặc `http://localhost:3000/mailbox`.

Ở development, MSW tự khởi động để mô phỏng `GET /api/v1/me`, search, login và saved views. Production không dùng fixture: App shell yêu cầu phiên thật từ `GET /api/v1/me`. Nếu đổi `NEXT_PUBLIC_API_BASE_URL`, cần truyền giá trị đó ở bước Docker build vì đây là biến public được Next.js đóng gói vào client.

Quality gate:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

Contract được sinh lại bằng:

```powershell
pnpm generate:contracts
```

## Docker trên Ubuntu

```bash
docker compose config --quiet
docker compose build web
docker compose up -d web
```

Health check: `GET /api/health`. Image chạy bằng user non-root, filesystem read-only và có `/tmp` riêng. Biến môi trường production lấy từ `.env.example`; không commit `.env`.

## Cấu trúc chính

```text
apps/web/                 Next.js CMS frontend
packages/contracts/       OpenAPI YAML và generated TypeScript types
tests/e2e/                Playwright + axe release smoke tests
docs/                     SRS, ERD, UI/UX guideline và backlog Sprint 0–4
presentation/             HTML deck dùng để trình bày dự án
```

## Tài liệu nguồn

- [PRODUCT.md](./PRODUCT.md): mục tiêu, người dùng, phạm vi và nguyên tắc sản phẩm.
- [docs/00-tong-quan.md](./docs/00-tong-quan.md) đến [docs/15-truy-vet-yeu-cau.md](./docs/15-truy-vet-yeu-cau.md): yêu cầu, domain, email hub, quyền, vận hành và nghiệm thu.
- [docs/ui-ux/00-index.md](./docs/ui-ux/00-index.md): chỉ mục tám khu vực UI/UX.
- [docs/backlogs/00-ui-ux-roadmap.md](./docs/backlogs/00-ui-ux-roadmap.md): roadmap và các implementation plan.
- [presentation/candidate-cms-presentation.html](./presentation/candidate-cms-presentation.html): bản trình bày độc lập.

## Git và dữ liệu nhạy cảm

`.gitignore` loại dependency, build output, secrets, dữ liệu ứng viên/email, backup, script hỗ trợ và các file agent/skill sinh tự động. Chỉ đưa tài liệu thiết kế, presentation và source đã được review vào Git; không commit PII, credential, attachment email hoặc dữ liệu production.

## Phạm vi chưa nhận là hoàn tất

Sprint 3 vẫn là frontend/mock runtime, chưa phải toàn bộ sản phẩm production: backend NestJS, Prisma migration, PostgreSQL, Redis/worker, email provider thật, object storage, audit persistence và permission enforcement phía API sẽ được triển khai ở các sprint tiếp theo theo backlog.
