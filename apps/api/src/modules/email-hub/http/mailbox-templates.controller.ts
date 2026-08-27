import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard } from '../../identity-access/http/guards/session.guard.js';

@Controller('mailbox')
@UseGuards(SessionGuard, PolicyGuard)
export class MailboxTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('templates')
  @RequirePermission('email.read', 'NORMAL')
  async list() {
    const rows = await this.prisma.interviewQuestionTemplateVersion.findMany({
      where: { status: { not: 'RETIRED' } },
      include: { template: { select: { name: true } } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const items = rows.map((row) => {
      const raw = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      const payload = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
      return {
        id: row.id,
        name: row.template.name,
        subject: typeof payload.subject === 'string' ? payload.subject : '',
        body: typeof payload.body === 'string' ? payload.body : typeof payload.previewText === 'string' ? payload.previewText : '',
        variables: Array.isArray(payload.variables) ? payload.variables.filter((value): value is string => typeof value === 'string') : [],
      };
    });
    return {
      data: { items },
      page: { hasMore: false, nextCursor: null },
      requestId: getRequestContext()?.requestId ?? 'unknown-request',
    };
  }
}

