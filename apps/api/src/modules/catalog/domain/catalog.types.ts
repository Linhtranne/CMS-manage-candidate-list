import type { CatalogStatus, CatalogType } from './catalog.rules.js';

export interface CatalogVersionEntity {
  id: string;
  itemId: string;
  type: CatalogType;
  code: string;
  version: number;
  status: CatalogStatus;
  labelVi: string;
  payload: Record<string, unknown>;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogApproval {
  decisionId: 'DEC-004';
  artifactChecksum: string;
  scope: string;
}

export interface CatalogCommandContext {
  actorId: string;
  requestId: string;
  correlationId: string;
  reason?: string;
  approval?: CatalogApproval;
}
