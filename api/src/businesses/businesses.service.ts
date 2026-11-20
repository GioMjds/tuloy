import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BusinessResponseDto,
  MyBusinessDto,
} from './dto/business-response.dto.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(businessId?: string | null): Promise<MyBusinessDto> {
    const business = businessId
      ? await this.prisma.business.findUnique({
          where: { id: businessId },
          select: { name: true, slug: true, isActive: true },
        })
      : null;
    // Inactive shops have no working public page, so there is nothing to share.
    if (!business?.isActive) throw new NotFoundException('Business not found');
    return { name: business.name, slug: business.slug };
  }

  async findBySlug(slug: string): Promise<BusinessResponseDto> {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        category: true,
        openTime: true,
        closeTime: true,
        timezone: true,
        isActive: true,
        services: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            durationMin: true,
            priceCentavos: true,
          },
        },
      },
    });
    // Inactive shops are hidden the same as unknown ones.
    if (!business?.isActive) throw new NotFoundException('Business not found');
    const { isActive: _isActive, ...rest } = business;
    return rest;
  }
}
