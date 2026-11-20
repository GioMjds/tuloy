import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BusinessResponseDto } from './dto/business-response.dto.js';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

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
