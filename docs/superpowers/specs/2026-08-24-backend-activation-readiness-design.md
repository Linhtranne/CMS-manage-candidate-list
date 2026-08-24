# Backend Activation Readiness Design

**Status:** approved for implementation by the user on 2026-08-24

## Goal

Make the backend production-activation path complete without requiring real provider credentials during development. Every high-risk capability must have a typed runtime contract, explicit activation evidence, a real composition point, and a fail-closed default.

## Scope

This change covers runtime configuration and activation records, provider/storage/scanner composition, queue startup safety, database runtime-role handoff, security/release evidence, and the verification gates needed before staging or production promotion.

It does not select an IdP, mail provider, object-storage vendor, scanner vendor, or invent approval records. Those remain external decisions and are injected later through secret management and approved artifacts.

## Design

1. **Activation contract:** Extend the configuration model with explicit typed feature gates and server-owned approval-record paths. Env values select wiring only when the corresponding activation record is valid for the current environment; otherwise startup or the command fails closed.
2. **Composition:** Keep disabled adapters as the safe default. Add injectable factories for object storage, malware scanning, mail provider delegates, export, and retention so real implementations can be bound without changing domain services. A configured-but-unbound provider fails at composition time.
3. **Queue safety:** Keep strict-environment queue startup blocked until a production handler registry is present and every enabled queue has a registered processor. Worker and scheduler health must be observable.
4. **Release evidence:** Keep production release preflight tied to pinned image digests, a clean worktree, migration compatibility, approved decision IDs, named signatories, security artifacts, load/restore evidence, and UAT evidence.

## Non-goals

- No real secrets, provider tokens, or credentials are committed.
- No production feature is enabled solely by an environment variable.
- No destructive database reset or broad cleanup of existing user changes.

## Verification

- Unit/config tests cover missing, malformed, out-of-scope, and approved activation records.
- Composition tests prove disabled, fake, and configured-but-unbound paths.
- Typecheck, lint, contract tests, API tests, build, migration status, and Docker health/readiness smoke must pass.
- Production-only external evidence remains explicitly listed as blocked until supplied by owners.
