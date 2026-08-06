import { Test, TestingModule } from '@nestjs/testing';

import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { getQueueToken } from 'src/engine/core-modules/message-queue/utils/get-queue-token.util';
import { DISPATCH_NOTIFICATION_JOB_NAME } from 'src/modules/idda-notifications/constants/dispatch-notification-job-name.constant';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { type NotificationPayload } from 'src/modules/idda-notifications/types/notification-payload.type';

const MOCK_PAYLOAD: NotificationPayload = {
  workspaceId: 'ws-123',
  recipientWorkspaceMemberId: 'member-456',
  recipientEmail: 'test@example.com',
  title: 'Lead assigned',
  body: 'A new lead has been assigned to you.',
  notificationType: 'LEAD_ASSIGNED',
  channel: 'BOTH',
  actionUrl: '/leads/lead-id-123',
  relatedRecordId: 'lead-id-123',
  relatedObjectMetadataId: 'obj-meta-789',
};

describe('NotificationDispatchService', () => {
  let service: NotificationDispatchService;
  let queueAddSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockQueueService = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDispatchService,
        {
          provide: getQueueToken(MessageQueue.iddaNotificationQueue),
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get(NotificationDispatchService);
    queueAddSpy = mockQueueService.add;
  });

  it('enqueues the dispatch job with the full payload', async () => {
    await service.dispatch(MOCK_PAYLOAD);

    expect(queueAddSpy).toHaveBeenCalledTimes(1);
    expect(queueAddSpy).toHaveBeenCalledWith(
      DISPATCH_NOTIFICATION_JOB_NAME,
      { workspaceId: MOCK_PAYLOAD.workspaceId, payload: MOCK_PAYLOAD },
    );
  });

  it('dispatches an IN_APP notification via dispatchInApp', async () => {
    const { channel: _, ...rest } = MOCK_PAYLOAD;

    await service.dispatchInApp(rest);

    expect(queueAddSpy).toHaveBeenCalledWith(
      DISPATCH_NOTIFICATION_JOB_NAME,
      expect.objectContaining({
        payload: expect.objectContaining({ channel: 'IN_APP' }),
      }),
    );
  });

  it('dispatches an EMAIL notification via dispatchEmail', async () => {
    const { channel: _, ...rest } = MOCK_PAYLOAD;

    await service.dispatchEmail({ ...rest, recipientEmail: 'user@example.com' });

    expect(queueAddSpy).toHaveBeenCalledWith(
      DISPATCH_NOTIFICATION_JOB_NAME,
      expect.objectContaining({
        payload: expect.objectContaining({ channel: 'EMAIL' }),
      }),
    );
  });
});
