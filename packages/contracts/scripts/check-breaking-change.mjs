import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

const contractPath = resolve(process.cwd(), 'openapi/cms.yaml');
const baseRef = process.argv[2] ?? process.env.OPENAPI_BASE_REF;
const current = yaml.load(readFileSync(contractPath, 'utf8'));

function operationMap(document) {
  const result = new Map();
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      result.set(`${method.toUpperCase()} ${path}`, operation);
    }
  }
  return result;
}

function readBaseDocument() {
  if (!baseRef) return null;
  const source = execFileSync('git', ['show', `${baseRef}:packages/contracts/openapi/cms.yaml`], { encoding: 'utf8' });
  return yaml.load(source);
}

const base = readBaseDocument();
if (!base) {
  console.log('BREAKING_CHANGE_BASE=SKIPPED');
  console.log('Provide a git ref as the first argument or OPENAPI_BASE_REF to run compatibility comparison.');
  process.exit(0);
}

const currentOperations = operationMap(current);
const baseOperations = operationMap(base);
const allowedCanonicalReplacements = new Set(['POST /auth/login']);
const allowedRemovedRequiredFields = new Set([
  'ApiProblem.code',
  'ApiProblem.message',
  'WorkItemsResponse.nextCursor',
  'CandidatesResponse.nextCursor',
  'ApplicationsResponse.nextCursor',
  'SupplyJourneysResponse.nextCursor',
  'AdminAuditResponse.nextCursor',
  'CandidateMatch.readiness',
]);
const allowedEnumAlignments = new Set([
  'Candidate.readinessStatus',
  'Candidate.contactabilityStatus',
  'JobOrder.status',
  'Application.source',
  'WorkItem.status',
  'WorkItemUpdate.status',
  'CreateCandidateRequest.readinessStatus',
  'CreateCandidateRequest.contactabilityStatus',
  'OrderStatusUpdate.status',
  'EmailMessage.status',
]);
const breaking = [];

for (const [key, operation] of baseOperations) {
  if (!currentOperations.has(key) && !allowedCanonicalReplacements.has(key)) {
    breaking.push(`removed operation: ${key}`);
  }
  const replacement = currentOperations.get(key);
  if (replacement && operation.operationId !== replacement.operationId) {
    breaking.push(`changed operationId: ${key} (${operation.operationId} -> ${replacement.operationId})`);
  }
}

const baseSchemas = base.components?.schemas ?? {};
const currentSchemas = current.components?.schemas ?? {};
for (const [name, schema] of Object.entries(baseSchemas)) {
  const next = currentSchemas[name];
  if (!next) continue;
  const baseRequired = new Set(schema.required ?? []);
  const nextRequired = new Set(next.required ?? []);
  for (const field of baseRequired) {
    if (!nextRequired.has(field) && !allowedRemovedRequiredFields.has(`${name}.${field}`)) {
      breaking.push(`removed required response field: ${name}.${field}`);
    }
  }
  for (const [property, baseDefinition] of Object.entries(schema.properties ?? {})) {
    const nextDefinition = next.properties?.[property];
    if (!nextDefinition?.enum || !baseDefinition.enum) continue;
    const removedValues = baseDefinition.enum.filter((value) => !nextDefinition.enum.includes(value));
    if (removedValues.length && !allowedEnumAlignments.has(`${name}.${property}`)) {
      breaking.push(`removed enum values: ${name}.${property}=${removedValues.join(',')}`);
    }
  }
}

if (breaking.length) {
  console.error('Breaking OpenAPI changes detected:');
  for (const issue of breaking) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`BREAKING_CHANGE_BASE=${baseRef}`);
console.log('BREAKING_CHANGES=0');
