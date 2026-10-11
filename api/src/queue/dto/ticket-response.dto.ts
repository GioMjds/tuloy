import { TicketSource } from '@prisma/client';
import { TicketStatus } from '../queue.constants.js';

export class TicketResponseDto {
  id: string;
  businessId: string;
  serviceId: string;
  number: number;
  displayCode: string;
  customerName: string;
  phone: string | null;
  source: TicketSource;
  status: TicketStatus;
  queueDate: string; // YYYY-MM-DD, business tz
  createdAt: Date;
  calledAt: Date | null
  servedAt: Date | null;
  completedAt: Date | null;

  // computed, not stored
  position: number; // 1-based
  etaMinutes: number; // position-relative wait estimate
}

// Returned from POST /queue and GET /queue/:token — includes the secret token
export class TicketWithTokenDto extends TicketResponseDto {
  token: string;
}
