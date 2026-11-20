import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Server, Socket } from 'socket.io';
import { QueueGateway } from './queue.gateway.js';
import { PrismaService } from '../prisma/prisma.service.js';

function fakeClient(query: Record<string, unknown>) {
  return {
    handshake: { query },
    join: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe('QueueGateway', () => {
  let gateway: QueueGateway;
  let prisma: { business: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    prisma = { business: { findUnique: vi.fn() } };
    gateway = new QueueGateway(prisma as unknown as PrismaService);
  });

  it('joins the business room for an active slug', async () => {
    prisma.business.findUnique.mockResolvedValue({
      id: 'biz_1',
      isActive: true,
    });
    const client = fakeClient({ slug: 'gupit-master' });

    await gateway.handleConnection(client as unknown as Socket);

    expect(prisma.business.findUnique).toHaveBeenCalledWith({
      where: { slug: 'gupit-master' },
      select: { id: true, isActive: true },
    });
    expect(client.join).toHaveBeenCalledWith('business:biz_1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects on unknown slug', async () => {
    prisma.business.findUnique.mockResolvedValue(null);
    const client = fakeClient({ slug: 'nope' });

    await gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('disconnects on inactive business', async () => {
    prisma.business.findUnique.mockResolvedValue({
      id: 'biz_1',
      isActive: false,
    });
    const client = fakeClient({ slug: 'gupit-master' });

    await gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('disconnects without a DB call when slug is missing', async () => {
    const client = fakeClient({});

    await gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(prisma.business.findUnique).not.toHaveBeenCalled();
  });

  it('disconnects without a DB call when slug is repeated', async () => {
    const client = fakeClient({ slug: ['a', 'b'] });

    await gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(prisma.business.findUnique).not.toHaveBeenCalled();
  });

  it('disconnects when the lookup throws', async () => {
    prisma.business.findUnique.mockRejectedValue(new Error('db down'));
    const client = fakeClient({ slug: 'gupit-master' });

    await gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('emits queue.updated to the business room', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    gateway.server = { to } as unknown as Server;

    gateway.emitQueueUpdated('biz_1');

    expect(to).toHaveBeenCalledWith('business:biz_1');
    expect(emit).toHaveBeenCalledWith('queue.updated', {
      businessId: 'biz_1',
      at: expect.any(Number),
    });
  });
});
