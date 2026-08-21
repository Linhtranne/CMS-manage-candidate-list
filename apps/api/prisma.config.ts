import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `db:migrate:deploy` validates DATABASE_URL before invoking Prisma.
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/cms_candidate_supply',
  },
});
