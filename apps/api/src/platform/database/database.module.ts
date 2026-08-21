import { Global, Module } from '@nestjs/common';
import { RuntimeConfigModule } from '../config/config.module.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  imports: [RuntimeConfigModule.forRoot()],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
