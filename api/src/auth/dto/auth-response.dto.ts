import { UserRole } from '@prisma/client';

export class AuthUserDto {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  businessId?: string | null;
}

export class AuthOwnerDto extends AuthUserDto {}

export class AuthResponseDto {
  accessToken: string;
  user: AuthUserDto;
  owner: AuthUserDto;
}
