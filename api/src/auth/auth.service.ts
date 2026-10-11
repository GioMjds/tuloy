import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { AuthenticatedOwner } from './interfaces/authenticated-owner.interface.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private readonly dummyHash =
    '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBp9Zs4g2g8V1eIh9Qx0hVq3vQmZ2e';

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const owner = await this.validateOwner(dto.email, dto.password);

    if (!owner) {
      this.logger.warn(`Failed login attempt for email: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: owner.id,
      email: owner.email,
      businessId: owner.businessId,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      owner: {
        id: owner.id,
        email: owner.email,
        businessId: owner.businessId,
      }
    }
  }

  private async validateOwner(email: string, password: string) {
    const owner = await this.prisma.owner.findUnique({
      where: { email },
    });

    const hash = owner?.passwordHash ?? this.dummyHash;
    const passwordMatches = await bcrypt.compare(password, hash);

    if (!owner || !passwordMatches) return null;
    return owner;
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async findOwnerById(id: string): Promise<AuthenticatedOwner | null> {
    const owner = await this.prisma.owner.findUnique({
      where: { id },
      select: { id: true, email: true, businessId: true },
    });

    return owner ?? null;
  }
}
