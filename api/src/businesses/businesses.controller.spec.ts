import { describe, it, expect, vi } from 'vitest';
import { BusinessesController } from './businesses.controller.js';
import { BusinessesService } from './businesses.service.js';

describe('BusinessesController', () => {
  it('findBySlug delegates to businessesService.findBySlug', async () => {
    const business = { name: 'Barbero Uno', slug: 'barbero-uno' };
    const businessesService = {
      findBySlug: vi.fn().mockResolvedValue(business),
    } as unknown as BusinessesService;
    const controller = new BusinessesController(businessesService);

    const result = await controller.findBySlug('barbero-uno');

    expect(businessesService.findBySlug).toHaveBeenCalledWith('barbero-uno');
    expect(result).toEqual(business);
  });
});
