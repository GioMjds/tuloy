import { z } from 'zod';
import { apiClient } from '../api/client';

export const ticketStatusSchema = z.enum([
  'WAITING',
  'CALLED',
  'SERVING',
  'DONE',
  'SKIPPED',
  'NO_SHOW',
  'CANCELLED',
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketSourceSchema = z.enum(['REMOTE', 'WALK_IN', 'KIOSK']);
export type TicketSource = z.infer<typeof ticketSourceSchema>;

export const joinQueueInputSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(1).max(60),
  phone: z
    .string()
    .regex(/^(\+63|0)9\d{9}$/)
    .optional(),
  source: ticketSourceSchema.default('REMOTE'),
});
export type JoinQueueInput = z.infer<typeof joinQueueInputSchema>;

export const ticketResponseSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  serviceId: z.string(),
  number: z.number(),
  displayCode: z.string(),
  customerName: z.string(),
  phone: z.string().nullable(),
  source: ticketSourceSchema,
  status: ticketStatusSchema,
  queueDate: z.string(),
  createdAt: z.coerce.date(),
  calledAt: z.coerce.date().nullable(),
  servedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  position: z.number(),
  etaMinutes: z.number(),
});
export type TicketResponse = z.infer<typeof ticketResponseSchema>;

export const ticketWithTokenSchema = ticketResponseSchema.extend({
  token: z.string(),
});
export type TicketWithToken = z.infer<typeof ticketWithTokenSchema>;

export const queueApi = {
  async join(slug: string, dto: JoinQueueInput): Promise<TicketWithToken> {
    return apiClient.post(
      `/businesses/${slug}/queue`,
      ticketWithTokenSchema,
      dto,
    );
  },

  async getByToken(token: string): Promise<TicketWithToken> {
    return apiClient.get(`/queue/${token}`, ticketWithTokenSchema);
  },

  async list(slug: string): Promise<TicketResponse[]> {
    return apiClient.get(
      `/businesses/${slug}/queue`,
      z.array(ticketResponseSchema),
    );
  },

  async call(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/call`, ticketResponseSchema);
  },

  async skip(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/skip`, ticketResponseSchema);
  },

  async complete(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/complete`, ticketResponseSchema);
  },

  async noShow(id: string): Promise<TicketResponse> {
    return apiClient.post(`/queue/${id}/no-show`, ticketResponseSchema);
  },
};
