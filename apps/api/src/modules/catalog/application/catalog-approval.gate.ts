import { readFileSync } from 'node:fs';
import { Inject, Injectable } from '@nestjs/common';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../../../platform/config/config.module.js';
import type { CatalogApproval } from '../domain/catalog.types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function scopeAllows(scope: unknown, nodeEnv: RuntimeConfig['nodeEnv']): boolean {
  const values = Array.isArray(scope) ? scope : [scope];
  return values.some((value) => value === nodeEnv || value === 'staging-and-production');
}

/** Reads the mounted, server-owned DEC-004 artifact. Client input is never used. */
@Injectable()
export class CatalogApprovalGate {
  constructor(@Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  getApproved(): CatalogApproval | undefined {
    const path = this.config.catalog.approvalRecordFile;
    if (!path) return undefined;

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    } catch {
      return undefined;
    }
    if (!isRecord(raw) || raw.id !== 'DEC-004' || raw.status !== 'approved' || !scopeAllows(raw.scope, this.config.nodeEnv)) return undefined;
    if (typeof raw.artifact_checksum !== 'string' || !/^sha256:[0-9a-f]{64}$/i.test(raw.artifact_checksum)) return undefined;

    const approvals = Array.isArray(raw.approvals) ? raw.approvals.filter(isRecord) : [];
    for (const role of ['Product Owner', 'Japan Operations Owner']) {
      const approval = approvals.find((candidate) => candidate.role === role);
      if (!approval || typeof approval.identity !== 'string' || !approval.identity.trim() || approval.identity.includes('<')
        || typeof approval.at !== 'string' || Number.isNaN(Date.parse(approval.at))) return undefined;
    }

    return {
      decisionId: 'DEC-004',
      artifactChecksum: raw.artifact_checksum,
      scope: Array.isArray(raw.scope) ? raw.scope.join(',') : String(raw.scope),
    };
  }
}
