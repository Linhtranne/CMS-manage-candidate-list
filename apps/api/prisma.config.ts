import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `db:migrate:deploy` validates DATABASE_URL before invoking Prisma.
    // Local Compose defaults only; CI/staging/production must inject DATABASE_URL.
    url: process.env.DATABASE_URL ?? 'postgresql://cms_owner:cms_owner_dev@localhost:5432/cms_candidate_supply',
  },
});
