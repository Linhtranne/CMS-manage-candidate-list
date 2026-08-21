export const CLIENT_STATUSES = ['PROSPECT', 'ACTIVE', 'PAUSED', 'INACTIVE'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const JOB_ORDER_STATUSES = ['DRAFT', 'OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED', 'CLOSED'] as const;
export type JobOrderStatus = (typeof JOB_ORDER_STATUSES)[number];

export interface ClientContact {
  name: string;
  email?: string;
  phone?: string;
}

export interface ClientEntity {
  id: string;
  code: string;
  name: string;
  organizationType: string;
  industryLabels: string[];
  region: string;
  ownerId: string;
  ownerName?: string;
  teamId: string | null;
  status: ClientStatus;
  contact: ClientContact | null;
  notes: string | null;
  activeOrders: number;
  target: number;
  passed: number;
  lastActivity: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequirementSnapshot {
  catalogVersionId: string;
  occupation: string;
  criteria: string[];
  [key: string]: unknown;
}

export interface OrderMetrics {
  activeApplications: number;
  passed: number;
  supplied: number;
}

export interface JobOrderEntity {
  id: string;
  code: string;
  position: string;
  clientId: string;
  industryLabel: string;
  occupation: string;
  location: string;
  target: number;
  deadline: Date;
  ownerId: string;
  ownerName?: string;
  clientName?: string;
  teamId: string | null;
  status: JobOrderStatus;
  requirementVersion: number;
  requirementCatalogVersionId: string;
  requirementSnapshot: RequirementSnapshot;
  metrics: OrderMetrics;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderCommandContext {
  actorId: string;
  requestId: string;
  correlationId: string;
  reason?: string;
}
