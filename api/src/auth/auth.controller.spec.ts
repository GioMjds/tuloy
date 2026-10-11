import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from './interfaces/authenticated-owner.interface.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: AuthenticatedUser = {
    id: 'user_123',
    email: 'owner@shop.com',
    name: 'Shop Owner',
    role: UserRole.OWNER,
    businessId: 'biz_123',
  };

  beforeEach(() => {
    authService = {
      login: vi.fn(),
      me: vi.fn().mockResolvedValue(mockUser),
      logout: vi.fn().mockResolvedValue({ message: 'Logged out successfully' }),
      findUserById: vi.fn(),
      findOwnerById: vi.fn(),
      hashPassword: vi.fn(),
    } as unknown as AuthService;

    controller = new AuthController(authService);
  });

  it('me delegates to authService.me', async () => {
    const result = await controller.me(mockUser);
    expect(authService.me).toHaveBeenCalledWith('user_123');
    expect(result).toEqual(mockUser);
  });

  it('logout delegates to authService.logout', async () => {
    const result = await controller.logout(mockUser);
    expect(authService.logout).toHaveBeenCalledWith('user_123');
    expect(result).toEqual({ message: 'Logged out successfully' });
  });
});
