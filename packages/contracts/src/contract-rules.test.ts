import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';
import { describe, expect, it } from 'vitest';

type OpenApiSchema = {
  $ref?: string;
  type?: string;
  enum?: string[];
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  content?: Record<string, { schema?: OpenApiSchema }>;
};

type OpenApiResponse = {
  content?: Record<string, { schema?: OpenApiSchema }>;
};

type OpenApiOperation = {
  operationId?: string;
  security?: Array<Record<string, string[]>>;
  responses?: Record<string, OpenApiResponse>;
};

type OpenApiDocument = {
  openapi: string;
  security?: Array<Record<string, string[]>>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    schemas: Record<string, OpenApiSchema>;
    responses?: Record<string, OpenApiResponse>;
    securitySchemes?: Record<string, OpenApiSchema>;
  };
};

const contractPath = resolve(process.cwd(), 'openapi/cms.yaml');
const document = load(readFileSync(contractPath, 'utf8')) as OpenApiDocument;
const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
const operations = Object.entries(document.paths).flatMap(([path, item]) =>
  Object.entries(item)
    .filter(([method]) => httpMethods.has(method))
    .map(([method, operation]) => ({ path, method, operation })),
);

function schemaFromResponse(response: OpenApiResponse) {
  return response?.content?.['application/json']?.schema;
}

function resolveSchema(schema: OpenApiSchema | undefined) {
  if (schema?.$ref?.startsWith('#/components/schemas/')) {
    return document.components.schemas[schema.$ref.slice('#/components/schemas/'.length)];
  }
  return schema;
}

function getSchema(name: string): OpenApiSchema {
  const schema = document.components.schemas[name];
  if (!schema) throw new Error(`Missing schema: ${name}`);
  return schema;
}

function getProperties(name: string): Record<string, OpenApiSchema> {
  const properties = getSchema(name).properties;
  if (!properties) throw new Error(`Schema has no properties: ${name}`);
  return properties;
}

describe('canonical OpenAPI rules', () => {
  it('uses OpenAPI 3.1 and global session security', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.security).toEqual([{ sessionCookie: [] }]);
    expect(document.components.securitySchemes).toMatchObject({
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'cms_sid' },
      csrfHeader: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    });
  });

  it('declares local password login and optional OIDC session endpoints', () => {
    expect(document.paths).toEqual(expect.objectContaining({
      '/auth/oidc/start': expect.anything(),
      '/auth/oidc/callback': expect.anything(),
      '/auth/login': expect.anything(),
      '/auth/session': expect.anything(),
      '/auth/csrf': expect.anything(),
      '/auth/logout': expect.anything(),
    }));
    const loginRequest = document.components.schemas.LoginRequest;
    expect(loginRequest?.required).toEqual(['email', 'password']);
  });

  it('declares the canonical endpoint inventory and CSRF on mutations', () => {
    const requiredPaths = [
      '/health/live', '/health/ready', '/metrics', '/auth/oidc/start', '/auth/oidc/callback', '/auth/login', '/auth/session', '/auth/csrf',
      '/industry-sectors', '/occupations', '/visa-routes', '/admin/industry-field-definitions',
      '/admin/interview-question-templates', '/admin/supply-journey-templates', '/admin/email-templates',
      '/clients/{id}/contacts', '/job-orders', '/job-orders/{id}', '/job-orders/{id}/status-transitions',
      '/candidates/{id}/occupation-profiles', '/candidate-imports', '/candidate-imports/preview',
      '/candidate-imports/commit', '/candidate-imports/{id}', '/candidate-imports/{id}/error-report',
      '/candidate-duplicate-cases/{id}/decisions', '/applications/{id}/withdrawals',
      '/interviews/{id}/question-snapshots', '/applications/{id}/eligible-supply-journey-templates',
      '/supply-journeys/{id}/completion', '/supply-journeys/{id}/cancellation',
      '/supply-journeys/{id}/hold', '/supply-journeys/{id}/resume', '/journey-milestones/{id}',
      '/journey-milestones/{id}/attempts', '/documents/uploads', '/documents/{id}',
      '/documents/{id}/downloads', '/documents/{id}/links', '/documents/{id}/verification',
      '/email-previews', '/email-drafts', '/conversations/{id}/messages', '/email-messages/{id}/cancellations',
      '/email-messages/{id}/retry-attempts', '/inbox/messages/{id}/match-decisions', '/webhooks/mail/{provider}',
      '/admin/teams', '/report-exports', '/report-exports/{id}',
    ];
    for (const path of requiredPaths) expect(document.paths).toHaveProperty(path);

    const publicPaths = new Set([
      '/health/live', '/health/ready', '/metrics', '/auth/oidc/start', '/auth/oidc/callback', '/auth/login', '/webhooks/mail/{provider}',
    ]);
    for (const { path, method, operation } of operations) {
      if (!['post', 'patch', 'put', 'delete'].includes(method) || publicPaths.has(path)) continue;
      expect(operation.security, `${method.toUpperCase()} ${path} must require session and CSRF`).toEqual([
        { sessionCookie: [], csrfHeader: [] },
      ]);
    }
  });

  it('gives every operation a unique operationId and every success response an envelope', () => {
    const ids = operations.map(({ operation }) => operation.operationId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);

    for (const { path, method, operation } of operations) {
      for (const [status, response] of Object.entries(operation.responses ?? {})) {
        if (!/^2\d\d$/.test(status)) continue;
        const schema = schemaFromResponse(response);
        expect(schema, `${method.toUpperCase()} ${path} ${status} must return JSON`).toBeDefined();
        const resolved = resolveSchema(schema);
        expect(resolved, `${method.toUpperCase()} ${path} ${status} schema must resolve`).toBeDefined();
        if (!resolved) throw new Error(`${method.toUpperCase()} ${path} ${status} schema must resolve`);
        const required = new Set(resolved.required ?? []);
        expect(required.has('data'), `${method.toUpperCase()} ${path} ${status} missing data envelope`).toBe(true);
        expect(required.has('requestId'), `${method.toUpperCase()} ${path} ${status} missing requestId`).toBe(true);
        if (resolved.properties?.page) {
          expect(required.has('page'), `${method.toUpperCase()} ${path} ${status} page must be required`).toBe(true);
        }
      }
    }
  });

  it('uses the canonical domain enums', () => {
    expect(getProperties('Candidate').readinessStatus.enum).toEqual([
      'POTENTIAL', 'QUALIFIED', 'READY', 'PAUSED', 'NOT_SUITABLE',
    ]);
    expect(getProperties('Candidate').contactabilityStatus.enum).toEqual([
      'CONTACTABLE', 'TEMPORARILY_UNREACHABLE', 'DO_NOT_CONTACT',
    ]);
    expect(getSchema('CandidateMatch').required).toContain('readinessStatus');
    expect(getSchema('CandidateMatch').required).not.toContain('readiness');
    expect(getProperties('CreateCandidateRequest').readinessStatus.enum).toEqual([
      'POTENTIAL', 'QUALIFIED', 'READY', 'PAUSED', 'NOT_SUITABLE',
    ]);
    expect(getProperties('CreateCandidateRequest').contactabilityStatus.enum).toEqual([
      'CONTACTABLE', 'TEMPORARILY_UNREACHABLE', 'DO_NOT_CONTACT',
    ]);
    expect(getProperties('JobOrder').status.enum).toEqual([
      'DRAFT', 'OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED', 'CLOSED',
    ]);
    expect(getProperties('Application').status.enum).toEqual([
      'MATCHED', 'IN_INTERVIEW_PROCESS', 'ON_HOLD', 'PASSED', 'FAILED', 'WITHDRAWN',
    ]);
    expect(getProperties('Application').source.enum).not.toContain('PORTAL');
    expect(getProperties('Interview').scheduleStatus.enum).toEqual([
      'DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
    ]);
    expect(getProperties('Interview').result.enum).toEqual([
      'PENDING', 'ADVANCE_NEXT_ROUND', 'PASS', 'FAIL',
    ]);
    expect(getProperties('WorkItem').status.enum).toEqual([
      'NEW', 'IN_PROGRESS', 'DONE', 'CANCELLED',
    ]);
    expect(getProperties('WorkItem').waitingOn.enum).toEqual([
      'NONE', 'CANDIDATE', 'CLIENT_PARTNER', 'INTERNAL', 'SYSTEM',
    ]);
    expect(getProperties('SupplyJourney').status.enum).toEqual([
      'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED',
    ]);
    expect(getProperties('EmailMessage').status.enum).toEqual([
      'DRAFT', 'QUEUED', 'SENDING', 'RETRY_WAIT', 'RECONCILING', 'RECEIVED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'CANCELLED',
    ]);
  });

  it('requires cursor pagination through the page envelope for every list response', () => {
    const listSchemas = Object.values(document.components.schemas).filter((schema) =>
      schema?.properties?.items,
    );
    expect(listSchemas.length).toBeGreaterThan(0);
    for (const schema of listSchemas) {
      const required = new Set(schema.required ?? []);
      expect(required.has('items')).toBe(true);
      expect(required.has('nextCursor')).toBe(false);
    }
    const page = getSchema('ApiPage');
    expect(page.required).toEqual(['nextCursor', 'hasMore']);
  });
});
