# Local password authentication

Adds a nullable `users.password_hash` column for the local/internal email-password login flow.

Passwords are stored only as scrypt hashes. The local seed command is repeatable and must not be used as a production user-provisioning mechanism:

```text
pnpm --filter @cms/api db:seed:local
```

Set `LOCAL_AUTH_EMAIL`, `LOCAL_AUTH_PASSWORD`, `LOCAL_AUTH_DISPLAY_NAME`, and `LOCAL_AUTH_ROLES` in the local environment to override the development defaults. OIDC remains a separate optional provider path and is not exposed by the local login screen.
