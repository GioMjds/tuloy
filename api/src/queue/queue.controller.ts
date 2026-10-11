import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Public } from '../auth/public.decorator.js';
import { QueueService } from './queue.service.js';
import { JoinQueueDto } from './dto/join-queue.dto.js';
import {
  TicketResponseDto,
  TicketWithTokenDto,
} from './dto/ticket-response.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@Controller()
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Public()
  @Post('businesses/:slug/queue')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  join(
    @Param('slug') slug: string,
    @Body() dto: JoinQueueDto,
  ): Promise<TicketWithTokenDto> {
    return this.queueService.join(slug, dto);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('queue/:token')
  getByToken(@Param('token') token: string): Promise<TicketWithTokenDto> {
    return this.queueService.getByToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('businesses/:slug/queue')
  list(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketResponseDto[]> {
    return this.queueService.listForOwner(slug, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('queue/:id/call')
  call(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketResponseDto> {
    return this.queueService.call(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('queue/:id/skip')
  skip(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketResponseDto> {
    return this.queueService.skip(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('queue/:id/complete')
  complete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketResponseDto> {
    return this.queueService.complete(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('queue/:id/no-show')
  noShow(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TicketResponseDto> {
    return this.queueService.noShow(id, user);
  }
}
