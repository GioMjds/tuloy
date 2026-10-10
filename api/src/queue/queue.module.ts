import { Module } from '@nestjs/common';
import { QueueService } from './queue.service.js';
import { QueueController } from './queue.controller.js';

@Module({
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}
