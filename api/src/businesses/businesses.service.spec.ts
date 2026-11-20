import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('BusinessesService', () => {
  let service: BusinessesService;
  let prisma: { business: { findUnique: ReturnType<typeof vi.fn> } };

  const row = {
    name: 'Barbero Uno',
    slug: 'barbero-uno',
    category: 'barbershop',
    openTime: '09:00',
    closeTime: '18:00',
    timezone: 'Asia/Manila',
    isActive: true,
    services: [
      { id: 'svc_1', name: 'Haircut', durationMin: 30, priceCentavos: 15000 },
    ],
  };

  beforeEach(() => {
    prisma = { business: { findUnique: vi.fn() } };
    service = new BusinessesService(prisma as unknown as PrismaService);
  });

  it('findBySlug returns public shape without isActive', async () => {
    prisma.business.findUnique.mockResolvedValue(row);

    const result = await service.findBySlug('barbero-uno');

    const { isActive: _isActive, ...expected } = row;
    expect(result).toEqual(expected);
    expect(prisma.business.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'barbero-uno' } }),
    );
  });

  it('findBySlug throws NotFoundException for unknown slug', async () => {
    prisma.business.findUnique.mockResolvedValue(null);

    await expect(service.findBySlug('nope')).rejects.toThrow(NotFoundException);
  });

  it('findMine returns only name and slug for the owner business', async () => {
    prisma.business.findUnique.mockResolvedValue({
      name: row.name,
      slug: row.slug,
      isActive: true,
    });

    const result = await service.findMine('biz_1');

    expect(result).toEqual({ name: row.name, slug: row.slug });
    expect(prisma.business.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'biz_1' } }),
    );
  });

  it('findMine throws NotFoundException without querying when user has no business', async () => {
    await expect(service.findMine(null)).rejects.toThrow(NotFoundException);
    expect(prisma.business.findUnique).not.toHaveBeenCalled();
  });

  it('findMine throws NotFoundException for inactive business', async () => {
    prisma.business.findUnique.mockResolvedValue({
      name: row.name,
      slug: row.slug,
      isActive: false,
    });

    await expect(service.findMine('biz_1')).rejects.toThrow(NotFoundException);
  });

  it('findBySlug throws NotFoundException for inactive business', async () => {
    prisma.business.findUnique.mockResolvedValue({ ...row, isActive: false });

    await expect(service.findBySlug('barbero-uno')).rejects.toThrow(
      NotFoundException,
    );
  });
});
