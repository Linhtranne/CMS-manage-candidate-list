import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { hashPassword } from '../src/modules/identity-access/infrastructure/password-hasher.js';
import { candidateBlindIndex, encryptCandidateValue } from '../src/modules/candidates/infrastructure/candidate.crypto.js';

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
    // Shell-provided values are supported when .env is absent.
  }
}

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL?.trim() || 'postgresql://cms_owner:cms_owner_dev@localhost:5432/cms_candidate_supply';
const encryptionKey = process.env.ENCRYPTION_KEY?.trim() || 'development-only-encryption-key-32';
const senderAddress = process.env.MAIL_SENDER_ADDRESS?.trim() || 'noreply@company.vn';
// Keep the demo mailbox aligned with the explicitly selected local provider.
// The default remains FAKE so a fresh checkout cannot send Internet mail by
// accident; selecting MAIL_PROVIDER=SMTP_IMAP is an intentional opt-in.
const mailboxProvider = process.env.MAIL_PROVIDER?.trim() === 'SMTP_IMAP' ? 'SMTP_IMAP' : 'FAKE';
const password = process.env.LOCAL_DEMO_PASSWORD || 'LocalDemo-2026!';
const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

const ids = {
  team: '10000000-0000-4000-8000-000000000001',
  users: {
    admin: '10000000-0000-4000-8000-000000000101',
    manager: '10000000-0000-4000-8000-000000000102',
    recruiter: '10000000-0000-4000-8000-000000000103',
    coordinator: '10000000-0000-4000-8000-000000000104',
    business: '10000000-0000-4000-8000-000000000105',
  },
  clients: {
    it: '10000000-0000-4000-8000-000000000201',
    mechanical: '10000000-0000-4000-8000-000000000202',
    care: '10000000-0000-4000-8000-000000000203',
    paused: '10000000-0000-4000-8000-000000000204',
  },
  orders: {
    open: '10000000-0000-4000-8000-000000000301',
    hold: '10000000-0000-4000-8000-000000000302',
    filled: '10000000-0000-4000-8000-000000000303',
    draft: '10000000-0000-4000-8000-000000000304',
  },
  candidates: {
    ready: '10000000-0000-4000-8000-000000000401',
    potential: '10000000-0000-4000-8000-000000000402',
    unreachable: '10000000-0000-4000-8000-000000000403',
    paused: '10000000-0000-4000-8000-000000000404',
    archived: '10000000-0000-4000-8000-000000000405',
    duplicate: '10000000-0000-4000-8000-000000000406',
    supplied: '10000000-0000-4000-8000-000000000407',
    multiIndustry: '10000000-0000-4000-8000-000000000408',
  },
  applications: {
    matched: '10000000-0000-4000-8000-000000000501',
    interview: '10000000-0000-4000-8000-000000000502',
    passed: '10000000-0000-4000-8000-000000000503',
    failed: '10000000-0000-4000-8000-000000000504',
    hold: '10000000-0000-4000-8000-000000000505',
    supplied: '10000000-0000-4000-8000-000000000506',
  },
  interviews: {
    scheduled: '10000000-0000-4000-8000-000000000601',
    passed: '10000000-0000-4000-8000-000000000602',
    noShow: '10000000-0000-4000-8000-000000000603',
  },
  mailbox: '10000000-0000-4000-8000-000000000701',
  conversations: {
    needsAction: '10000000-0000-4000-8000-000000000711',
    unmatched: '10000000-0000-4000-8000-000000000712',
    closed: '10000000-0000-4000-8000-000000000713',
    sent: '10000000-0000-4000-8000-000000000714',
  },
  messages: {
    inbound: '10000000-0000-4000-8000-000000000721',
    unmatched: '10000000-0000-4000-8000-000000000722',
    closed: '10000000-0000-4000-8000-000000000723',
    outbound: '10000000-0000-4000-8000-000000000724',
    failed: '10000000-0000-4000-8000-000000000725',
  },
  journey: {
    template: '10000000-0000-4000-8000-000000000801',
    version: '10000000-0000-4000-8000-000000000802',
    active: '10000000-0000-4000-8000-000000000811',
    completed: '10000000-0000-4000-8000-000000000812',
    hold: '10000000-0000-4000-8000-000000000813',
  },
  tasks: {
    rule: '10000000-0000-4000-8000-000000000901',
    new: '10000000-0000-4000-8000-000000000911',
    overdue: '10000000-0000-4000-8000-000000000912',
    completed: '10000000-0000-4000-8000-000000000913',
    waiting: '10000000-0000-4000-8000-000000000914',
  },
  notifications: {
    base: '10000000-0000-4000-8000-000000000921',
  },
  documents: {
    safe: '10000000-0000-4000-8000-000000001001',
    quarantined: '10000000-0000-4000-8000-000000001002',
  },
  importBatch: '10000000-0000-4000-8000-000000001101',
  reports: {
    watermark: '10000000-0000-4000-8000-000000001201',
    export: '10000000-0000-4000-8000-000000001202',
  },
};

const roleActions: Record<string, string[]> = {
  RECRUITER: ['candidate.view', 'candidate.create', 'candidate.update_basic', 'candidate.view_sensitive', 'client.view', 'job_order.view', 'application.view', 'application.create', 'application.update', 'interview.schedule', 'interview.record_result', 'supply_journey.view', 'email.read', 'email.send', 'document.upload', 'document.download', 'task.view', 'task.update', 'report.view'],
  BUSINESS: ['candidate.view', 'candidate.create', 'candidate.update_basic', 'candidate.view_sensitive', 'client.view', 'client.create', 'client.update', 'job_order.view', 'job_order.create', 'job_order.update', 'job_order.transition', 'application.view', 'application.create', 'application.update', 'interview.schedule', 'supply_journey.view', 'email.read', 'email.send', 'document.download', 'task.view', 'task.update', 'report.view'],
  JAPAN_COORDINATOR: ['candidate.view', 'candidate.update_basic', 'candidate.view_sensitive', 'job_order.view', 'application.view', 'application.update', 'interview.schedule', 'interview.record_result', 'supply_journey.view', 'supply_journey.create', 'supply_journey.update_milestone', 'email.read', 'email.send', 'document.upload', 'document.download', 'task.view', 'task.update'],
  MANAGER: ['candidate.view', 'candidate.create', 'candidate.update_basic', 'candidate.view_sensitive', 'candidate.merge', 'candidate.archive', 'client.view', 'client.create', 'client.update', 'job_order.view', 'job_order.create', 'job_order.update', 'job_order.transition', 'application.view', 'application.create', 'application.update', 'application.decide', 'interview.schedule', 'interview.record_result', 'supply_journey.view', 'supply_journey.create', 'supply_journey.update_milestone', 'supply_journey.waive_milestone', 'supply_journey.complete', 'email.read', 'email.send', 'email.manual_link', 'email.retry', 'document.upload', 'document.download', 'document.download_sensitive', 'task.view', 'task.update', 'task.assign', 'report.view', 'export.create', 'audit.view'],
  CONFIG_ADMIN: ['catalog.configure', 'iam.configure', 'audit.view'],
};

const json = (value: unknown) => JSON.stringify(value);
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000);
const hour = (offset: number) => new Date(Date.now() + offset * 3_600_000);

async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await client.query<T>(text, params)).rows;
}

async function first<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T> {
  const row = (await query<T>(text, params))[0];
  if (!row) throw new Error(`Seed query returned no row: ${text.slice(0, 80)}`);
  return row;
}

async function ensureRole(code: string): Promise<string> {
  const row = await first<{ id: string }>(
    `INSERT INTO roles (code, description) VALUES ($1, $2)
     ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, updated_at = now()
     RETURNING id`,
    [code, `Local demo role ${code}`],
  );
  return row.id;
}

async function ensureUser(input: { id: string; email: string; displayName: string; role: string; scope: string; teamId: string; passwordHash: string }): Promise<string> {
  const row = await first<{ id: string }>(
    `INSERT INTO users (id, display_name, email, password_hash, status, team_id)
     VALUES ($1, $2, $3, $4, 'ACTIVE', $5)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash,
       status = 'ACTIVE', team_id = EXCLUDED.team_id, updated_at = now()
     RETURNING id`,
    [input.id, input.displayName, input.email, input.passwordHash, input.teamId],
  );
  const roleId = await ensureRole(input.role);
  await query(
    `INSERT INTO user_roles (user_id, role_id, scope) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, role_id, scope) DO NOTHING`,
    [row.id, roleId, input.scope],
  );
  return row.id;
}

async function ensureCatalog(type: string, code: string, labelVi: string, payload: Record<string, unknown> = {}): Promise<string> {
  const item = await first<{ id: string }>(
    `INSERT INTO catalog_items (id, type, code) VALUES ($1, $2, $3)
     ON CONFLICT (type, code) DO UPDATE SET updated_at = now() RETURNING id`,
    [randomUUID(), type, code],
  );
  const version = await first<{ id: string }>(
    `INSERT INTO catalog_versions (id, item_id, version, status, label_vi, payload, usage_count)
     VALUES ($1, $2, 1, 'ACTIVE', $3, $4::jsonb, 0)
     ON CONFLICT (item_id, version) DO UPDATE SET status = 'ACTIVE', label_vi = EXCLUDED.label_vi, payload = EXCLUDED.payload, updated_at = now()
     RETURNING id`,
    [randomUUID(), item.id, labelVi, json(payload)],
  );
  return version.id;
}

async function ensureClient(input: { id: string; code: string; name: string; status: string; industryLabels: string[]; region: string; ownerId: string; teamId: string; contactId: string }): Promise<string> {
  const row = await first<{ id: string }>(
    `INSERT INTO clients (id, code, name, organization_type, industry_labels, region, owner_id, team_id, status, notes)
     VALUES ($1, $2, $3, 'RECEIVING_ORGANIZATION', $4::jsonb, $5, $6, $7, $8, 'Đối tác local phục vụ kiểm thử quy trình tuyển dụng')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, industry_labels = EXCLUDED.industry_labels,
       region = EXCLUDED.region, owner_id = EXCLUDED.owner_id, team_id = EXCLUDED.team_id, status = EXCLUDED.status, updated_at = now()
     RETURNING id`,
    [input.id, input.code, input.name, json(input.industryLabels), input.region, input.ownerId, input.teamId, input.status],
  );
  await query(
    `INSERT INTO client_contacts (id, client_id, name, email, phone) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (client_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = now()`,
    [input.contactId, row.id, `${input.name} Contact`, `${input.code.toLowerCase()}@local.test`, '+81-3-5555-0100'],
  );
  return row.id;
}

async function ensureCandidate(input: {
  id: string; code: string; name: string; industries: string[]; occupation: string; japaneseLevel: string;
  readiness: string; contactability: string; recordStatus: string; ownerId: string; teamId: string; email?: string; phone?: string; address?: string; passport?: string;
}): Promise<string> {
  const row = await first<{ id: string }>(
    `INSERT INTO candidates (id, code, name, normalized_name, industry_labels, occupation, japanese_level,
       email_ciphertext, email_blind_index, phone_ciphertext, phone_blind_index, address_ciphertext,
       passport_ciphertext, passport_blind_index, source, record_status, readiness_status, contactability_status, owner_id, team_id)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'LOCAL_DEMO', $15, $16, $17, $18, $19)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, normalized_name = EXCLUDED.normalized_name,
       industry_labels = EXCLUDED.industry_labels, occupation = EXCLUDED.occupation, japanese_level = EXCLUDED.japanese_level,
       email_ciphertext = EXCLUDED.email_ciphertext, email_blind_index = EXCLUDED.email_blind_index,
       phone_ciphertext = EXCLUDED.phone_ciphertext, phone_blind_index = EXCLUDED.phone_blind_index,
       address_ciphertext = EXCLUDED.address_ciphertext, passport_ciphertext = EXCLUDED.passport_ciphertext,
       passport_blind_index = EXCLUDED.passport_blind_index, record_status = EXCLUDED.record_status,
       readiness_status = EXCLUDED.readiness_status, contactability_status = EXCLUDED.contactability_status,
       owner_id = EXCLUDED.owner_id, team_id = EXCLUDED.team_id, updated_at = now()
     RETURNING id`,
    [input.id, input.code, input.name, input.name.toLocaleLowerCase(), json(input.industries), input.occupation, input.japaneseLevel,
      encryptCandidateValue(input.email, encryptionKey), candidateBlindIndex(input.email, encryptionKey),
      encryptCandidateValue(input.phone, encryptionKey), candidateBlindIndex(input.phone, encryptionKey), encryptCandidateValue(input.address, encryptionKey),
      encryptCandidateValue(input.passport, encryptionKey), candidateBlindIndex(input.passport, encryptionKey), input.recordStatus, input.readiness,
      input.contactability, input.ownerId, input.teamId],
  );
  return row.id;
}

try {
  if (password.length < 8 || password.length > 128) throw new Error('LOCAL_DEMO_PASSWORD must be between 8 and 128 characters');
  await client.query('BEGIN');

  const localTeam = await first<{ id: string }>(
    `INSERT INTO teams (id, code, name, status) VALUES ($1, 'LOCAL', 'Local Development', 'ACTIVE')
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE', updated_at = now()
     RETURNING id`,
    [ids.team],
  );
  ids.team = localTeam.id;

  // Append-only application/interview/journey/audit records are intentionally
  // preserved by the database; only mutable report projections are refreshed.
  await query(`DELETE FROM report_projection_rows WHERE scope_key = $1`, [`TEAM:${ids.team}`]);

  const permissionIds = new Map<string, string>();
  const allPermissions = [...new Set(Object.values(roleActions).flat())];
  for (const code of allPermissions) {
    const row = await first<{ id: string }>(
      `INSERT INTO permissions (code, description) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
      [code, `Local demo permission ${code}`],
    );
    permissionIds.set(code, row.id);
  }
  const roleIds = new Map<string, string>();
  for (const role of Object.keys(roleActions)) roleIds.set(role, await ensureRole(role));
  for (const [role, actions] of Object.entries(roleActions)) {
    for (const action of actions) {
      await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING`, [roleIds.get(role), permissionIds.get(action)]);
    }
  }

  const passwordHash = await hashPassword(password);
  const adminId = await ensureUser({ id: ids.users.admin, email: 'demo.admin@local.test', displayName: 'Nguyễn Thuỳ Dương', role: 'CONFIG_ADMIN', scope: 'COMPANY', teamId: ids.team, passwordHash });
  await query(`INSERT INTO user_roles (user_id, role_id, scope) VALUES ($1, $2, 'TEAM') ON CONFLICT (user_id, role_id, scope) DO NOTHING`, [adminId, roleIds.get('MANAGER')]);
  const managerId = await ensureUser({ id: ids.users.manager, email: 'demo.manager@local.test', displayName: 'Lê Thu Hà', role: 'MANAGER', scope: 'TEAM', teamId: ids.team, passwordHash });
  const recruiterId = await ensureUser({ id: ids.users.recruiter, email: 'demo.recruiter@local.test', displayName: 'Nguyễn Minh Anh', role: 'RECRUITER', scope: 'TEAM', teamId: ids.team, passwordHash });
  const coordinatorId = await ensureUser({ id: ids.users.coordinator, email: 'demo.coordinator@local.test', displayName: 'Trần Quốc Huy', role: 'JAPAN_COORDINATOR', scope: 'TEAM', teamId: ids.team, passwordHash });
  const businessId = await ensureUser({ id: ids.users.business, email: 'demo.business@local.test', displayName: 'Yuki Tanaka', role: 'BUSINESS', scope: 'TEAM', teamId: ids.team, passwordHash });

  const occupationSoftware = await ensureCatalog('OCCUPATION', 'SOFTWARE_ENGINEER', 'Kỹ sư phần mềm', { schema: { type: 'object', properties: { yearsExperience: { type: 'number' }, skills: { type: 'array' } } } });
  const occupationMechanical = await ensureCatalog('OCCUPATION', 'MECHANICAL_TECHNICIAN', 'Kỹ thuật viên cơ khí', { schema: { type: 'object', properties: { yearsExperience: { type: 'number' }, skills: { type: 'array' } } } });
  const occupationCare = await ensureCatalog('OCCUPATION', 'CARE_WORKER', 'Điều dưỡng', { schema: { type: 'object', properties: { yearsExperience: { type: 'number' }, skills: { type: 'array' } } } });
  await ensureCatalog('INDUSTRY', 'INFORMATION_TECHNOLOGY', 'Công nghệ thông tin');
  await ensureCatalog('INDUSTRY', 'MECHANICAL', 'Cơ khí');
  await ensureCatalog('INDUSTRY', 'CARE', 'Điều dưỡng');
  await ensureCatalog('SOURCE', 'LOCAL_DEMO', 'Local demo source');

  const clientIt = await ensureClient({ id: ids.clients.it, code: 'DEMO-CLIENT-IT', name: 'Sakura Tech Solutions', status: 'ACTIVE', industryLabels: ['Công nghệ thông tin'], region: 'Tokyo', ownerId: businessId, teamId: ids.team, contactId: '10000000-0000-4000-8000-000000000211' });
  const clientMechanical = await ensureClient({ id: ids.clients.mechanical, code: 'DEMO-CLIENT-MECH', name: 'Aichi Manufacturing Partners', status: 'ACTIVE', industryLabels: ['Cơ khí'], region: 'Aichi', ownerId: businessId, teamId: ids.team, contactId: '10000000-0000-4000-8000-000000000212' });
  const clientCare = await ensureClient({ id: ids.clients.care, code: 'DEMO-CLIENT-CARE', name: 'Hikari Medical Group', status: 'PROSPECT', industryLabels: ['Điều dưỡng'], region: 'Fukuoka', ownerId: businessId, teamId: ids.team, contactId: '10000000-0000-4000-8000-000000000213' });
  await ensureClient({ id: ids.clients.paused, code: 'DEMO-CLIENT-PAUSED', name: 'Kansai Hospitality Co.', status: 'PAUSED', industryLabels: ['Dịch vụ'], region: 'Osaka', ownerId: managerId, teamId: ids.team, contactId: '10000000-0000-4000-8000-000000000214' });

  const orderRows = [
    { id: ids.orders.open, code: 'DEMO-ORDER-OPEN', position: 'Kỹ sư phần mềm TypeScript', clientId: clientIt, industry: 'Công nghệ thông tin', occupation: 'Kỹ sư phần mềm', location: 'Tokyo', target: 4, deadline: day(45), ownerId: managerId, status: 'OPEN', catalogId: occupationSoftware, active: 2, passed: 1, supplied: 0 },
    { id: ids.orders.hold, code: 'DEMO-ORDER-HOLD', position: 'Kỹ thuật viên cơ khí', clientId: clientMechanical, industry: 'Cơ khí', occupation: 'Kỹ thuật viên cơ khí', location: 'Aichi', target: 3, deadline: day(70), ownerId: managerId, status: 'ON_HOLD', catalogId: occupationMechanical, active: 1, passed: 0, supplied: 0 },
    { id: ids.orders.filled, code: 'DEMO-ORDER-FILLED', position: 'Điều dưỡng chăm sóc cao tuổi', clientId: clientCare, industry: 'Điều dưỡng', occupation: 'Điều dưỡng', location: 'Fukuoka', target: 1, deadline: day(-5), ownerId: managerId, status: 'FILLED', catalogId: occupationCare, active: 0, passed: 1, supplied: 1 },
    { id: ids.orders.draft, code: 'DEMO-ORDER-DRAFT', position: 'Backend Engineer', clientId: clientIt, industry: 'Công nghệ thông tin', occupation: 'Kỹ sư phần mềm', location: 'Saitama', target: 2, deadline: day(90), ownerId: businessId, status: 'DRAFT', catalogId: occupationSoftware, active: 0, passed: 0, supplied: 0 },
  ];
  const orderIds = new Map<string, string>();
  for (const order of orderRows) {
    const snapshot = { catalogVersionId: order.catalogId, occupation: order.occupation, criteria: ['Có kinh nghiệm thực tế', 'Giao tiếp tiếng Nhật', 'Sẵn sàng làm việc theo ca'], japaneseLevel: 'N3' };
    const row = await first<{ id: string }>(
      `INSERT INTO job_orders (id, code, position, client_id, industry_label, occupation, location, target, deadline, owner_id, team_id, status, requirement_version, requirement_catalog_version_id, requirement_snapshot, active_applications, passed_applications, supplied_applications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13, $14::jsonb, $15, $16, $17)
       ON CONFLICT (code) DO UPDATE SET position = EXCLUDED.position, client_id = EXCLUDED.client_id, industry_label = EXCLUDED.industry_label,
         occupation = EXCLUDED.occupation, location = EXCLUDED.location, target = EXCLUDED.target, deadline = EXCLUDED.deadline,
         owner_id = EXCLUDED.owner_id, team_id = EXCLUDED.team_id, status = EXCLUDED.status, requirement_catalog_version_id = EXCLUDED.requirement_catalog_version_id,
         requirement_snapshot = EXCLUDED.requirement_snapshot, active_applications = EXCLUDED.active_applications, passed_applications = EXCLUDED.passed_applications,
         supplied_applications = EXCLUDED.supplied_applications, updated_at = now() RETURNING id`,
      [order.id, order.code, order.position, order.clientId, order.industry, order.occupation, order.location, order.target, order.deadline, order.ownerId, ids.team, order.status, order.catalogId, json(snapshot), order.active, order.passed, order.supplied],
    );
    orderIds.set(order.code, row.id);
    await query(
      `INSERT INTO job_order_requirement_versions (id, job_order_id, version, catalog_version_id, snapshot)
       VALUES ($1, $2, 1, $3, $4::jsonb) ON CONFLICT (job_order_id, version) DO UPDATE SET catalog_version_id = EXCLUDED.catalog_version_id, snapshot = EXCLUDED.snapshot`,
      [randomUUID(), row.id, order.catalogId, json(snapshot)],
    );
  }

  const candidateRows = [
    { id: ids.candidates.ready, code: 'DEMO-CAND-READY', name: 'Nguyễn Minh Khoa', industries: ['Công nghệ thông tin'], occupation: 'Kỹ sư phần mềm', level: 'N2', readiness: 'READY', contactability: 'CONTACTABLE', recordStatus: 'ACTIVE', ownerId: recruiterId, email: 'khoa.demo@local.test', phone: '+84-901-000-001', address: 'Hà Nội', passport: 'P-DEMO-001' },
    { id: ids.candidates.potential, code: 'DEMO-CAND-POTENTIAL', name: 'Trần Mai Linh', industries: ['Công nghệ thông tin'], occupation: 'Kỹ sư phần mềm', level: 'N3', readiness: 'POTENTIAL', contactability: 'CONTACTABLE', recordStatus: 'ACTIVE', ownerId: recruiterId, email: 'linh.demo@local.test', phone: '+84-901-000-002', address: 'Đà Nẵng', passport: 'P-DEMO-002' },
    { id: ids.candidates.unreachable, code: 'DEMO-CAND-UNREACHABLE', name: 'Lê Quốc Bảo', industries: ['Cơ khí'], occupation: 'Kỹ thuật viên cơ khí', level: 'N4', readiness: 'QUALIFIED', contactability: 'TEMPORARILY_UNREACHABLE', recordStatus: 'ACTIVE', ownerId: recruiterId, email: 'bao.demo@local.test', phone: '+84-901-000-003', address: 'Hải Phòng', passport: 'P-DEMO-003' },
    { id: ids.candidates.paused, code: 'DEMO-CAND-PAUSED', name: 'Phạm Thu Hà', industries: ['Điều dưỡng'], occupation: 'Điều dưỡng', level: 'N3', readiness: 'PAUSED', contactability: 'DO_NOT_CONTACT', recordStatus: 'ACTIVE', ownerId: coordinatorId, email: 'ha.demo@local.test', phone: '+84-901-000-004', address: 'Hồ Chí Minh', passport: 'P-DEMO-004' },
    { id: ids.candidates.archived, code: 'DEMO-CAND-ARCHIVED', name: 'Đỗ Văn Nam', industries: ['Cơ khí'], occupation: 'Kỹ thuật viên cơ khí', level: 'N4', readiness: 'NOT_SUITABLE', contactability: 'CONTACTABLE', recordStatus: 'ARCHIVED', ownerId: recruiterId, email: 'nam.demo@local.test', phone: '+84-901-000-005', address: 'Bắc Ninh', passport: 'P-DEMO-005' },
    { id: ids.candidates.duplicate, code: 'DEMO-CAND-DUPLICATE', name: 'Nguyễn Minh Khoa (duplicate)', industries: ['Công nghệ thông tin'], occupation: 'Kỹ sư phần mềm', level: 'N2', readiness: 'POTENTIAL', contactability: 'CONTACTABLE', recordStatus: 'ACTIVE', ownerId: recruiterId, email: 'khoa.demo@local.test', phone: '+84-901-000-006', address: 'Hà Nội', passport: 'P-DEMO-006' },
    { id: ids.candidates.supplied, code: 'DEMO-CAND-SUPPLIED', name: 'Vũ Hoàng Long', industries: ['Điều dưỡng'], occupation: 'Điều dưỡng', level: 'N3', readiness: 'QUALIFIED', contactability: 'CONTACTABLE', recordStatus: 'ACTIVE', ownerId: coordinatorId, email: 'long.demo@local.test', phone: '+84-901-000-007', address: 'Huế', passport: 'P-DEMO-007' },
    { id: ids.candidates.multiIndustry, code: 'DEMO-CAND-MULTI', name: 'Bùi Anh Tuấn', industries: ['Công nghệ thông tin', 'Cơ khí'], occupation: 'Kỹ sư phần mềm', level: 'N3', readiness: 'READY', contactability: 'CONTACTABLE', recordStatus: 'ACTIVE', ownerId: recruiterId, email: 'tuan.demo@local.test', phone: undefined, address: 'Cần Thơ', passport: 'P-DEMO-008' },
  ];
  const candidateIds = new Map<string, string>();
  for (const candidate of candidateRows) {
    const candidateId = await ensureCandidate({ id: candidate.id, code: candidate.code, name: candidate.name, industries: candidate.industries, occupation: candidate.occupation, japaneseLevel: candidate.level, readiness: candidate.readiness, contactability: candidate.contactability, recordStatus: candidate.recordStatus, ownerId: candidate.ownerId, teamId: ids.team, email: candidate.email, phone: candidate.phone, address: candidate.address, passport: candidate.passport });
    candidateIds.set(candidate.code, candidateId);
    const profileDefinitions = candidate.industries.map((industry, index) => ({ industry, occupation: index === 0 ? candidate.occupation : 'Kỹ thuật viên cơ khí', years: index === 0 ? 3.5 : 2, skills: index === 0 ? ['TypeScript', 'SQL', 'Giao tiếp tiếng Nhật'] : ['Đọc bản vẽ', 'CNC', 'An toàn lao động'], location: index === 0 ? 'Tokyo' : 'Aichi' }));
    for (const profile of profileDefinitions) {
      await query(
        `INSERT INTO candidate_occupation_profiles (id, candidate_id, industry_label, occupation, years_experience, skills, desired_location, attributes, status)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, 'PRIMARY')
         ON CONFLICT (candidate_id, industry_label, occupation) DO UPDATE SET years_experience = EXCLUDED.years_experience, skills = EXCLUDED.skills, desired_location = EXCLUDED.desired_location, attributes = EXCLUDED.attributes, updated_at = now()`,
        [randomUUID(), candidateId, profile.industry, profile.occupation, profile.years, json(profile.skills), profile.location, json({ source: 'LOCAL_DEMO' })],
      );
    }
  }

  await query(
    `INSERT INTO candidate_duplicate_cases (id, source_candidate_id, target_candidate_id, kind, state, signals, resolution_reason, resolved_by_id, resolved_at)
     VALUES ($1, $2, $3, 'EMAIL', 'OPEN', $4::jsonb, NULL, NULL, NULL)
     ON CONFLICT (id) DO UPDATE SET source_candidate_id = EXCLUDED.source_candidate_id, target_candidate_id = EXCLUDED.target_candidate_id, state = 'OPEN', signals = EXCLUDED.signals, resolution_reason = NULL, resolved_by_id = NULL, resolved_at = NULL, updated_at = now()`,
    ['10000000-0000-4000-8000-000000001111', candidateIds.get('DEMO-CAND-DUPLICATE'), candidateIds.get('DEMO-CAND-READY'), json({ email: 'same-blind-index', confidence: 0.98 })],
  );
  await query(
    `INSERT INTO candidate_merge_aliases (id, winner_candidate_id, loser_candidate_id, reason, merged_by_id)
     VALUES ($1, $2, $3, 'Hồ sơ trùng email, chờ xác nhận hợp nhất', $4)
     ON CONFLICT (loser_candidate_id) DO UPDATE SET winner_candidate_id = EXCLUDED.winner_candidate_id, reason = EXCLUDED.reason, merged_by_id = EXCLUDED.merged_by_id`,
    ['10000000-0000-4000-8000-000000001112', candidateIds.get('DEMO-CAND-READY'), candidateIds.get('DEMO-CAND-ARCHIVED'), managerId],
  );

  await query(
    `INSERT INTO candidate_import_batches (id, owner_id, team_id, file_name, checksum, status, mapping_version, total_rows, valid_rows, invalid_rows, duplicate_rows, created_candidate_ids, errors)
     VALUES ($1, $2, $3, 'candidate-import-2026-08.csv', repeat('d', 64), 'COMPLETED_WITH_ERRORS', 'v1', 3, 1, 1, 1, $4::jsonb, $5::jsonb)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, total_rows = EXCLUDED.total_rows, valid_rows = EXCLUDED.valid_rows, invalid_rows = EXCLUDED.invalid_rows, duplicate_rows = EXCLUDED.duplicate_rows, created_candidate_ids = EXCLUDED.created_candidate_ids, errors = EXCLUDED.errors, updated_at = now()`,
    [ids.importBatch, recruiterId, ids.team, json([candidateIds.get('DEMO-CAND-POTENTIAL')]), json([{ row: 3, code: 'DUPLICATE_CANDIDATE_REVIEW_REQUIRED' }])],
  );
  const importRows = [
    ['10000000-0000-4000-8000-000000001121', 1, 'CREATED', candidateIds.get('DEMO-CAND-POTENTIAL'), { name: 'Trần Mai Linh', email: 'linh.demo@local.test' }],
    ['10000000-0000-4000-8000-000000001122', 2, 'DUPLICATE', candidateIds.get('DEMO-CAND-READY'), { name: 'Nguyễn Minh Khoa', email: 'khoa.demo@local.test' }],
    ['10000000-0000-4000-8000-000000001123', 3, 'ERROR', null, { name: '', email: 'invalid' }],
  ] as const;
  for (const [id, rowNumber, state, candidateId, raw] of importRows) {
    await query(
      `INSERT INTO candidate_import_rows (id, batch_id, row_number, normalized_hash, idempotency_key, raw_json, state, error_code, candidate_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, error_code = EXCLUDED.error_code, candidate_id = EXCLUDED.candidate_id, raw_json = EXCLUDED.raw_json, updated_at = now()`,
      [id, ids.importBatch, rowNumber, `demo-row-${rowNumber}`, `demo-import-${rowNumber}`, json(raw), state, state === 'ERROR' ? 'INVALID_EMAIL' : state === 'DUPLICATE' ? 'DUPLICATE_CANDIDATE_REVIEW_REQUIRED' : null, candidateId],
    );
  }

  const apps = [
    { id: ids.applications.matched, candidateId: candidateIds.get('DEMO-CAND-POTENTIAL'), orderId: orderIds.get('DEMO-ORDER-OPEN'), ownerId: recruiterId, status: 'MATCHED', source: 'MANUAL_MATCH', reason: null },
    { id: ids.applications.interview, candidateId: candidateIds.get('DEMO-CAND-READY'), orderId: orderIds.get('DEMO-ORDER-OPEN'), ownerId: recruiterId, status: 'IN_INTERVIEW_PROCESS', source: 'REFERRAL', reason: null },
    { id: ids.applications.passed, candidateId: candidateIds.get('DEMO-CAND-SUPPLIED'), orderId: orderIds.get('DEMO-ORDER-FILLED'), ownerId: coordinatorId, status: 'PASSED', source: 'MANUAL_MATCH', reason: 'Interview passed and approved for supply journey' },
    { id: ids.applications.failed, candidateId: candidateIds.get('DEMO-CAND-UNREACHABLE'), orderId: orderIds.get('DEMO-ORDER-HOLD'), ownerId: recruiterId, status: 'FAILED', source: 'IMPORT', reason: 'Japanese communication level below current requirement' },
    { id: ids.applications.hold, candidateId: candidateIds.get('DEMO-CAND-MULTI'), orderId: orderIds.get('DEMO-ORDER-HOLD'), ownerId: recruiterId, status: 'ON_HOLD', source: 'MANUAL_MATCH', reason: null },
    { id: ids.applications.supplied, candidateId: candidateIds.get('DEMO-CAND-READY'), orderId: orderIds.get('DEMO-ORDER-FILLED'), ownerId: coordinatorId, status: 'PASSED', source: 'REFERRAL', reason: 'Supplied to receiving organization' },
  ];
  const appById = new Map<string, typeof apps[number]>();
  for (const app of apps) {
    const requirement = { catalogVersionId: occupationSoftware, occupation: 'Kỹ sư phần mềm', criteria: ['Japanese N3', 'Three years experience'], residenceContext: 'OUTSIDE_JAPAN', caseType: 'NEW_ENTRY' };
    const profile = { candidateId: app.candidateId, industryLabel: 'Công nghệ thông tin', occupation: 'Kỹ sư phần mềm', japaneseLevel: 'N3', residenceContext: 'OUTSIDE_JAPAN', caseType: 'NEW_ENTRY', visaRouteVersionId: null, sectorVersionId: null, occupationVersionId: occupationSoftware };
    await query(
      `INSERT INTO applications (id, candidate_id, job_order_id, owner_id, team_id, status, source, requirement_snapshot, profile_snapshot, applied_at, last_activity_at, due_at, decision_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET candidate_id = EXCLUDED.candidate_id, job_order_id = EXCLUDED.job_order_id, owner_id = EXCLUDED.owner_id,
         team_id = EXCLUDED.team_id, status = EXCLUDED.status, source = EXCLUDED.source, requirement_snapshot = EXCLUDED.requirement_snapshot,
         profile_snapshot = EXCLUDED.profile_snapshot, last_activity_at = EXCLUDED.last_activity_at, due_at = EXCLUDED.due_at, decision_reason = EXCLUDED.decision_reason, updated_at = now()`,
      [app.id, app.candidateId, app.orderId, app.ownerId, ids.team, app.status, app.source, json(requirement), json(profile), day(-7), day(10), app.reason],
    );
    appById.set(app.id, app);
    const previous = app.status === 'MATCHED' ? 'MATCHED' : app.status === 'IN_INTERVIEW_PROCESS' ? 'MATCHED' : app.status === 'PASSED' ? 'IN_INTERVIEW_PROCESS' : app.status === 'FAILED' ? 'IN_INTERVIEW_PROCESS' : 'MATCHED';
    await query(
      `INSERT INTO application_status_history (id, application_id, from_status, to_status, actor_user_id, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) ON CONFLICT (id) DO UPDATE SET to_status = EXCLUDED.to_status, reason = EXCLUDED.reason`,
      [randomUUID(), app.id, previous, app.status, app.ownerId, app.reason ?? 'Cập nhật trạng thái theo kết quả xử lý hồ sơ', json({ source: 'LOCAL_DEMO' })],
    );
  }

  const interviews = [
    { id: ids.interviews.scheduled, appId: ids.applications.interview, ownerId: recruiterId, round: 1, start: hour(24), end: hour(25), status: 'SCHEDULED', result: null, feedback: null },
    { id: ids.interviews.passed, appId: ids.applications.passed, ownerId: coordinatorId, round: 1, start: hour(-48), end: hour(-47), status: 'COMPLETED', result: 'PASS', feedback: 'Strong technical and communication skills.' },
    { id: ids.interviews.noShow, appId: ids.applications.failed, ownerId: recruiterId, round: 1, start: hour(-96), end: hour(-95), status: 'NO_SHOW', result: null, feedback: 'Candidate did not attend the interview.' },
  ];
  for (const interview of interviews) {
    await query(
      `INSERT INTO interviews (id, application_id, owner_id, round_no, scheduled_at, scheduled_end_at, time_zone, mode, meeting_url, location, schedule_status, result, feedback, strengths, concerns, next_step, question_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, 'Asia/Tokyo', 'ONLINE', 'https://meet.local/demo', 'Tokyo', $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13::jsonb)
       ON CONFLICT (id) DO UPDATE SET schedule_status = EXCLUDED.schedule_status, result = EXCLUDED.result, feedback = EXCLUDED.feedback, next_step = EXCLUDED.next_step, updated_at = now()`,
      [interview.id, interview.appId, interview.ownerId, interview.round, interview.start, interview.end, interview.status, interview.result, interview.feedback, json(interview.result === 'PASS' ? ['Clear communication'] : []), json(interview.result === 'PASS' ? [] : ['Follow-up required']), interview.result === 'PASS' ? 'Start supply journey' : null, json({ questions: [{ type: 'GENERAL', prompt: 'Please introduce yourself.' }, { type: 'TECHNICAL', prompt: 'Describe a recent project.' }] })],
    );
    await query(`INSERT INTO interview_participants (id, interview_id, user_id) VALUES ($1, $2, $3) ON CONFLICT (interview_id, user_id) DO NOTHING`, [randomUUID(), interview.id, interview.ownerId]);
    await query(`INSERT INTO interview_history (id, interview_id, actor_user_id, action, from_status, to_status, reason, metadata) VALUES ($1, $2, $3, 'CREATED', NULL, $4, 'Tạo lịch phỏng vấn để kiểm tra quy trình', $5::jsonb) ON CONFLICT (id) DO NOTHING`, [randomUUID(), interview.id, interview.ownerId, interview.status, json({ source: 'LOCAL_DEMO' })]);
  }

  await query(`INSERT INTO mailboxes (id, address, display_name, provider, status, version) VALUES ($1, $2, 'Company Status Notifications', $3, 'HEALTHY', 1) ON CONFLICT (id) DO UPDATE SET address = EXCLUDED.address, display_name = EXCLUDED.display_name, provider = EXCLUDED.provider, status = EXCLUDED.status, updated_at = now()`, [ids.mailbox, senderAddress, mailboxProvider]);
  const conversations = [
    { id: ids.conversations.needsAction, candidateId: candidateIds.get('DEMO-CAND-READY'), appId: ids.applications.interview, journeyId: null, subject: 'Interview availability for Tokyo role', snippet: 'Could you confirm your availability next Tuesday?', status: 'NEEDS_ACTION', count: 1, unread: true },
    { id: ids.conversations.unmatched, candidateId: null, appId: null, journeyId: null, subject: 'Application received - unknown sender', snippet: 'Please help identify this candidate before replying.', status: 'UNMATCHED', count: 1, unread: true },
    { id: ids.conversations.closed, candidateId: candidateIds.get('DEMO-CAND-SUPPLIED'), appId: ids.applications.passed, journeyId: ids.journey.completed, subject: 'Arrival documents confirmed', snippet: 'All arrival documents have been checked.', status: 'CLOSED', count: 2, unread: false },
    { id: ids.conversations.sent, candidateId: candidateIds.get('DEMO-CAND-POTENTIAL'), appId: ids.applications.matched, journeyId: null, subject: 'Next steps for your application', snippet: 'We sent the next-step checklist.', status: 'SENT', count: 1, unread: false },
  ];
  for (const conversation of conversations) {
    await query(
      `INSERT INTO email_conversations (id, mailbox_id, candidate_id, application_id, journey_id, subject, snippet, status, last_activity_at, message_count, has_unread_inbound)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET candidate_id = EXCLUDED.candidate_id, application_id = EXCLUDED.application_id, journey_id = EXCLUDED.journey_id,
         subject = EXCLUDED.subject, snippet = EXCLUDED.snippet, status = EXCLUDED.status, last_activity_at = EXCLUDED.last_activity_at, message_count = EXCLUDED.message_count, has_unread_inbound = EXCLUDED.has_unread_inbound, updated_at = now()`,
      [conversation.id, ids.mailbox, conversation.candidateId, conversation.appId, conversation.journeyId, conversation.subject, conversation.snippet, conversation.status, hour(-2), conversation.count, conversation.unread],
    );
  }
  const messages = [
    { id: ids.messages.inbound, conversationId: ids.conversations.needsAction, direction: 'INBOUND', status: 'RECEIVED', from: 'khoa.demo@local.test', subject: 'Interview availability for Tokyo role', body: 'Hello, I am available next Tuesday afternoon.', at: hour(-2), attachment: null },
    { id: ids.messages.unmatched, conversationId: ids.conversations.unmatched, direction: 'INBOUND', status: 'RECEIVED', from: 'unknown.sender@local.test', subject: 'Application received - unknown sender', body: 'Please help identify this candidate.', at: hour(-3), attachment: 'quarantined' },
    { id: ids.messages.closed, conversationId: ids.conversations.closed, direction: 'INBOUND', status: 'RECEIVED', from: 'long.demo@local.test', subject: 'Arrival documents confirmed', body: 'All arrival documents are ready.', at: day(-1), attachment: null },
    { id: ids.messages.outbound, conversationId: ids.conversations.sent, direction: 'OUTBOUND', status: 'SENT', from: 'noreply@company.vn', subject: 'Next steps for your application', body: 'Please review the attached next-step checklist.', at: day(-1), attachment: null },
    { id: ids.messages.failed, conversationId: ids.conversations.needsAction, direction: 'OUTBOUND', status: 'FAILED', from: 'noreply@company.vn', subject: 'Gửi thư mời phỏng vấn chưa thành công', body: 'Lần gửi trước chưa thành công, cần thử gửi lại sau khi xác nhận địa chỉ.', at: day(-3), attachment: null },
  ];
  for (const message of messages) {
    await query(
      `INSERT INTO email_messages (id, mailbox_id, conversation_id, direction, status, provider_message_id, provider_thread_id, internet_message_id, idempotency_key, from_address, subject, body_text, sanitized_html, sent_or_received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET direction = EXCLUDED.direction, status = EXCLUDED.status, subject = EXCLUDED.subject, body_text = EXCLUDED.body_text, sent_or_received_at = EXCLUDED.sent_or_received_at, updated_at = now()`,
      [message.id, ids.mailbox, message.conversationId, message.direction, message.status, `demo-provider-${message.id}`, `demo-thread-${message.conversationId}`, `<${message.id}@local.test>`, `demo-idempotency-${message.id}`, message.from, message.subject, message.body, `<p>${message.body}</p>`, message.at],
    );
    await query(`DELETE FROM email_recipients WHERE message_id = $1`, [message.id]);
    await query(`INSERT INTO email_recipients (id, message_id, kind, address, position) VALUES ($1, $2, 'TO', $3, 0) ON CONFLICT (message_id, kind, address) DO NOTHING`, [randomUUID(), message.id, message.direction === 'INBOUND' ? 'noreply@company.vn' : 'khoa.demo@local.test']);
    if (message.attachment) {
      await query(`INSERT INTO email_attachments (id, message_id, file_name, content_type, detected_content_type, size_bytes, checksum, object_key, status, scan_reason, quarantined_at) VALUES ($1, $2, 'CV-Nguyen-Minh-An.pdf', 'application/pdf', 'application/pdf', 2048, repeat('a', 64), 'local-demo/quarantine/CV-Nguyen-Minh-An.pdf', 'QUARANTINED', 'Tệp đính kèm đang chờ kết quả quét an toàn', now()) ON CONFLICT (id) DO UPDATE SET status = 'QUARANTINED', scan_reason = EXCLUDED.scan_reason, quarantined_at = EXCLUDED.quarantined_at`, ['10000000-0000-4000-8000-000000000731', message.id]);
    }
  }
  await query(`INSERT INTO email_match_decisions (id, message_id, state, candidate_id, reason, resolved_by_id) VALUES ($1, $2, 'PENDING', NULL, 'Unknown sender requires explicit candidate linking', NULL) ON CONFLICT (id) DO UPDATE SET state = 'PENDING', candidate_id = NULL, reason = EXCLUDED.reason, resolved_by_id = NULL`, ['10000000-0000-4000-8000-000000000741', ids.messages.unmatched]);

  const checksum = `sha256:${'1'.repeat(64)}`;
  await query(`INSERT INTO supply_journey_templates (id, code, name) VALUES ($1, 'DEMO-VN-TO-JP', 'Demo Vietnam to Japan Supply Journey') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`, [ids.journey.template]);
  await query(`INSERT INTO supply_journey_template_versions (id, template_id, version, status, residence_context, case_type, checksum, applicability, effective_from) VALUES ($1, $2, 1, 'ACTIVE', 'OUTSIDE_JAPAN', 'NEW_ENTRY', $3, $4::jsonb, now()) ON CONFLICT (template_id, version) DO UPDATE SET status = 'ACTIVE', checksum = EXCLUDED.checksum, applicability = EXCLUDED.applicability, updated_at = now()`, [ids.journey.version, ids.journey.template, checksum, json({ industryLabels: ['Công nghệ thông tin', 'Điều dưỡng', 'Cơ khí'] })]);
  const milestoneTemplates = [
    ['DEMO-DOCS', 'Kiểm tra hồ sơ', 1, [], 3, ['PASSPORT', 'CV']],
    ['DEMO-COE', 'Hồ sơ COE', 2, ['DEMO-DOCS'], 10, ['COE']],
    ['DEMO-FLIGHT', 'Kế hoạch xuất cảnh', 3, ['DEMO-COE'], 7, []],
    ['DEMO-ARRIVAL', 'Xác nhận nhập cảnh', 4, ['DEMO-FLIGHT'], 3, []],
  ] as const;
  const milestoneTemplateIds = new Map<string, string>();
  for (const [code, name, sequence, dependencies, dueSlaDays, evidence] of milestoneTemplates) {
    const milestoneId = `10000000-0000-4000-8000-00000000082${sequence}`;
    milestoneTemplateIds.set(code, milestoneId);
    await query(`INSERT INTO journey_milestone_templates (id, template_version_id, code, name, sequence, dependency_codes, due_sla_days, owner_rule, checklist_schema, evidence_requirements) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb) ON CONFLICT (template_version_id, code) DO UPDATE SET name = EXCLUDED.name, sequence = EXCLUDED.sequence, dependency_codes = EXCLUDED.dependency_codes, due_sla_days = EXCLUDED.due_sla_days, owner_rule = EXCLUDED.owner_rule, checklist_schema = EXCLUDED.checklist_schema, evidence_requirements = EXCLUDED.evidence_requirements, updated_at = now()`, [milestoneId, ids.journey.version, code, name, sequence, json(dependencies), dueSlaDays, json({ role: 'JAPAN_COORDINATOR' }), json({ type: 'object', required: evidence }), json(evidence)]);
  }

  const journeys = [
    { id: ids.journey.active, appId: ids.applications.passed, candidateId: candidateIds.get('DEMO-CAND-SUPPLIED'), status: 'ACTIVE', ownerId: coordinatorId, started: day(-8), completed: null, reason: null },
    { id: ids.journey.completed, appId: ids.applications.supplied, candidateId: candidateIds.get('DEMO-CAND-READY'), status: 'COMPLETED', ownerId: coordinatorId, started: day(-30), completed: day(-2), reason: null },
    { id: ids.journey.hold, appId: ids.applications.passed, candidateId: candidateIds.get('DEMO-CAND-MULTI'), status: 'ON_HOLD', ownerId: coordinatorId, started: day(-12), completed: null, reason: 'Waiting for receiving organization confirmation' },
  ];
  for (const journey of journeys) {
    await query(`INSERT INTO supply_journeys (id, candidate_id, application_id, template_version_id, template_checksum, owner_user_id, team_id, status, context_snapshot, started_at, completed_at, cancel_reason, idempotency_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13) ON CONFLICT (id) DO UPDATE SET candidate_id = EXCLUDED.candidate_id, application_id = EXCLUDED.application_id, owner_user_id = EXCLUDED.owner_user_id, team_id = EXCLUDED.team_id, status = EXCLUDED.status, context_snapshot = EXCLUDED.context_snapshot, started_at = EXCLUDED.started_at, completed_at = EXCLUDED.completed_at, cancel_reason = EXCLUDED.cancel_reason, updated_at = now()`, [journey.id, journey.candidateId, journey.appId, ids.journey.version, checksum, journey.ownerId, ids.team, journey.status, json({ residenceContext: 'OUTSIDE_JAPAN', caseType: 'NEW_ENTRY', visaRouteVersionId: null, sectorVersionId: null, occupationVersionId: occupationSoftware }), journey.started, journey.completed, journey.reason, `demo-journey-${journey.id}`]);
    const statuses = journey.status === 'COMPLETED' ? ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED'] : journey.status === 'ON_HOLD' ? ['COMPLETED', 'BLOCKED', 'NOT_STARTED', 'NOT_STARTED'] : ['COMPLETED', 'IN_PROGRESS', 'BLOCKED', 'NOT_STARTED'];
    for (let index = 0; index < milestoneTemplates.length; index += 1) {
      const [code, name, sequence, dependencies, , evidence] = milestoneTemplates[index];
      const milestoneId = randomUUID();
      const status = statuses[index];
      const milestoneRow = await first<{ id: string }>(`INSERT INTO journey_milestones (id, journey_id, template_milestone_id, code, name, sequence, status, dependency_codes, owner_user_id, due_at, completed_at, blocker_party, blocker_reason, expected_resolution, checklist_data, evidence_requirement, attempt_no) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb, 1) ON CONFLICT (journey_id, code) DO UPDATE SET status = EXCLUDED.status, due_at = EXCLUDED.due_at, completed_at = EXCLUDED.completed_at, blocker_party = EXCLUDED.blocker_party, blocker_reason = EXCLUDED.blocker_reason, expected_resolution = EXCLUDED.expected_resolution, checklist_data = EXCLUDED.checklist_data, evidence_requirement = EXCLUDED.evidence_requirement, updated_at = now() RETURNING id`, [milestoneId, journey.id, milestoneTemplateIds.get(code), code, name, sequence, status, json(dependencies), journey.ownerId, status === 'COMPLETED' ? day(-1) : day(index + 1), status === 'COMPLETED' ? day(-2) : null, status === 'BLOCKED' ? 'CLIENT' : null, status === 'BLOCKED' ? 'Receiving organization confirmation is pending' : null, status === 'BLOCKED' ? 'Confirm by next business day' : null, json({ checked: status === 'COMPLETED' }), json(evidence)]);
    await query(`INSERT INTO journey_milestone_history (id, journey_id, milestone_id, from_status, to_status, actor_user_id, reason, metadata) VALUES ($1, $2, $3, NULL, $4, $5, 'Ghi nhận trạng thái mốc xử lý hiện tại', $6::jsonb) ON CONFLICT (id) DO NOTHING`, [randomUUID(), journey.id, milestoneRow.id, status, journey.ownerId, json({ source: 'LOCAL_DEMO' })]);
    }
  }

  await query(`INSERT INTO task_rule_versions (id, code, version, status, event_type, action, title_template, due_after_hours, reference_entity_type, business_slot, conditions) VALUES ($1, 'DEMO_FOLLOW_UP', 1, 'ACTIVE', 'APPLICATION_MATCHED', 'CREATE', 'Follow up candidate application', 48, 'APPLICATION', 'RECRUITER', '{}'::jsonb) ON CONFLICT (code, version) DO UPDATE SET status = 'ACTIVE', title_template = EXCLUDED.title_template, updated_at = now()`, [ids.tasks.rule]);
  const tasks = [
    { id: ids.tasks.new, title: 'Gọi xác nhận lịch phỏng vấn', status: 'NEW', assignee: recruiterId, waitingOn: null, due: hour(12), referenceType: 'APPLICATION', referenceId: ids.applications.interview, dedupe: 'demo-task-new' },
    { id: ids.tasks.overdue, title: 'Bổ sung hồ sơ COE', status: 'IN_PROGRESS', assignee: coordinatorId, waitingOn: 'CANDIDATE', due: hour(-20), referenceType: 'JOURNEY_MILESTONE', referenceId: ids.journey.active, dedupe: 'demo-task-overdue' },
    { id: ids.tasks.completed, title: 'Đã kiểm tra hộ chiếu', status: 'DONE', assignee: recruiterId, waitingOn: null, due: day(-1), referenceType: 'CANDIDATE', referenceId: candidateIds.get('DEMO-CAND-READY'), dedupe: 'demo-task-completed' },
    { id: ids.tasks.waiting, title: 'Chờ client xác nhận offer', status: 'NEW', assignee: businessId, waitingOn: 'CLIENT_PARTNER', due: hour(48), referenceType: 'ORDER', referenceId: orderIds.get('DEMO-ORDER-HOLD'), dedupe: 'demo-task-waiting' },
  ];
  for (const task of tasks) {
    await query(`INSERT INTO tasks (id, title, description, status, assignee_user_id, team_id, waiting_on, due_at, no_due_date_reason, rule_code, source_event_id, dedupe_key, reference_entity_type, reference_entity_id) VALUES ($1, $2, 'Công việc cần xử lý trong quy trình tuyển dụng.', $3, $4, $5, $6, $7, NULL, 'DEMO_FOLLOW_UP', $8, $9, $10, $11) ON CONFLICT (dedupe_key) DO NOTHING`, [task.id, task.title, task.status, task.assignee, ids.team, task.waitingOn, task.due, randomUUID(), task.dedupe, task.referenceType, task.referenceId]);
  }

  const notificationRecipients = [adminId, managerId, recruiterId, coordinatorId, businessId];
  const notificationScenarios = [
    { kind: 'INTERVIEW_SCHEDULED', severity: 'WARNING', params: { name: 'Nguyễn Minh Khoa' }, href: `/applications?selectedId=${ids.applications.interview}`, suffix: 'interview', createdAt: hour(-1) },
    { kind: 'MAIL_NEEDS_ACTION', severity: 'INFO', params: {}, href: `/mailbox?selectedId=${ids.conversations.needsAction}`, suffix: 'mail', createdAt: hour(-2) },
    { kind: 'JOURNEY_AT_RISK', severity: 'DANGER', params: { name: 'Vũ Hoàng Long' }, href: `/supply-journeys?selectedId=${ids.journey.hold}`, suffix: 'journey', createdAt: hour(-3) },
  ] as const;
  for (const userId of notificationRecipients) {
    for (const scenario of notificationScenarios) {
      await query(
        `INSERT INTO notifications (id, user_id, kind, severity, params, href, read_at, dedupe_key, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, NULL, $7, $8)
         ON CONFLICT (dedupe_key) DO UPDATE SET user_id = EXCLUDED.user_id, kind = EXCLUDED.kind, severity = EXCLUDED.severity, params = EXCLUDED.params, href = EXCLUDED.href, read_at = NULL, created_at = EXCLUDED.created_at`,
        [randomUUID(), userId, scenario.kind, scenario.severity, json(scenario.params), scenario.href, `local-demo-notification:${userId}:${scenario.suffix}`, scenario.createdAt],
      );
    }
  }

  await query(`INSERT INTO report_projection_watermarks (id, projection_key, watermark_at, refreshed_at) VALUES ($1, 'LOCAL_DEMO', now(), now()) ON CONFLICT (projection_key) DO UPDATE SET watermark_at = EXCLUDED.watermark_at, refreshed_at = EXCLUDED.refreshed_at, updated_at = now()`, [ids.reports.watermark]);
  const scopeKey = `TEAM:${ids.team}`;
  const reportRows = [
    ['candidate_inventory', 'READY', 4, 8], ['candidate_inventory', 'POTENTIAL', 2, 8], ['application_conversion', 'PASSED', 3, 6], ['application_conversion', 'IN_INTERVIEW_PROCESS', 1, 6], ['order_pipeline', 'OPEN', 2, 4], ['interview_outcomes', 'PASS', 2, 3], ['journey_progress', 'ACTIVE', 1, 3], ['journey_progress', 'BLOCKED', 1, 3], ['email_operations', 'RECEIVED', 3, 5], ['task_workload', 'NEW', 2, 4],
  ] as const;
  for (const [reportCode, dimensionKey, numerator, denominator] of reportRows) {
    await query(`INSERT INTO report_projection_rows (id, report_code, scope_key, dimension_key, as_of, payload, source_watermark) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $5) ON CONFLICT (report_code, scope_key, dimension_key, as_of) DO UPDATE SET payload = EXCLUDED.payload, source_watermark = EXCLUDED.source_watermark, updated_at = now()`, [randomUUID(), reportCode, scopeKey, dimensionKey, hour(-1), json({ numerator, denominator })]);
  }
  await query(`INSERT INTO report_export_jobs (id, report_code, format, requester_id, purpose, scope_snapshot, included_fields, status) VALUES ($1, 'application_conversion', 'CSV', $2, 'Local demo export review', $3::jsonb, $4::jsonb, 'QUEUED') ON CONFLICT (id) DO UPDATE SET status = 'QUEUED', updated_at = now()`, [ids.reports.export, managerId, json({ scope: 'TEAM', teamId: ids.team }), json(['status', 'source', 'createdAt'])]);

  const docs = [
    { id: ids.documents.safe, candidateId: candidateIds.get('DEMO-CAND-SUPPLIED'), title: 'Hộ chiếu - Vũ Hoàng Long', status: 'SAFE', objectKey: 'local-demo/safe/passport.pdf', mime: 'application/pdf', rejection: null },
    { id: ids.documents.quarantined, candidateId: candidateIds.get('DEMO-CAND-READY'), title: 'CV - Nguyễn Minh Khoa', status: 'QUARANTINED', objectKey: 'local-demo/quarantine/cv.pdf', mime: 'application/pdf', rejection: 'Đang chờ kết quả quét an toàn' },
  ];
  for (const doc of docs) {
    const versionId = randomUUID();
    await query(`INSERT INTO documents (id, candidate_id, owner_user_id, team_id, title, category, status, latest_version_no, legal_hold) VALUES ($1, $2, $3, $4, $5, 'IDENTITY', $6, 1, $7) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, legal_hold = EXCLUDED.legal_hold, updated_at = now()`, [doc.id, doc.candidateId, coordinatorId, ids.team, doc.title, doc.status, doc.status === 'SAFE']);
    await query(`INSERT INTO document_versions (id, document_id, version_no, object_key, size_bytes, checksum, claimed_mime, detected_mime, status, rejection_reason) VALUES ($1, $2, 1, $3, 4096, repeat('b', 64), $4, $4, $5, $6) ON CONFLICT (document_id, version_no) DO UPDATE SET status = EXCLUDED.status, rejection_reason = EXCLUDED.rejection_reason`, [versionId, doc.id, doc.objectKey, doc.mime, doc.status, doc.rejection]);
    await query(`INSERT INTO document_links (id, document_id, candidate_id, journey_id, milestone_id, linked_by) VALUES ($1, $2, $3, $4, NULL, $5) ON CONFLICT (document_id, candidate_id, journey_id, milestone_id) DO NOTHING`, [randomUUID(), doc.id, doc.candidateId, ids.journey.active, coordinatorId]);
    await query(`INSERT INTO document_access_audits (id, document_id, version_no, actor_user_id, action, request_id) VALUES ($1, $2, 1, $3, 'SEE', 'local-demo-seed') ON CONFLICT (id) DO NOTHING`, [randomUUID(), doc.id, coordinatorId]);
  }

  const auditRows = [
    ['LOGIN_SUCCEEDED', 'USER', adminId, 'Đăng nhập tài khoản quản trị'], ['CANDIDATE_CREATED', 'CANDIDATE', candidateIds.get('DEMO-CAND-READY'), 'Tạo hồ sơ ứng viên mới'], ['APPLICATION_DECIDED', 'APPLICATION', ids.applications.passed, 'Hồ sơ đạt sau phỏng vấn'], ['JOURNEY_STARTED', 'SUPPLY_JOURNEY', ids.journey.active, 'Khởi tạo lộ trình cung ứng'], ['EMAIL_MATCH_PENDING', 'EMAIL_CONVERSATION', ids.conversations.unmatched, 'Email chưa ghép ứng viên cần xử lý'], ['REPORT_EXPORT_QUEUED', 'REPORT_EXPORT', ids.reports.export, 'Yêu cầu xuất báo cáo đang chờ xử lý'],
  ] as const;
  for (const [action, entityType, entityId, summary] of auditRows) {
    await query(`INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, correlation_id, diff_json, metadata_json) VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, $7::jsonb) ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action, entity_type = EXCLUDED.entity_type, entity_id = EXCLUDED.entity_id, metadata_json = EXCLUDED.metadata_json`, [randomUUID(), adminId, action, entityType, entityId, `local-demo-${action.toLowerCase()}`, json({ teamId: ids.team, summary, source: 'LOCAL_DEMO' })]);
  }

  await query(`INSERT INTO retention_policies (id, code, version, status, retention_days, applies_to, created_by) VALUES ($1, 'DEMO_STANDARD_RETENTION', 1, 'ACTIVE', 365, $2::jsonb, $3) ON CONFLICT (code, version) DO UPDATE SET status = 'ACTIVE', retention_days = EXCLUDED.retention_days, applies_to = EXCLUDED.applies_to, updated_at = now()`, ['10000000-0000-4000-8000-000000001301', json({ entityTypes: ['CANDIDATE', 'DOCUMENT', 'EMAIL'] }), adminId]);
  await query(`INSERT INTO legal_holds (id, entity_type, entity_id, reason, status, placed_by) VALUES ($1, 'CANDIDATE', $2, 'Synthetic legal hold for retention UI review', 'ACTIVE', $3) ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', reason = EXCLUDED.reason`, ['10000000-0000-4000-8000-000000001302', candidateIds.get('DEMO-CAND-READY'), managerId]);

  await client.query('COMMIT');
  console.log(JSON.stringify({ status: 'local_demo_seeded', team: 'LOCAL', users: 5, clients: 4, orders: 4, candidates: 8, applications: 6, interviews: 3, conversations: 4, journeys: 3, tasks: 4, notifications: notificationRecipients.length * notificationScenarios.length, reportRows: reportRows.length, documents: docs.length, loginPassword: password }, null, 2));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
