import { TicketSource } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class JoinQueueDto {
  @IsUUID()
  serviceId: string;

  @IsString()
  @Length(1, 60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  customerName: string;

  @IsOptional()
  @Matches(/^(\+63|0)9\d{9}$/)
  phone?: string;

  @IsEnum(TicketSource)
  source: TicketSource = TicketSource.REMOTE;
}