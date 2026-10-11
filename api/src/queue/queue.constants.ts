import { TicketStatus } from '@prisma/client';

export { TicketStatus };

export const ALLOWED_TRANSITIONS = {
  WAITING: ['CALLED', 'SKIPPED', 'NO_SHOW', 'CANCELLED'],
  CALLED: ['SERVING', 'DONE', 'SKIPPED', 'NO_SHOW'],
  SERVING: ['DONE', 'NO_SHOW'],
  DONE: [],
  SKIPPED: [],
  NO_SHOW: [],
  CANCELLED: [],
} satisfies Record<TicketStatus, TicketStatus[]>;

export const ACTIVE_STATUSES: TicketStatus[] = ['WAITING', 'CALLED', 'SERVING'];

export const BUSINESS_TZ = 'Asia/Manila';
