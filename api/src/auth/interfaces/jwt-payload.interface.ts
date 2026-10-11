export interface JwtPayload {
  sub: string;        // owner id
  email: string;
  businessId: string;
  // iat / exp are added by @nestjs/jwt automatically
}