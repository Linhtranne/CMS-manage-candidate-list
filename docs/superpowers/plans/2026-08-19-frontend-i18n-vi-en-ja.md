# Frontend i18n VI/EN/JA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển toàn bộ giao diện CMS sang i18n type-safe với tiếng Việt mặc định, English và Japanese, không còn hard text do ứng dụng sở hữu trong production frontend.

**Architecture:** Root layout đọc cookie `cms_locale` rồi truyền locale hợp lệ vào client-side `I18nProvider`; provider cung cấp translator, formatter `Intl` và đổi ngôn ngữ không reload. Dictionary tiếng Việt là schema chuẩn, English/Japanese bị khóa parity ở compile time; từng feature dùng translation key và domain code thay vì nhãn tiếng Việt. Một AST quality gate chạy trong lint để chặn hard text quay lại.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9 strict, Vitest, Testing Library, `Intl`, `@fontsource/be-vietnam-pro`, `@fontsource/noto-sans-jp`, TypeScript Compiler API.

**Spec:** `docs/ui-ux/08-i18n-da-ngon-ngu.md`

## Global Constraints

- Locale hỗ trợ chính xác: `vi`, `en`, `ja`; mặc định và fallback cuối là `vi`.
- URL không có locale prefix; trạng thái ngôn ngữ lưu trong cookie `cms_locale` với `SameSite=Lax`, `Path=/`, `Max-Age=31536000`.
- `vi` và `en` dùng Be Vietnam Pro; `ja` dùng Noto Sans JP với weight 400, 600, 700.
- Không dịch tên riêng, mã hồ sơ, nội dung email, ghi chú hoặc dữ liệu do người dùng/backend cung cấp.
- Enum, trạng thái và danh mục hệ thống phải dịch từ code ổn định qua `domain-labels.ts`.
- Không nối các mảnh câu dịch; biến động dùng interpolation đặt tên và số nhiều dùng `Intl.PluralRules`.
- Không để hard text trong JSX, accessibility attributes, validation, toast, loading, empty, error hoặc metadata.
- Mọi thay đổi hành vi phải đi theo RED-GREEN-REFACTOR; sau mỗi task chạy test đích, ESLint và TypeScript.

---

### Task 1: Core locale contract and translator

**Files:**
- Modify: `apps/web/src/i18n/vi.ts` (temporary compatibility re-export; delete in Task 3)
- Create: `apps/web/src/i18n/config.ts`
- Create: `apps/web/src/i18n/types.ts`
- Create: `apps/web/src/i18n/translate.ts`
- Create: `apps/web/src/i18n/translate.test.ts`
- Create: `apps/web/src/i18n/locales/vi.ts`
- Create: `apps/web/src/i18n/locales/en.ts`
- Create: `apps/web/src/i18n/locales/ja.ts`
- Create: `apps/web/src/i18n/locales/parity.test.ts`

**Interfaces:**
- Produces: `Locale = 'vi' | 'en' | 'ja'`, `DEFAULT_LOCALE`, `isLocale(value): value is Locale`, `TranslationKey`, `createTranslator(locale)`, and three parity-checked dictionaries.

- [ ] **Step 1: Write failing tests for locale validation, fallback, interpolation and plural selection**

```ts
expect(isLocale('ja')).toBe(true);
expect(isLocale('fr')).toBe(false);
expect(createTranslator('en')('common.greeting', { name: 'An' })).toBe('Hello, An');
expect(createTranslator('ja')('common.files', { count: 2 })).toBe('2 件のファイル');
```

- [ ] **Step 2: Run the focused tests and confirm they fail because the i18n modules do not exist**

Run: `pnpm --filter @cms/web test -- src/i18n/translate.test.ts src/i18n/locales/parity.test.ts`
Expected: FAIL with unresolved `config`, `translate` and `locales` modules.

- [ ] **Step 3: Implement the minimal typed dictionary and translator**

```ts
export const LOCALES = ['vi', 'en', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'vi';
export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && LOCALES.includes(value as Locale);

export function createTranslator(locale: Locale): Translate {
  return (key, params) => resolveMessage(dictionaries[locale], dictionaries.vi, key, params);
}
```

- [ ] **Step 4: Run focused tests, lint and typecheck**

Run: `pnpm --filter @cms/web test -- src/i18n/translate.test.ts src/i18n/locales/parity.test.ts && pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck`
Expected: PASS; English and Japanese cannot omit or add a Vietnamese key.

- [ ] **Step 5: Commit the core translator**

```powershell
git add apps/web/src/i18n
git commit -m "feat(web): add typed i18n core"
```

### Task 2: Provider, persistence, formatters and locale fonts

**Files:**
- Create: `apps/web/src/i18n/provider.tsx`
- Create: `apps/web/src/i18n/provider.test.tsx`
- Create: `apps/web/src/i18n/use-i18n.ts`
- Create: `apps/web/src/i18n/test-utils.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `Locale`, `DEFAULT_LOCALE`, `createTranslator` from Task 1.
- Produces: `I18nProvider`, `useI18n()` returning `{ locale, setLocale, t, formatDate, formatDateTime, formatTime, formatNumber, formatPercent }`, and `renderWithI18n(ui, locale)` for tests.

- [ ] **Step 1: Write failing provider tests**

```tsx
expect(screen.getByText('Save')).toBeInTheDocument();
await user.selectOptions(screen.getByLabelText('Language'), 'ja');
expect(document.documentElement.lang).toBe('ja');
expect(document.cookie).toContain('cms_locale=ja');
expect(result.current.formatNumber(1234.5)).toBe('1,234.5');
```

- [ ] **Step 2: Run provider tests and confirm missing provider behavior**

Run: `pnpm --filter @cms/web test -- src/i18n/provider.test.tsx`
Expected: FAIL because provider and hook are not implemented.

- [ ] **Step 3: Implement provider, cookie persistence and Intl formatters**

```tsx
const value = useMemo<I18nContextValue>(() => ({
  locale,
  setLocale(next) {
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    document.documentElement.lang = next;
    updateLocale(next);
  },
  t: createTranslator(locale),
  formatNumber: (value, options) => new Intl.NumberFormat(INTL_LOCALES[locale], options).format(value)
}), [locale]);
```

- [ ] **Step 4: Make root layout read `cookies()` and install/load Noto Sans JP**

Run: `pnpm --filter @cms/web add @fontsource/noto-sans-jp@5.2.9`
Expected: dependency and lockfile update; `layout.tsx` renders `<html lang={locale}>` and wraps children with `I18nProvider`.

- [ ] **Step 5: Run provider tests, lint and typecheck**

Run: `pnpm --filter @cms/web test -- src/i18n/provider.test.tsx && pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck`
Expected: PASS with cookie, `lang`, formatter and font wiring type-safe.

- [ ] **Step 6: Commit provider and font integration**

```powershell
git add apps/web/src/i18n apps/web/src/app apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): persist locale and format values"
```

### Task 3: Language switcher, auth and application shell

**Files:**
- Create: `apps/web/src/components/layout/language-switcher.tsx`
- Create: `apps/web/src/components/layout/language-switcher.test.tsx`
- Modify: `apps/web/src/app/(auth)/login/page.tsx`
- Modify: `apps/web/src/app/session-expired/page.tsx`
- Modify: `apps/web/src/app/forbidden/page.tsx`
- Modify: `apps/web/src/components/auth/authenticated-cms.tsx`
- Modify: `apps/web/src/components/layout/topbar.tsx`
- Modify: `apps/web/src/components/layout/sidebar.tsx`
- Modify: `apps/web/src/components/layout/cms-shell.tsx`
- Modify: `apps/web/src/components/layout/global-search.tsx`
- Modify: `apps/web/src/components/layout/notification-menu.tsx`
- Modify: `apps/web/src/constants/navigation.ts`
- Delete: `apps/web/src/i18n/vi.ts`
- Test: existing auth/layout tests under `apps/web/src/app` and `apps/web/src/components/layout`.

**Interfaces:**
- Consumes: `useI18n()` from Task 2.
- Produces: `<LanguageSwitcher />`; navigation constants expose `labelKey: TranslationKey` rather than resolved Vietnamese labels.

- [ ] **Step 1: Write failing switcher and shell regression tests**

```tsx
expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
await user.selectOptions(screen.getByRole('combobox'), 'ja');
expect(screen.getByRole('navigation', { name: 'CMS navigation' })).toBeInTheDocument();
expect(screen.getByText('候補者')).toBeInTheDocument();
```

- [ ] **Step 2: Run focused tests and confirm English/Japanese labels are absent**

Run: `pnpm --filter @cms/web test -- src/components/layout src/app/'(auth)'/login/page.test.tsx src/app/session-expired/page.test.tsx`
Expected: FAIL on missing language selector and untranslated labels.

- [ ] **Step 3: Implement the compact text selector and migrate auth/shell strings**

```tsx
const { locale, setLocale, t } = useI18n();
return <select aria-label={t('common.language.label')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
  <option value="vi">VI</option><option value="en">EN</option><option value="ja">日本語</option>
</select>;
```

- [ ] **Step 4: Resolve navigation labels at render time**

```tsx
{navigation.map((item) => <Link key={item.href} href={item.href as Route}>{t(item.labelKey)}</Link>)}
```

- [ ] **Step 5: Run auth/layout tests, lint and typecheck**

Run: `pnpm --filter @cms/web test -- src/components/layout src/components/auth src/app/'(auth)'/login/page.test.tsx src/app/session-expired/page.test.tsx && pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck`
Expected: PASS; changing locale keeps pathname and existing component state.

- [ ] **Step 6: Commit the translated shell**

```powershell
git add apps/web/src/components apps/web/src/app apps/web/src/constants/navigation.ts apps/web/src/i18n/locales
git commit -m "feat(web): localize auth and cms shell"
```

### Task 4: Shared UI and domain label adapters

**Files:**
- Create: `apps/web/src/i18n/domain-labels.ts`
- Create: `apps/web/src/i18n/domain-labels.test.ts`
- Modify: all production files in `apps/web/src/components/ui/`.
- Modify: `apps/web/src/features/mail/domain/email-status-label.ts`
- Modify: `apps/web/src/features/candidates/domain/derive-operational-phase.ts`
- Modify: `apps/web/src/features/applications/domain/derive-application-stage.ts`
- Modify: `apps/web/src/features/journeys/domain/derive-journey-health.ts`
- Test: corresponding domain and UI tests.

**Interfaces:**
- Consumes: `Translate`, `TranslationKey` from Task 1.
- Produces: code-to-key mappings and `getDomainLabel(t, domain, code)`; shared modal/list/data-table states only render translation keys.

- [ ] **Step 1: Write failing tests for domain codes and shared UI in Japanese**

```ts
expect(getDomainLabel(createTranslator('ja'), 'applicationStatus', 'WAITING_INTERVIEW')).toBe('面接待ち');
expect(getDomainLabel(createTranslator('en'), 'unknown', 'CUSTOM_VALUE')).toBe('CUSTOM_VALUE');
```

- [ ] **Step 2: Run focused tests and confirm mappings are missing**

Run: `pnpm --filter @cms/web test -- src/i18n/domain-labels.test.ts src/components/ui`
Expected: FAIL on missing adapter and untranslated shared states.

- [ ] **Step 3: Implement code-to-key mappings and migrate shared UI strings**

```ts
const applicationStatusKeys = {
  WAITING_INTERVIEW: 'applications.status.waitingInterview',
  HIRED: 'applications.status.hired'
} as const satisfies Record<string, TranslationKey>;
```

- [ ] **Step 4: Run shared UI/domain tests, lint and typecheck**

Run: `pnpm --filter @cms/web test -- src/i18n/domain-labels.test.ts src/components/ui src/features/mail/domain src/features/candidates/domain src/features/applications/domain src/features/journeys/domain && pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck`
Expected: PASS without converting names, notes or email content.

- [ ] **Step 5: Commit shared UI and domain labels**

```powershell
git add apps/web/src/i18n apps/web/src/components/ui apps/web/src/features/*/domain
git commit -m "feat(web): localize shared ui and domain labels"
```

### Task 5: Operational feature migration

**Files:**
- Modify: production components and schemas under `apps/web/src/features/work/`.
- Modify: production components and schemas under `apps/web/src/features/clients/`.
- Modify: production components and schemas under `apps/web/src/features/orders/`.
- Modify: production components and schemas under `apps/web/src/features/candidates/`.
- Modify: production components and schemas under `apps/web/src/features/applications/`.
- Modify: namespaces `work`, `clients`, `orders`, `candidates`, `applications`, `validation` in all three dictionaries.
- Test: all existing tests in those feature directories plus one English/Japanese render assertion per feature.

**Interfaces:**
- Consumes: `useI18n()`, domain label mappings and shared UI from Tasks 2-4.
- Produces: fully localized work queue, client, order, candidate, application and interview flows.

- [ ] **Step 1: Add failing locale render assertions for all five features**

```tsx
renderWithI18n(<CandidateListPage />, 'ja');
expect(await screen.findByRole('heading', { name: '候補者' })).toBeInTheDocument();
renderWithI18n(<ApplicationListPage />, 'en');
expect(await screen.findByText('Applications & interviews')).toBeInTheDocument();
```

- [ ] **Step 2: Run feature tests and confirm hardcoded Vietnamese causes locale failures**

Run: `pnpm --filter @cms/web test -- src/features/work src/features/clients src/features/orders src/features/candidates src/features/applications`
Expected: FAIL only on the newly asserted localized text.

- [ ] **Step 3: Migrate strings feature-by-feature and replace direct `vi-VN` formatting**

```tsx
const { t, formatDateTime, formatNumber } = useI18n();
return <h1>{t('candidates.list.title')}</h1>;
```

Validation factories accept `t` so Zod messages are locale-aware:

```ts
export const createInterviewSchema = (t: Translate) => z.object({
  scheduledAt: z.string().min(1, t('validation.required'))
});
```

- [ ] **Step 4: Run each feature suite after its namespace migration, then run the combined group**

Run: `pnpm --filter @cms/web test -- src/features/work src/features/clients src/features/orders src/features/candidates src/features/applications`
Expected: PASS for Vietnamese regressions and English/Japanese samples.

- [ ] **Step 5: Run lint and typecheck**

Run: `pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck`
Expected: PASS with no direct locale imports or `toLocaleString('vi-VN')` in migrated features.

- [ ] **Step 6: Commit operational features**

```powershell
git add apps/web/src/features apps/web/src/i18n/locales
git commit -m "feat(web): localize candidate operations"
```

### Task 6: Journey, mailbox, report and administration migration

**Files:**
- Modify: production components and schemas under `apps/web/src/features/journeys/`.
- Modify: production components under `apps/web/src/features/mail/`.
- Modify: production components and filters under `apps/web/src/features/reports/`.
- Modify: production components under `apps/web/src/features/admin/`.
- Modify: namespaces `journeys`, `mailbox`, `reports`, `admin`, `validation` in all three dictionaries.
- Test: all existing tests in those feature directories plus one English/Japanese render assertion per feature.

**Interfaces:**
- Consumes: `useI18n()`, domain label mappings and shared UI from Tasks 2-4.
- Produces: fully localized supply journey, auditable mailbox, reporting and RBAC administration flows.

- [ ] **Step 1: Add failing locale render assertions for all four features**

```tsx
renderWithI18n(<MailboxPage />, 'ja');
expect(await screen.findByRole('heading', { name: '共有メールボックス' })).toBeInTheDocument();
renderWithI18n(<ReportPage />, 'en');
expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument();
```

- [ ] **Step 2: Run feature tests and confirm locale assertions fail**

Run: `pnpm --filter @cms/web test -- src/features/journeys src/features/mail src/features/reports src/features/admin`
Expected: FAIL on the new English/Japanese expectations.

- [ ] **Step 3: Migrate all application-owned strings while preserving email/audit data verbatim**

```tsx
const { t, formatDateTime } = useI18n();
return <Modal title={t('mailbox.reply.title')} description={t('mailbox.reply.auditNotice')} />;
```

- [ ] **Step 4: Run each feature suite and combined regression**

Run: `pnpm --filter @cms/web test -- src/features/journeys src/features/mail src/features/reports src/features/admin`
Expected: PASS; message subject/body, attachment names, user names and audit payloads remain unchanged.

- [ ] **Step 5: Run lint and typecheck**

Run: `pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck`
Expected: PASS with all feature namespaces parity-checked.

- [ ] **Step 6: Commit the remaining feature migration**

```powershell
git add apps/web/src/features apps/web/src/i18n/locales
git commit -m "feat(web): localize journeys mailbox reports and admin"
```

### Task 7: Error-code localization and hard-text AST gate

**Files:**
- Create: `apps/web/scripts/check-i18n.mjs`
- Create: `apps/web/scripts/check-i18n.test.mjs`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/lib/api/client.ts`
- Modify: production callers that render `response.error.message` directly.
- Modify: namespace `validation` in all dictionaries.

**Interfaces:**
- Consumes: dictionaries and translation API.
- Produces: `pnpm --filter @cms/web check:i18n`; localized `getErrorMessage(t, error)` using stable `errorCode` and generic fallback.

- [ ] **Step 1: Write executable checker fixtures and failing error mapping tests**

```js
assert.equal(runChecker('export const X=()=> <button>Lưu</button>'), 1);
assert.equal(runChecker("export const X=()=> <button>{t('common.actions.save')}</button>"), 0);
```

- [ ] **Step 2: Run checker tests and confirm the script is missing**

Run: `node apps/web/scripts/check-i18n.test.mjs`
Expected: FAIL because `check-i18n.mjs` does not exist.

- [ ] **Step 3: Implement AST detection and explicit exclusions**

The checker scans production `.tsx`/`.ts`, excludes dictionaries, tests, mocks and fixtures, inspects JSX text plus user-facing attributes and message-producing calls, and prints `file:line:column` for each violation.

```js
if (ts.isJsxText(node) && LETTER_PATTERN.test(node.text)) {
  violations.push(toViolation(sourceFile, node, node.text.trim()));
}
```

- [ ] **Step 4: Add the gate to project scripts and localize API errors**

```json
"check:i18n": "node scripts/check-i18n.mjs",
"lint": "eslint src && pnpm check:i18n"
```

- [ ] **Step 5: Run the checker and eliminate every reported production violation**

Run: `pnpm --filter @cms/web check:i18n`
Expected: `0 hardcoded user-facing strings` and exit code 0.

- [ ] **Step 6: Run lint, typecheck and all tests**

Run: `pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck && pnpm --filter @cms/web test`
Expected: PASS with no raw backend error displayed to users.

- [ ] **Step 7: Commit the quality gate**

```powershell
git add apps/web/scripts apps/web/package.json apps/web/src
git commit -m "chore(web): enforce zero hardcoded ui text"
```

### Task 8: Production build and three-locale browser QA

**Files:**
- Modify only files required to fix defects reproduced during this task.
- Update: `docs/ui-ux/08-i18n-da-ngon-ngu.md` only if implementation evidence changes a documented contract.

**Interfaces:**
- Consumes: complete localized frontend from Tasks 1-7.
- Produces: fresh production build and browser evidence at desktop and 320 px for `vi`, `en`, `ja`.

- [ ] **Step 1: Run the full static and automated gate**

Run: `pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck && pnpm --filter @cms/web test && pnpm --filter @cms/web build`
Expected: zero i18n violations, zero type/lint errors, all Vitest cases pass, all Next routes build.

- [ ] **Step 2: Start the production server with MSW enabled**

Run: `$env:NEXT_PUBLIC_MSW_ENABLED='true'; pnpm --filter @cms/web exec next start -p 4176`
Expected: server listens on `http://127.0.0.1:4176`.

- [ ] **Step 3: Verify shell, representative feature, modal and admin screens in each locale**

Check `/login`, `/work`, `/candidates`, `/applications`, `/supply-journeys`, `/mailbox`, `/reports`, `/admin/users`; change language without reload and confirm URL, form data, open modal and filter state are preserved.

- [ ] **Step 4: Verify responsive layout and Japanese typography**

At 320 px, confirm no horizontal overflow, language selector remains reachable, topbar controls do not overlap, Japanese headings/tables/forms/modals have no tofu glyphs, and browser console contains no error.

- [ ] **Step 5: Re-run the full gate after any browser-found fix**

Run: `pnpm --filter @cms/web lint && pnpm --filter @cms/web typecheck && pnpm --filter @cms/web test && pnpm --filter @cms/web build`
Expected: PASS on fresh output generated after the last source change.

- [ ] **Step 6: Commit verified implementation**

```powershell
git add apps/web docs/ui-ux/08-i18n-da-ngon-ngu.md
git commit -m "feat(web): complete vi en ja localization"
```

## Plan self-review

- Spec coverage: locale persistence, URL stability, type parity, formatter, plural, fonts, selector, domain codes, backend errors, hard-text gate and browser QA all have an owning task.
- Placeholder scan: the plan contains no deferred implementation marker; each code-producing task includes an exact interface, test command and expected result.
- Type consistency: `Locale`, `TranslationKey`, `Translate`, `createTranslator`, `I18nProvider`, `useI18n`, `renderWithI18n` and `getDomainLabel` are introduced before consumption and keep one spelling throughout.
