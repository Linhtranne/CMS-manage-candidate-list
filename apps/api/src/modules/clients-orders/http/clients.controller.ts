import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { ClientService } from '../application/client.service.js';
import { CreateClientDto, UpdateClientDto } from './clients-orders.dto.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';

@Controller('clients')
@UseGuards(SessionGuard, PolicyGuard)
export class ClientsController {
  constructor(private readonly clients: ClientService) {}

  @Get()
  @RequirePermission('client.view')
  async list(@Query('query') query?: string, @Query('status') status?: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string, @Req() request?: AuthenticatedRequest) {
    const auth = request?.auth;
    const result = await this.clients.list({ query, status: status as never, ownerId: auth?.userId, teamId: auth?.teamId, cursor, ...(limit ? { limit: Number(limit) } : {}) });
    return { data: { items: result.items.map(serializeClient) }, page: result.page, requestId: getRequestContext()?.requestId ?? 'unknown-request' };
  }

  @Get(':id')
  @RequirePermission('client.view')
  async get(@Param('id') id: string) { return serializeClient(await this.clients.get(id)); }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('client.create')
  create(@Body() body: CreateClientDto, @Req() request: AuthenticatedRequest) {
    return this.clients.create({
      name: body.name, organizationType: body.organizationType, industryLabels: body.industryLabels, region: body.region, ownerId: body.ownerId, teamId: body.teamId,
      contact: body.contactName ? { name: body.contactName, ...(body.contactEmail ? { email: body.contactEmail } : {}), ...(body.contactPhone ? { phone: body.contactPhone } : {}) } : null,
      notes: body.notes,
    }, this.context(request)).then(serializeClient);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequirePermission('client.update')
  update(@Param('id') id: string, @Body() body: UpdateClientDto, @Req() request: AuthenticatedRequest) {
    return this.clients.update(id, body, body.version, this.context(request)).then(serializeClient);
  }

  private context(request: AuthenticatedRequest) {
    const context = getRequestContext();
    return { actorId: request.auth!.userId, requestId: context?.requestId ?? 'unknown-request', correlationId: context?.correlationId ?? 'unknown-correlation' };
  }
}

function serializeClient(client: Awaited<ReturnType<ClientService['get']>>) {
  return {
    id: client.id, code: client.code, name: client.name, organizationType: client.organizationType, industryLabels: client.industryLabels,
    owner: { id: client.ownerId, name: client.ownerName ?? client.ownerId }, activeOrders: client.activeOrders, target: client.target, passed: client.passed,
    lastActivity: client.lastActivity.toISOString(), status: client.status, region: client.region, ...(client.contact ? { contactName: client.contact.name } : {}), notes: client.notes, version: client.version,
  };
}
