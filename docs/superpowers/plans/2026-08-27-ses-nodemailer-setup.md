# SES/Nodemailer setup plan

> **For implementation:** execute this plan in the current workspace, preserving the existing `FAKE`/`DISABLED` fail-closed defaults.

## Goal

Wire Amazon SES SMTP through Nodemailer behind the existing `SMTP_IMAP` runtime contract and DEC-003 approval gate, without exposing credentials or enabling real delivery accidentally.

## Tasks

1. Add failing adapter/config tests for SMTP settings, secret-safe error handling, health checks, and send mapping.
2. Add the Nodemailer dependency and implement an outbound-only SES SMTP adapter. Unsupported inbound operations must fail explicitly.
3. Extend runtime mail configuration with validated SMTP endpoint/port/credentials and bind the adapter only for approved `SMTP_IMAP`.
4. Preserve `DISABLED` and `FAKE` behavior and add `.env.example` placeholders plus operator instructions; never commit credential values.
5. Run targeted tests, API typecheck/lint/build, and report the remaining external steps: DNS verification, sandbox recipient verification, DEC-003 approval, and local secret injection.

## Verification

- `pnpm --filter @cms/api exec vitest run test/providers/mail-provider-ses.spec.ts`
- `pnpm --filter @cms/api typecheck`
- `pnpm --filter @cms/api lint`
- `pnpm --filter @cms/api build`
