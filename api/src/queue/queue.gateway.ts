import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'queue',
  cors: { origin: process.env.WEB_ORIGIN?.split(',') ?? '*' },
})
export class QueueGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    const businessId = client.handshake.query.businessId as string;
    if (!businessId) return client.disconnect();
    client.join(`business:${businessId}`);
  }

  emitQueueUpdated(businessId: string) {
    this.server.to(`business:${businessId}`).emit('queue.updated', {
      businessId,
      at: Date.now(),
    });
  }
}
