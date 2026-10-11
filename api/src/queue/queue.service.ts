import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { JoinQueueDto } from './dto/join-queue.dto.js';
import {
  TicketResponseDto,
  TicketWithTokenDto,
} from './dto/ticket-response.dto.js';
import {
  ACTIVE_STATUSES,
  ALLOWED_TRANSITIONS,
  TicketStatus,
} from './queue.constants.js';
import { QueueGateway } from './queue.gateway.js';
import { formatDisplayCode, todayInTz } from './queue.utils.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

const OWNER_SAFE_SELECT = {
  id: true,
  businessId: true,
  serviceId: true,
  number: true,
  displayCode: true,
  customerName: true,
  phone: true,
  source: true,
  status: true,
  queueDate: true,
  createdAt: true,
  calledAt: true,
  servedAt: true,
  completedAt: true,
} satisfies Prisma.QueueTicketSelect;

const CUSTOMER_SELECT = {
  ...OWNER_SAFE_SELECT,
  token: true,
} satisfies Prisma.QueueTicketSelect;

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: QueueGateway,
  ) {}

  async join(slug: string, dto: JoinQueueDto): Promise<TicketWithTokenDto> {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: { id: true, services: { select: { id: true } } },
    });
    if (!business) throw new NotFoundException('Business not found');

    const serviceExists = business.services.some((s) => s.id === dto.serviceId);
    if (!serviceExists) {
      throw new NotFoundException('Service not found for this business');
    }

    const queueDate = todayInTz();
    const token = randomUUID();

    const ticket = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.queueCounter.upsert({
        where: {
          businessId_queueDate: { businessId: business.id, queueDate },
        },
        create: {
          businessId: business.id,
          queueDate,
          lastNumber: 1,
        },
        update: { lastNumber: { increment: 1 } },
      });

      const number = counter.lastNumber;

      return tx.queueTicket.create({
        data: {
          businessId: business.id,
          serviceId: dto.serviceId,
          number,
          displayCode: formatDisplayCode(number),
          customerName: dto.customerName,
          phone: dto.phone ?? null,
          token,
          source: dto.source,
          status: TicketStatus.WAITING,
          queueDate,
        },
        select: CUSTOMER_SELECT,
      });
    });

    this.gateway.emitQueueUpdated(business.id);

    return this.withComputed(ticket);
  }

  async getByToken(token: string): Promise<TicketWithTokenDto> {
    const ticket = await this.prisma.queueTicket.findUnique({
      where: { token },
      select: CUSTOMER_SELECT,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.withComputed(ticket);
  }

  async listForOwner(
    slug: string,
    user: JwtPayload,
  ): Promise<TicketResponseDto[]> {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    if (user.role !== UserRole.SUPER_ADMIN && business.id !== user.businessId) {
      throw new ForbiddenException('Not authorized for this business');
    }

    const queueDate = todayInTz();

    const tickets = await this.prisma.queueTicket.findMany({
      where: { businessId: business.id, queueDate },
      orderBy: [{ number: 'asc' }],
      select: OWNER_SAFE_SELECT,
    });

    const services = await this.prisma.service.findMany({
      where: { businessId: business.id },
      select: { id: true, durationMin: true },
    });
    const durationByService = new Map(
      services.map((s) => [s.id, s.durationMin]),
    );

    return this.attachPositions(tickets, durationByService);
  }

  async call(id: string, user: JwtPayload): Promise<TicketResponseDto> {
    return this.transition(id, user, TicketStatus.CALLED);
  }

  async skip(id: string, user: JwtPayload): Promise<TicketResponseDto> {
    return this.transition(id, user, TicketStatus.SKIPPED);
  }

  async complete(id: string, user: JwtPayload): Promise<TicketResponseDto> {
    return this.transition(id, user, TicketStatus.DONE);
  }

  async noShow(id: string, user: JwtPayload): Promise<TicketResponseDto> {
    return this.transition(id, user, TicketStatus.NO_SHOW);
  }

  private async transition(
    id: string,
    user: JwtPayload,
    to: TicketStatus,
  ): Promise<TicketResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.queueTicket.findUnique({ where: { id } });
      if (!ticket) throw new NotFoundException('Ticket not found');

      if (
        user.role !== UserRole.SUPER_ADMIN &&
        ticket.businessId !== user.businessId
      ) {
        throw new ForbiddenException('Not authorized for this business');
      }

      const from = ticket.status;
      if (
        !(ALLOWED_TRANSITIONS[from] as readonly TicketStatus[]).includes(to)
      ) {
        throw new ConflictException(`Invalid transition: ${from} -> ${to}`);
      }

      const data: Prisma.QueueTicketUpdateInput = { status: to };
      const now = new Date();
      if (to === TicketStatus.CALLED) data.calledAt = now;
      if (to === TicketStatus.SERVING) data.servedAt = now;
      if (to === TicketStatus.DONE) {
        data.completedAt = now;
        if (!ticket.servedAt) data.servedAt = now;
      }

      return tx.queueTicket.update({
        where: { id },
        data,
        select: OWNER_SAFE_SELECT,
      });
    });

    this.gateway.emitQueueUpdated(updated.businessId);
    return this.withComputed(updated);
  }

  private async withComputed<
    T extends {
      businessId: string;
      serviceId: string;
      number: number;
      queueDate: string;
      status: string;
    },
  >(ticket: T): Promise<T & { position: number; etaMinutes: number }> {
    const isActive = ACTIVE_STATUSES.includes(ticket.status as TicketStatus);

    const ahead = isActive
      ? await this.prisma.queueTicket.count({
          where: {
            businessId: ticket.businessId,
            queueDate: ticket.queueDate,
            status: { in: ACTIVE_STATUSES },
            number: { lt: ticket.number },
          },
        })
      : 0;

    const service = await this.prisma.service.findUnique({
      where: { id: ticket.serviceId },
      select: { durationMin: true },
    });
    const durationMin = service?.durationMin ?? 0;

    return {
      ...ticket,
      position: isActive ? ahead + 1 : 0,
      etaMinutes: isActive ? ahead * durationMin : 0,
    };
  }

  // Bulk version for the owner list to avoid N+1.
  private attachPositions<
    T extends { number: number; status: string; serviceId: string },
  >(
    tickets: T[],
    durationByService: Map<string, number>,
  ): Array<T & { position: number; etaMinutes: number }> {
    // Tickets are already sorted by `number` ascending.
    let activeSeen = 0;
    return tickets.map((t) => {
      const isActive = ACTIVE_STATUSES.includes(t.status as TicketStatus);
      const position = isActive ? ++activeSeen : 0;
      const durationMin = durationByService.get(t.serviceId) ?? 0;
      const etaMinutes = isActive ? (position - 1) * durationMin : 0;
      return { ...t, position, etaMinutes };
    });
  }
}
