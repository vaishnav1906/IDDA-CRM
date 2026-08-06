import { Test, TestingModule } from '@nestjs/testing';

import { Queue } from 'bullmq';

import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { getQueueToken } from 'src/engine/core-modules/message-queue/utils/get-queue-token.util';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import {
  buildJobPrefix,
  LeadFollowUpReminderService,
} from 'src/modules/lead-follow-up-reminder/services/lead-follow-up-reminder.service';

// ─── BullMQ Queue mock ────────────────────────────────────────────────────────
// We intercept the Queue constructor so removeExistingJobs() never touches Redis.
const mockQueueGetJobs = jest.fn().mockResolvedValue([]);
const mockQueueClose = jest.fn().mockResolvedValue(undefined);

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    getJobs: mockQueueGetJobs,
    close: mockQueueClose,
  })),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const WS_ID_A = 'workspace-aaaa-1111';
const WS_ID_B = 'workspace-bbbb-2222';
const LEAD_ID = 'lead-1111-2222-3333';
const TASK_ID_EXISTING = 'task-existing-4444';
const FUTURE_DATE = new Date(Date.now() + 60_000); // 1 minute ahead
const PAST_DATE = new Date(Date.now() - 60_000);

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildModule(
  reposByName: Record<string, ReturnType<typeof makeRepo>>,
  queueAddMock: jest.Mock,
) {
  const mockOrm = {
    executeInWorkspaceContext: jest.fn(async (fn: () => Promise<void>) => fn()),
    getRepository: jest
      .fn()
      .mockImplementation(
        (_wsId: string, name: string) => reposByName[name] ?? makeRepo(),
      ),
  };

  const mockQueueService = { add: queueAddMock };

  const mockTimeline = { write: jest.fn().mockResolvedValue(undefined) };

  const mockRedis = { getQueueClient: jest.fn().mockReturnValue({} /* IORedis stub */) };

  return Test.createTestingModule({
    providers: [
      LeadFollowUpReminderService,
      { provide: getQueueToken(MessageQueue.delayedJobsQueue), useValue: mockQueueService },
      { provide: GlobalWorkspaceOrmManager, useValue: mockOrm },
      { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      { provide: RedisClientService, useValue: mockRedis },
    ],
  }).compile();
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('LeadFollowUpReminderService', () => {
  let service: LeadFollowUpReminderService;
  let queueAdd: jest.Mock;
  let timelineWrite: jest.Mock;
  let orm: any;

  // Common repos
  let leadRepo: ReturnType<typeof makeRepo>;
  let taskRepo: ReturnType<typeof makeRepo>;
  let taskTargetRepo: ReturnType<typeof makeRepo>;
  let memberRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueueGetJobs.mockResolvedValue([]);

    leadRepo = makeRepo({
      findOne: jest.fn().mockResolvedValue({
        id: LEAD_ID,
        clinicName: 'AIIMS Delhi',
        doctorName: 'Dr. Sharma',
        phone: '9999999999',
        city: 'Delhi',
        status: 'FOLLOW_UP_NEEDED',
        assignedToId: 'member-abc',
        nextFollowUpDate: FUTURE_DATE,
      }),
    });

    taskRepo = makeRepo({
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({ id: 'task-new-5678' }),
    });

    taskTargetRepo = makeRepo({
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue({}),
    });

    memberRepo = makeRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'member-abc',
        userEmail: 'user@idda.com',
        name: { firstName: 'Aisha', lastName: 'Verma' },
      }),
    });

    queueAdd = jest.fn().mockResolvedValue(undefined);

    const moduleRef: TestingModule = await buildModule(
      { lead: leadRepo, task: taskRepo, taskTarget: taskTargetRepo, workspaceMember: memberRepo },
      queueAdd,
    );

    service = moduleRef.get(LeadFollowUpReminderService);
    timelineWrite = moduleRef.get(WorkflowTimelineWriterService).write as jest.Mock;
    orm = moduleRef.get(GlobalWorkspaceOrmManager);
  });

  // ─── schedule() ─────────────────────────────────────────────────────────────

  describe('schedule()', () => {
    it('rejects a reminderAt in the past', async () => {
      await expect(
        service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: PAST_DATE }),
      ).rejects.toThrow('must be in the future');

      expect(queueAdd).not.toHaveBeenCalled();
    });

    it('creates a new Task and enqueues a delayed job when no open task exists', async () => {
      taskTargetRepo.find.mockResolvedValue([]);

      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE });

      // Task created
      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Follow-up: AIIMS Delhi', status: 'TODO' }),
      );

      // TaskTarget linked
      expect(taskTargetRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 'task-new-5678', targetLeadId: LEAD_ID }),
      );

      // Delayed job enqueued
      expect(queueAdd).toHaveBeenCalledWith(
        'fire-follow-up-reminder',
        expect.objectContaining({
          workspaceId: WS_ID_A,
          leadId: LEAD_ID,
          taskId: 'task-new-5678',
          reminderAt: FUTURE_DATE.toISOString(),
        }),
        expect.objectContaining({
          id: `lead-reminder:${WS_ID_A}:${LEAD_ID}`,
          delay: expect.any(Number),
        }),
      );

      // Timeline: scheduled (not rescheduled)
      expect(timelineWrite).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'workflow.lead.followup_reminder_scheduled' }),
      );
    });

    it('updates dueAt on an existing open follow-up Task (reschedule)', async () => {
      taskTargetRepo.find.mockResolvedValue([{ taskId: TASK_ID_EXISTING, targetLeadId: LEAD_ID }]);
      taskRepo.findOne.mockResolvedValue({
        id: TASK_ID_EXISTING,
        title: 'Follow-up: AIIMS Delhi',
        status: 'TODO',
        assigneeId: 'member-abc',
      });

      const newTime = new Date(Date.now() + 120_000);

      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: newTime });

      // Task updated, not a new one created
      expect(taskRepo.update).toHaveBeenCalledWith(
        TASK_ID_EXISTING,
        expect.objectContaining({ dueAt: newTime }),
      );
      expect(taskRepo.save).not.toHaveBeenCalled();

      // Timeline: rescheduled
      expect(timelineWrite).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'workflow.lead.followup_reminder_rescheduled' }),
      );
    });

    it('does not create a duplicate Task when one already exists', async () => {
      taskTargetRepo.find.mockResolvedValue([{ taskId: TASK_ID_EXISTING, targetLeadId: LEAD_ID }]);
      taskRepo.findOne.mockResolvedValue({
        id: TASK_ID_EXISTING,
        title: 'Follow-up: AIIMS Delhi',
        status: 'TODO',
      });

      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE });
      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: new Date(Date.now() + 90_000) });

      // save() should never be called — always update() instead
      expect(taskRepo.save).not.toHaveBeenCalled();
    });

    it('throws if lead does not exist', async () => {
      leadRepo.findOne.mockResolvedValue(null);

      await expect(
        service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE }),
      ).rejects.toThrow(`Lead ${LEAD_ID} not found`);

      expect(queueAdd).not.toHaveBeenCalled();
    });

    it('job prefix is workspace-scoped — two workspaces produce different prefixes', () => {
      const prefixA = buildJobPrefix(WS_ID_A, LEAD_ID);
      const prefixB = buildJobPrefix(WS_ID_B, LEAD_ID);

      expect(prefixA).not.toBe(prefixB);
      expect(prefixA).toContain(WS_ID_A);
      expect(prefixB).toContain(WS_ID_B);
    });

    it('uses the clinic name in the task title when available', async () => {
      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE });

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Follow-up: AIIMS Delhi' }),
      );
    });

    it('falls back to doctor name in task title when clinicName is null', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: LEAD_ID,
        clinicName: null,
        doctorName: 'Dr. Mehta',
        assignedToId: 'member-abc',
        status: 'FOLLOW_UP_NEEDED',
        nextFollowUpDate: FUTURE_DATE,
      });

      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE });

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Follow-up: Dr. Mehta' }),
      );
    });

    it('delays the BullMQ job by approximately the correct number of milliseconds', async () => {
      const target = new Date(Date.now() + 300_000); // 5 minutes

      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: target });

      const opts = queueAdd.mock.calls[0][2];

      // Allow 500 ms tolerance for test execution time
      expect(opts.delay).toBeGreaterThan(299_000);
      expect(opts.delay).toBeLessThanOrEqual(300_500);
    });

    it('attempts to remove existing jobs before enqueuing', async () => {
      const fakeJob = { id: `lead-reminder:${WS_ID_A}:${LEAD_ID}-some-uuid`, remove: jest.fn() };
      mockQueueGetJobs.mockResolvedValueOnce([fakeJob]);

      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE });

      expect(fakeJob.remove).toHaveBeenCalledTimes(1);
    });

    it('still enqueues even when removeExistingJobs scan returns no matches', async () => {
      mockQueueGetJobs.mockResolvedValue([{ id: 'some-other-job-123', remove: jest.fn() }]);

      await service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE });

      expect(queueAdd).toHaveBeenCalledTimes(1);
    });

    it('succeeds even when job.remove() throws (active job race)', async () => {
      const fakeJob = {
        id: `lead-reminder:${WS_ID_A}:${LEAD_ID}-some-uuid`,
        remove: jest.fn().mockRejectedValue(new Error('Job is active')),
      };
      mockQueueGetJobs.mockResolvedValueOnce([fakeJob]);

      await expect(
        service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: FUTURE_DATE }),
      ).resolves.not.toThrow();

      // Job still enqueued despite remove failure
      expect(queueAdd).toHaveBeenCalledTimes(1);
    });

    it('enqueues only once even when called twice simultaneously', async () => {
      const slowTarget = new Date(Date.now() + 600_000);
      const fasterTarget = new Date(Date.now() + 120_000);

      // First call creates task; second call updates it
      taskTargetRepo.find
        .mockResolvedValueOnce([]) // first: no existing task
        .mockResolvedValueOnce([{ taskId: 'task-new-5678', targetLeadId: LEAD_ID }]); // second: finds it
      taskRepo.findOne
        .mockResolvedValueOnce(null) // first: no existing
        .mockResolvedValueOnce({ id: 'task-new-5678', title: 'Follow-up: AIIMS Delhi', status: 'TODO' }); // second: finds it

      await Promise.all([
        service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: slowTarget }),
        service.schedule({ workspaceId: WS_ID_A, leadId: LEAD_ID, reminderAt: fasterTarget }),
      ]);

      // Both enqueue; the latest reminderAt wins at fire time via stale-job check
      expect(queueAdd).toHaveBeenCalledTimes(2);
    });
  });

  // ─── cancel() ───────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('clears nextFollowUpDate and marks task CANCELLED', async () => {
      taskTargetRepo.find.mockResolvedValue([{ taskId: TASK_ID_EXISTING, targetLeadId: LEAD_ID }]);
      taskRepo.findOne.mockResolvedValue({
        id: TASK_ID_EXISTING,
        title: 'Follow-up: AIIMS Delhi',
        status: 'TODO',
      });

      await service.cancel({ workspaceId: WS_ID_A, leadId: LEAD_ID });

      expect(leadRepo.update).toHaveBeenCalledWith(
        LEAD_ID,
        expect.objectContaining({ nextFollowUpDate: null }),
      );

      expect(taskRepo.update).toHaveBeenCalledWith(
        TASK_ID_EXISTING,
        expect.objectContaining({ status: 'CANCELLED' }),
      );
    });

    it('is idempotent — safe to call twice', async () => {
      // Second call: lead has no nextFollowUpDate, task already CANCELLED
      leadRepo.findOne
        .mockResolvedValueOnce({ id: LEAD_ID, nextFollowUpDate: FUTURE_DATE, status: 'FOLLOW_UP_NEEDED' })
        .mockResolvedValueOnce({ id: LEAD_ID, nextFollowUpDate: null, status: 'FOLLOW_UP_NEEDED' });

      taskTargetRepo.find.mockResolvedValue([{ taskId: TASK_ID_EXISTING }]);
      taskRepo.findOne
        .mockResolvedValueOnce({ id: TASK_ID_EXISTING, title: 'Follow-up: AIIMS Delhi', status: 'TODO' })
        .mockResolvedValueOnce({ id: TASK_ID_EXISTING, title: 'Follow-up: AIIMS Delhi', status: 'CANCELLED' });

      await service.cancel({ workspaceId: WS_ID_A, leadId: LEAD_ID });
      await service.cancel({ workspaceId: WS_ID_A, leadId: LEAD_ID });

      // First call updates, second observes null and skips leadRepo.update
      expect(leadRepo.update).toHaveBeenCalledTimes(1);
      // Task already CANCELLED — update not called on second pass
      expect(taskRepo.update).toHaveBeenCalledTimes(1);

      // Timeline written both times
      expect(timelineWrite).toHaveBeenCalledTimes(2);
    });

    it('does not update lead when nextFollowUpDate is already null', async () => {
      leadRepo.findOne.mockResolvedValue({
        id: LEAD_ID,
        nextFollowUpDate: null,
        status: 'CONTACTED',
      });
      taskTargetRepo.find.mockResolvedValue([]);

      await service.cancel({ workspaceId: WS_ID_A, leadId: LEAD_ID });

      expect(leadRepo.update).not.toHaveBeenCalled();
      expect(timelineWrite).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'workflow.lead.followup_reminder_cancelled' }),
      );
    });

    it('handles a deleted lead gracefully', async () => {
      leadRepo.findOne.mockResolvedValue(null);

      // Should not throw
      await expect(
        service.cancel({ workspaceId: WS_ID_A, leadId: LEAD_ID }),
      ).resolves.not.toThrow();

      expect(leadRepo.update).not.toHaveBeenCalled();
    });

    it('skips DB update when clearNextFollowUpDate=false', async () => {
      await service.cancel({
        workspaceId: WS_ID_A,
        leadId: LEAD_ID,
        clearNextFollowUpDate: false,
      });

      expect(orm.executeInWorkspaceContext).not.toHaveBeenCalled();
      expect(timelineWrite).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'workflow.lead.followup_reminder_cancelled' }),
      );
    });

    it('writes the cancellation timeline event even when lead is missing', async () => {
      leadRepo.findOne.mockResolvedValue(null);

      await service.cancel({ workspaceId: WS_ID_A, leadId: LEAD_ID, reason: 'lead_deleted' });

      expect(timelineWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'workflow.lead.followup_reminder_cancelled',
          properties: expect.objectContaining({ reason: 'lead_deleted' }),
        }),
      );
    });
  });

  // ─── buildJobPrefix ──────────────────────────────────────────────────────────

  describe('buildJobPrefix()', () => {
    it('produces stable, workspace-scoped identifiers', () => {
      expect(buildJobPrefix('ws-1', 'lead-1')).toBe('lead-reminder:ws-1:lead-1');
      expect(buildJobPrefix('ws-2', 'lead-1')).toBe('lead-reminder:ws-2:lead-1');
      expect(buildJobPrefix('ws-1', 'lead-2')).toBe('lead-reminder:ws-1:lead-2');
    });

    it('two workspace IDs with the same leadId produce different prefixes', () => {
      const prefixA = buildJobPrefix('workspace-aaaa', 'lead-xyz');
      const prefixB = buildJobPrefix('workspace-bbbb', 'lead-xyz');

      expect(prefixA).not.toBe(prefixB);
    });
  });
});
