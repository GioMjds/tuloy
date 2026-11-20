import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';

@WebSocketGateway({
  namespace: 'queue',
  cors: { origin: process.env.WEB_ORIGIN?.split(',') ?? '*' },
})
export class QueueGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const slug = client.handshake.query.slug;
    if (typeof slug !== 'string' || !slug) {
      client.disconnect();
      return;
    }

    try {
      const business = await this.prisma.business.findUnique({
        where: { slug },
        select: { id: true, isActive: true },
      });
      if (!business?.isActive) {
        client.disconnect();
        return;
      }
      await client.join(`business:${business.id}`);
    } catch {
      client.disconnect();
    }
  }

  emitQueueUpdated(businessId: string) {
    this.server.to(`business:${businessId}`).emit('queue.updated', {
      businessId,
      at: Date.now(),
    });
  }
}
