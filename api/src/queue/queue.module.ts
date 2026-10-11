import { Module } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { QueueController } from './queue.controller.js';
import { QueueGateway } from './queue.gateway.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [QueueController],
  providers: [QueueService, QueueGateway, PrismaService],
  exports: [QueueService],
})
export class QueueModule {}
