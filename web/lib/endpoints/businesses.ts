import { z } from 'zod';

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMin: z.number().int(),
  priceCentavos: z.number().int(),
});
export type Service = z.infer<typeof serviceSchema>;

export const businessSchema = z.object({
  name: z.string(),
  slug: z.string(),
  category: z.string(),
  openTime: z.string(),
  closeTime: z.string(),
  timezone: z.string(),
  services: z.array(serviceSchema),
});
export type Business = z.infer<typeof businessSchema>;

export const myBusinessSchema = businessSchema.pick({ name: true, slug: true });
