import { Client } from 'pg';

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('QUERY_PLAN_SMOKE_BLOCKED: TEST_DATABASE_URL or DATABASE_URL is required');
  process.exit(2);
}

const client = new Client({ connectionString });
await client.connect();
try {
  const team = await client.query('SELECT id FROM teams ORDER BY id LIMIT 1');
  const teamId = team.rows[0]?.id ?? '00000000-0000-0000-0000-000000000000';
  const plans = {};
  const queries = {
    candidate_scoped_cursor: [
      `SELECT id, updated_at FROM candidates WHERE team_id = $1 AND record_status = 'ACTIVE' ORDER BY updated_at DESC, id DESC LIMIT 100`,
      [teamId],
    ],
    application_scoped_view: [
      `SELECT id, updated_at FROM applications WHERE team_id = $1 AND status NOT IN ('PASSED', 'FAILED', 'WITHDRAWN') ORDER BY updated_at DESC, id DESC LIMIT 100`,
      [teamId],
    ],
    interview_participant_overlap: [
      `SELECT i.id FROM interviews i JOIN interview_participants p ON p.interview_id = i.id WHERE p.user_id = $1 AND i.schedule_status = 'SCHEDULED' AND i.scheduled_at < $2 AND i.scheduled_end_at > $3 LIMIT 1`,
      ['00000000-0000-0000-0000-000000000000', new Date(Date.now() + 3_600_000), new Date()],
    ],
  };
  for (const [name, [sql, params]] of Object.entries(queries)) {
    const result = await client.query(`EXPLAIN (FORMAT JSON) ${sql}`, params);
    plans[name] = result.rows[0]['QUERY PLAN'][0];
  }
  console.log(JSON.stringify({ status: 'query_plan_smoke_ok', database: new URL(connectionString).hostname, plans }, null, 2));
} finally {
  await client.end();
}
