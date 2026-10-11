import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    const jwtService = {
      signAsync: vi.fn(),
    } as unknown as JwtService;

    service = new AuthService(prisma as unknown as PrismaService, jwtService);
  });

  it('logout returns confirmation message', async () => {
    const result = await service.logout('user_123');
    expect(result).toEqual({ message: 'Logged out successfully' });
  });

  it('me returns user profile when user exists', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_123',
      email: 'admin@tuloy.ph',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      memberships: [],
    });

    const result = await service.me('user_123');
    expect(result).toEqual({
      id: 'user_123',
      email: 'admin@tuloy.ph',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      businessId: null,
    });
  });

  it('me throws UnauthorizedException when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.me('user_unknown')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
