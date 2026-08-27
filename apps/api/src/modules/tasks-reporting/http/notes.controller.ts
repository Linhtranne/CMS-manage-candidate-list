import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { CreateEntityNoteDto } from './notes.dto.js';

const NOTE_ENTITY_TYPES = new Set(['CANDIDATE', 'APPLICATION', 'ORDER', 'CLIENT', 'JOURNEY']);

@Controller('notes')
@UseGuards(SessionGuard, PolicyGuard)
@RequirePermission('task.view')
export class NotesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    this.assertEntity(entityType, entityId);
    const items = await this.prisma.entityNote.findMany({ where: { entityType, entityId }, include: { author: { select: { id: true, displayName: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return { items: items.map((item) => ({ id: item.id, entityType: item.entityType, entityId: item.entityId, content: item.content, createdAt: item.createdAt.toISOString(), author: { id: item.author.id, name: item.author.displayName } })) };
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('task.update')
  async create(@Body() body: CreateEntityNoteDto, @Req() request: AuthenticatedRequest) {
    this.assertEntity(body.entityType, body.entityId);
    const item = await this.prisma.entityNote.create({ data: { entityType: body.entityType, entityId: body.entityId, content: body.content.trim(), authorUserId: request.auth!.userId }, include: { author: { select: { id: true, displayName: true } } } });
    return { id: item.id, entityType: item.entityType, entityId: item.entityId, content: item.content, createdAt: item.createdAt.toISOString(), author: { id: item.author.id, name: item.author.displayName }, requestId: getRequestContext()?.requestId ?? 'unknown-request' };
  }

  private assertEntity(entityType: string, entityId: string): void {
    if (!NOTE_ENTITY_TYPES.has(entityType) || !/^[0-9a-f-]{36}$/i.test(entityId)) throw Object.assign(new Error('INVALID_NOTE_ENTITY'), { code: 'INVALID_NOTE_ENTITY', statusCode: 422 });
  }
}
