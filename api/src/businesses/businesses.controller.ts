import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.js';
import { BusinessesService } from './businesses.service.js';
import { BusinessResponseDto } from './dto/business-response.dto.js';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<BusinessResponseDto> {
    return this.businessesService.findBySlug(slug);
  }
}
