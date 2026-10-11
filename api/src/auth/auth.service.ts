import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { AuthenticatedUser } from './interfaces/authenticated-owner.interface.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private readonly dummyHash =
    '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBp9Zs4g2g8V1eIh9Qx0hVq3vQmZ2e';

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      this.logger.warn(`Login attempt for inactive user: ${dto.email}`);
      throw new UnauthorizedException('Account is inactive');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    } satisfies JwtPayload;

    const accessToken = await this.jwtService.signAsync(payload);
    const userDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
    } satisfies AuthUserDto;

    return {
      accessToken,
      user: userDto,
      owner: userDto,
    };
  }

  // Invalidate session on client side and record logout event.
  async logout(userId: string): Promise<{ message: string }> {
    this.logger.log(`User logged out: ${userId}`);
    return { message: 'Logged out successfully' };
  }

  private async validateUser(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          take: 1,
          select: { businessId: true },
        },
      },
    });

    const hash = user?.passwordHash ?? this.dummyHash;
    const passwordMatches = await bcrypt.compare(password, hash);

    if (!user || !passwordMatches) return null;

    const primaryBusinessId =
      user.role === UserRole.SUPER_ADMIN
        ? null
        : (user.memberships[0]?.businessId ?? null);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      businessId: primaryBusinessId,
    };
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  // Return authenticated user profile by id.
  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async findUserById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        memberships: {
          take: 1,
          select: { businessId: true },
        },
      },
    });

    if (!user || !user.isActive) return null;

    const primaryBusinessId =
      user.role === UserRole.SUPER_ADMIN
        ? null
        : (user.memberships[0]?.businessId ?? null);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: primaryBusinessId,
    };
  }

  // Alias for backward compatibility
  async findOwnerById(id: string): Promise<AuthenticatedUser | null> {
    return this.findUserById(id);
  }
}
