import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { JourneyTemplateRepository } from '../application/journey-template.service.js';
import type { JourneyMilestoneTemplateEntity, JourneyTemplateStatus, JourneyTemplateVersionEntity } from '../domain/journey-template.js';

type TemplateRow = {
  id: string;
  templateId: string;
  version: number;
  status: string;
  residenceContext: string;
  visaRouteVersionId: string | null;
  caseType: string;
  sectorVersionId: string | null;
  occupationVersionId: string | null;
  applicability: Prisma.JsonValue | null;
  checksum: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
  template: { code: string; name: string };
  milestones: Array<{
    id: string;
    code: string;
    name: string;
    sequence: number;
    parallel: boolean;
    dependencyCodes: Prisma.JsonValue;
    applicability: Prisma.JsonValue | null;
    dueSlaDays: number | null;
    ownerRule: Prisma.JsonValue;
    checklistSchema: Prisma.JsonValue;
    evidenceRequirements: Prisma.JsonValue;
  }>;
};

function jsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function jsonArray(value: Prisma.JsonValue): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapMilestone(row: TemplateRow['milestones'][number]): JourneyMilestoneTemplateEntity {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sequence: row.sequence,
    parallel: row.parallel,
    dependencyCodes: jsonArray(row.dependencyCodes).filter((value): value is string => typeof value === 'string'),
    applicability: row.applicability && typeof row.applicability === 'object' && !Array.isArray(row.applicability) ? row.applicability as never : null,
    dueSlaDays: row.dueSlaDays,
    ownerRule: jsonObject(row.ownerRule),
    checklistSchema: jsonObject(row.checklistSchema),
    evidenceRequirements: jsonArray(row.evidenceRequirements).filter((value): value is JourneyMilestoneTemplateEntity['evidenceRequirements'][number] => Boolean(value && typeof value === 'object' && !Array.isArray(value))) as JourneyMilestoneTemplateEntity['evidenceRequirements'],
  };
}

function mapRow(row: TemplateRow): JourneyTemplateVersionEntity {
  return {
    id: row.id,
    templateId: row.templateId,
    code: row.template.code,
    name: row.template.name,
    version: row.version,
    status: row.status as JourneyTemplateStatus,
    residenceContext: row.residenceContext as JourneyTemplateVersionEntity['residenceContext'],
    visaRouteVersionId: row.visaRouteVersionId,
    caseType: row.caseType as JourneyTemplateVersionEntity['caseType'],
    sectorVersionId: row.sectorVersionId,
    occupationVersionId: row.occupationVersionId,
    applicability: row.applicability && typeof row.applicability === 'object' && !Array.isArray(row.applicability) ? row.applicability as never : null,
    milestones: row.milestones.map(mapMilestone),
    checksum: row.checksum,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class JourneyTemplatePrismaRepository implements JourneyTemplateRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  async withTransaction<T>(work: (repository: JourneyTemplateRepository, transaction: unknown) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) return this.prisma.$transaction(async (transaction) => work(new JourneyTemplatePrismaRepository(transaction), transaction));
    return work(this, this.prisma);
  }

  async findTemplate(code: string) {
    return this.prisma.supplyJourneyTemplate.findUnique({ where: { code }, select: { id: true, code: true, name: true } });
  }

  async createTemplate(code: string, name: string) {
    return this.prisma.supplyJourneyTemplate.create({ data: { code, name }, select: { id: true, code: true, name: true } });
  }

  async findVersion(id: string): Promise<JourneyTemplateVersionEntity | null> {
    const row = await this.prisma.supplyJourneyTemplateVersion.findUnique({ where: { id }, include: { template: { select: { code: true, name: true } }, milestones: { orderBy: { sequence: 'asc' } } } });
    return row ? mapRow(row as unknown as TemplateRow) : null;
  }

  async createVersion(input: Omit<JourneyTemplateVersionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<JourneyTemplateVersionEntity> {
    const row = await this.prisma.supplyJourneyTemplateVersion.create({
      data: {
        templateId: input.templateId,
        version: input.version,
        status: input.status,
        residenceContext: input.residenceContext,
        visaRouteVersionId: input.visaRouteVersionId,
        caseType: input.caseType,
        sectorVersionId: input.sectorVersionId,
        occupationVersionId: input.occupationVersionId,
        applicability: input.applicability === null ? Prisma.JsonNull : input.applicability as Prisma.InputJsonValue,
        checksum: input.checksum,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        milestones: { create: input.milestones.map((milestone) => ({
          code: milestone.code,
          name: milestone.name,
          sequence: milestone.sequence,
          parallel: milestone.parallel,
          dependencyCodes: milestone.dependencyCodes as Prisma.InputJsonValue,
          applicability: milestone.applicability === null || milestone.applicability === undefined ? Prisma.JsonNull : milestone.applicability as Prisma.InputJsonValue,
          dueSlaDays: milestone.dueSlaDays,
          ownerRule: milestone.ownerRule as Prisma.InputJsonValue,
          checklistSchema: milestone.checklistSchema as Prisma.InputJsonValue,
          evidenceRequirements: milestone.evidenceRequirements as unknown as Prisma.InputJsonValue,
        })) },
      },
      include: { template: { select: { code: true, name: true } }, milestones: { orderBy: { sequence: 'asc' } } },
    });
    return mapRow(row as unknown as TemplateRow);
  }

  async updateStatus(id: string, status: JourneyTemplateStatus): Promise<JourneyTemplateVersionEntity> {
    const row = await this.prisma.supplyJourneyTemplateVersion.update({ where: { id }, data: { status }, include: { template: { select: { code: true, name: true } }, milestones: { orderBy: { sequence: 'asc' } } } });
    return mapRow(row as unknown as TemplateRow);
  }

  async listVersions(status?: JourneyTemplateStatus): Promise<JourneyTemplateVersionEntity[]> {
    const rows = await this.prisma.supplyJourneyTemplateVersion.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ template: { code: 'asc' } }, { version: 'desc' }],
      include: { template: { select: { code: true, name: true } }, milestones: { orderBy: { sequence: 'asc' } } },
    });
    return rows.map((row) => mapRow(row as unknown as TemplateRow));
  }
}
