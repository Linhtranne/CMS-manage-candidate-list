import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { hashPassword } from '../src/modules/identity-access/infrastructure/password-hasher.js';

const { Pool } = pg;

function loadLocalEnv(): void {
  try {
    const contents = readFileSync(new URL('../../../.env', import.meta.url), 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {
    // The script also works with values supplied directly by the shell.
  }
}

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL?.trim() || 'postgresql://cms_owner:cms_owner_dev@localhost:5432/cms_candidate_supply';
const email = (process.env.LOCAL_AUTH_EMAIL?.trim() || 'admin@local.test').toLowerCase();
const password = process.env.LOCAL_AUTH_PASSWORD || 'LocalOnly-2026!';
const displayName = process.env.LOCAL_AUTH_DISPLAY_NAME?.trim() || 'Local Admin';
const roles = [...new Set((process.env.LOCAL_AUTH_ROLES || 'MANAGER,CONFIG_ADMIN').split(',').map((role) => role.trim().toUpperCase()).filter(Boolean))];

if (password.length < 8 || password.length > 128) throw new Error('LOCAL_AUTH_PASSWORD must be between 8 and 128 characters');
if (roles.length === 0) throw new Error('LOCAL_AUTH_ROLES must contain at least one role');

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const team = await client.query<{ id: string }>(
    `INSERT INTO teams (code, name, status)
     VALUES ('LOCAL', 'Local Development', 'ACTIVE')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE', updated_at = now()
     RETURNING id`,
  );
  const teamId = team.rows[0]?.id;
  if (!teamId) throw new Error('Unable to provision local team');

  for (const role of roles) {
    await client.query(
      `INSERT INTO roles (code, description)
       VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, updated_at = now()`,
      [role, `Local development role ${role}`],
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await client.query<{ id: string }>(
    `INSERT INTO users (id, display_name, email, password_hash, status, team_id)
     VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
     ON CONFLICT (email) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       password_hash = EXCLUDED.password_hash,
       status = 'ACTIVE',
       team_id = EXCLUDED.team_id,
       updated_at = now()
     RETURNING id`,
    [randomUUID(), displayName, email, passwordHash, teamId],
  );
  const userId = user.rows[0]?.id;
  if (!userId) throw new Error('Unable to provision local user');

  await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
  for (const role of roles) {
    await client.query(
      `INSERT INTO user_roles (user_id, role_id, scope)
       SELECT $1, id, $2 FROM roles WHERE code = $3
       ON CONFLICT (user_id, role_id, scope) DO NOTHING`,
      [userId, role === 'CONFIG_ADMIN' ? 'COMPANY' : 'TEAM', role],
    );
  }

  const interviewTemplate = await client.query<{ id: string }>(
    `INSERT INTO interview_question_templates (id, code, name)
     VALUES ($1, 'LOCAL_DEFAULT_INTERVIEW', 'Local interview questions')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
     RETURNING id`,
    [randomUUID()],
  );
  const interviewTemplateId = interviewTemplate.rows[0]?.id;
  if (!interviewTemplateId) throw new Error('Unable to provision local interview template');
  const activeInterviewVersion = await client.query(
    `SELECT id FROM interview_question_template_versions
     WHERE template_id = $1 AND status = 'ACTIVE' LIMIT 1`,
    [interviewTemplateId],
  );
  if (activeInterviewVersion.rowCount === 0) {
    const latestVersion = await client.query<{ version: number }>(
      `SELECT COALESCE(MAX(version), 0)::int AS version
       FROM interview_question_template_versions WHERE template_id = $1`,
      [interviewTemplateId],
    );
    await client.query(
      `INSERT INTO interview_question_template_versions
       (id, template_id, version, status, questions)
       VALUES ($1, $2, $3, 'ACTIVE', $4::jsonb)`,
      [randomUUID(), interviewTemplateId, (latestVersion.rows[0]?.version ?? 0) + 1, JSON.stringify([{ type: 'GENERAL', prompt: 'Local interview question' }])],
    );
  }
  await client.query('COMMIT');
  console.log(`Local user provisioned: ${email} (${roles.join(', ')})`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
