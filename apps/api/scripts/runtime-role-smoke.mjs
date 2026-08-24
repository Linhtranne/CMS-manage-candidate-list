import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedRole = process.env.DATABASE_RUNTIME_ROLE?.trim();
if (!databaseUrl || !expectedRole) {
  console.error('RUNTIME_ROLE_SMOKE_BLOCKED: DATABASE_URL and DATABASE_RUNTIME_ROLE are required');
  process.exit(2);
}

let urlRole;
try {
  urlRole = decodeURIComponent(new URL(databaseUrl).username);
} catch {
  console.error('RUNTIME_ROLE_SMOKE_FAILED: DATABASE_URL is not a valid URL');
  process.exit(1);
}
if (expectedRole === 'cms_api' || urlRole !== expectedRole) {
  console.error('RUNTIME_ROLE_SMOKE_FAILED: runtime role does not match DATABASE_URL or is the NOLOGIN cms_api role');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const result = await client.query(`
    SELECT current_user AS current_user,
           rolcanlogin,
           has_schema_privilege(current_user, 'public', 'USAGE') AS public_schema_usage
    FROM pg_roles
    WHERE rolname = current_user
  `);
  const row = result.rows[0];
  if (!row || row.current_user !== expectedRole || row.rolcanlogin !== true || row.public_schema_usage !== true) {
    console.error('RUNTIME_ROLE_SMOKE_FAILED: current database role is not a LOGIN role with public schema usage');
    process.exit(1);
  }
  console.log(JSON.stringify({ status: 'runtime_role_ok', role: row.current_user, canLogin: row.rolcanlogin, publicSchemaUsage: row.public_schema_usage }));
} catch (error) {
  console.error(`RUNTIME_ROLE_SMOKE_FAILED: ${error instanceof Error ? error.message : 'database connection failed'}`);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
