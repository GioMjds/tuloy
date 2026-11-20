import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-owner.interface.js';
import { BusinessesService } from './businesses.service.js';
import {
  BusinessResponseDto,
  MyBusinessDto,
} from './dto/business-response.dto.js';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  // Declared before :slug so "mine" is not captured as a slug.
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<MyBusinessDto> {
    return this.businessesService.findMine(user.businessId);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<BusinessResponseDto> {
    return this.businessesService.findBySlug(slug);
  }
}
