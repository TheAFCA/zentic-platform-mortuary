import { ProvisioningSagaService } from './provisioning-saga.service';

describe('ProvisioningSagaService', () => {
  const tenantId = 'tenant-1';
  const eventId = 'event-1';

  it('returns a provisioned event to SCHEDULED until video signal is confirmed', async () => {
    const prisma = {
      event: {
        findUnique: jest.fn().mockResolvedValue({
          id: eventId,
          status: 'SCHEDULED',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const stateMachine = {
      transition: jest.fn().mockResolvedValue({ success: true }),
    };
    const provider = {
      name: 'mux' as const,
      createLiveStream: jest.fn().mockResolvedValue({
        providerStreamId: 'mux-stream-1',
        streamKey: 'stream-key',
        rtmpUrl: 'rtmps://global-live.mux.com:443/app',
        playbackId: 'playback-1',
        playbackPolicy: 'public',
      }),
      disableLiveStream: jest.fn(),
    };
    const service = new ProvisioningSagaService(
      prisma as never,
      stateMachine as never,
      provider as never,
    );

    await service.provisionEvent(tenantId, eventId, true);

    expect(stateMachine.transition).toHaveBeenNthCalledWith(
      1,
      tenantId,
      eventId,
      'SCHEDULED',
      'PROVISIONING',
      'provision_start',
      expect.any(Object),
    );
    expect(stateMachine.transition).toHaveBeenNthCalledWith(
      2,
      tenantId,
      eventId,
      'PROVISIONING',
      'SCHEDULED',
      'provision_success',
      expect.any(Object),
    );
  });
});
