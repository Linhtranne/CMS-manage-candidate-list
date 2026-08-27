import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { SavedViewsController } from './http/saved-views.controller.js';
import { SavedViewsService } from './application/saved-views.service.js';

@Module({
  imports: [DatabaseModule, IdentityAccessModule],
  controllers: [SavedViewsController],
  providers: [SavedViewsService],
})
export class SavedViewsModule {}
