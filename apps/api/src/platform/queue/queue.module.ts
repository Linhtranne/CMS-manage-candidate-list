import { Global, Module } from '@nestjs/common';
import { RuntimeConfigModule } from '../config/config.module.js';
import { QueueService } from './queue.service.js';

@Global()
@Module({ imports: [RuntimeConfigModule.forRoot()], providers: [QueueService], exports: [QueueService] })
export class QueueModule {}
