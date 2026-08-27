import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { NotificationsController } from './http/notifications.controller.js';
import { NotificationService } from './application/notification.service.js';

@Module({
  imports: [DatabaseModule, IdentityAccessModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
