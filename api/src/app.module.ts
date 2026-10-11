import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthService } from './auth/auth.service.js';
import { JwtStrategy } from './auth/jwt.strategy.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { QueueModule } from './queue/queue.module.js';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    PassportModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '7d',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env'],
    }),
    PrismaModule,
    AuthModule,
    BusinessesModule,
    QueueModule,
    AppointmentsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, AuthService],
  exports: [AuthService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
