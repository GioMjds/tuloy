import { Module } from '@nestjs/common';
import { BusinessesService } from './businesses.service.js';
import { BusinessesController } from './businesses.controller.js';

@Module({
  controllers: [BusinessesController],
  providers: [BusinessesService],
})
export class BusinessesModule {}
