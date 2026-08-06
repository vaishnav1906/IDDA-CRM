import { Test, TestingModule } from '@nestjs/testing';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { FireFollowUpReminderJob } from 'src/modules/lead-follow-up-reminder/jobs/fire-follow-up-reminder.job';
import { type FollowUpReminderJobData } from 'src/modules/lead-follow-up-reminder/types/follow-up-reminder-job-data.type';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const WS_ID = 'workspace-1111';
const LEAD_ID = 'lead-2222';
const TASK_ID = 'task-3333';
const MEMBER_ID = 'member-4444';
const REMINDER_AT = new Date(Date.now() - 1_000); // 1 s ago → already fired

const BASE_PAYLOAD: FollowUpReminderJobData = {
  workspaceId: WS_ID,
  leadId: LEAD_ID,
  taskId: TASK_ID,
  reminderAt: REMINDER_AT.toISOString(),
};

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAD_ID,
    clinicName: 'AIIMS Delhi',
    doctorName: 'Dr. Sharma',
    phone: '9999999999',
    city: 'Delhi',
    status: 'FOLLOW_UP_NEEDED',
    assignedToId: MEMBER_ID,
    nextFollowUpDate: REMINDER_AT,
    ...overrides,
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return { id: TASK_ID, title: 'Follow-up: AIIMS Delhi', status: 'TODO', assigneeId: MEMBER_ID, ...overrides };
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: MEMBER_ID,
    userEmail: 'aisha@idda.com',
    name: { firstName: 'Aisha', lastName: 'Verma' },
    ...overrides,
  };
}

// ─── Test module builder ───────────────────────────────────────────────────────

async function buildModule(repos: Record<string, ReturnType<typeof makeRepo>>) {
  const mockOrm = {
    executeInWorkspaceContext: jest.fn(async (fn: () => Promise<void>) => fn()),
    getRepository: jest
      .fn()
      .mockImplementation((_wsId: string, name: string) => repos[name] ?? makeRepo()),
  };

  const mockNotify = {
    dispatch: jest.fn().mockResolvedValue(undefined),
    dispatchInApp: jest.fn().mockResolvedValue(undefined),
    dispatchEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockTimeline = { write: jest.fn().mockResolvedValue(undefined) };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      FireFollowUpReminderJob,
      { provide: GlobalWorkspaceOrmManager, useValue: mockOrm },
      { provide: NotificationDispatchService, useValue: mockNotify },
      { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
    ],
  }).compile();

  // FireFollowUpReminderJob is Scope.REQUEST — must use resolve(), not get().
  const job = await module.resolve(FireFollowUpReminderJob);

  return {
    job,
    notify: module.get(NotificationDispatchService),
    timeline: module.get(WorkflowTimelineWriterService),
    orm: module.get(GlobalWorkspaceOrmManager),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FireFollowUpReminderJob', () => {
  let leadRepo: ReturnType<typeof makeRepo>;
  let taskRepo: ReturnType<typeof makeRepo>;
  let memberRepo: ReturnType<typeof makeRepo>;
  let job: FireFollowUpReminderJob;
  let notify: NotificationDispatchService;
  let timeline: WorkflowTimelineWriterService;

  beforeEach(async () => {
    jest.clearAllMocks();

    leadRepo = makeRepo({ findOne: jest.fn().mockResolvedValue(makeLead()) });
    taskRepo = makeRepo({ findOne: jest.fn().mockResolvedValue(makeTask()) });
    memberRepo = makeRepo({ findOne: jest.fn().mockResolvedValue(makeMember()) });

    const ctx = await buildModule({
      lead: leadRepo,
      task: taskRepo,
      workspaceMember: memberRepo,
    });

    job = ctx.job;
    notify = ctx.notify;
    timeline = ctx.timeline;
  });

  // ─── Happy path ─────────────────────────────────────────────────────────────

  it('dispatches BOTH in-app and email when all checks pass', async () => {
    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'BOTH',
        notificationType: 'FOLLOW_UP_REMINDER',
        recipientWorkspaceMemberId: MEMBER_ID,
        recipientEmail: 'aisha@idda.com',
        relatedRecordId: LEAD_ID,
        actionUrl: `/leads/${LEAD_ID}`,
      }),
    );

    expect(notify.dispatchInApp).not.toHaveBeenCalled();
  });

  it('writes followup_reminder_sent timeline event on success', async () => {
    await job.handle(BASE_PAYLOAD);

    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_sent',
        properties: expect.objectContaining({ leadId: LEAD_ID, taskId: TASK_ID }),
      }),
    );
  });

  it('clears lead.nextFollowUpDate after dispatching (prevents retry duplication)', async () => {
    await job.handle(BASE_PAYLOAD);

    expect(leadRepo.update).toHaveBeenCalledWith(
      LEAD_ID,
      expect.objectContaining({ nextFollowUpDate: null }),
    );
  });

  it('notification body includes clinic name, doctor, phone, city and Open Lead link', async () => {
    await job.handle(BASE_PAYLOAD);

    const payload: any = (notify.dispatch as jest.Mock).mock.calls[0][0];

    expect(payload.body).toContain('AIIMS Delhi');
    expect(payload.body).toContain('Dr. Sharma');
    expect(payload.body).toContain('9999999999');
    expect(payload.body).toContain('Delhi');
    expect(payload.actionUrl).toBe(`/leads/${LEAD_ID}`);
  });

  // ─── Suppression cases ───────────────────────────────────────────────────────

  it('suppresses when lead does not exist', async () => {
    leadRepo.findOne.mockResolvedValue(null);

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({ suppressionReason: 'lead_not_found' }),
      }),
    );
  });

  it('suppresses when lead status is no longer FOLLOW_UP_NEEDED', async () => {
    leadRepo.findOne.mockResolvedValue(makeLead({ status: 'CONTACTED' }));

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({
          suppressionReason: 'lead_status_changed:CONTACTED',
        }),
      }),
    );
  });

  it('suppresses when nextFollowUpDate has been cleared', async () => {
    leadRepo.findOne.mockResolvedValue(makeLead({ nextFollowUpDate: null }));

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({
          suppressionReason: 'next_follow_up_date_cleared',
        }),
      }),
    );
  });

  it('suppresses stale job when reminderAt differs from current nextFollowUpDate', async () => {
    const differentDate = new Date(REMINDER_AT.getTime() + 30 * 60_000); // 30 min later

    leadRepo.findOne.mockResolvedValue(makeLead({ nextFollowUpDate: differentDate }));

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({
          suppressionReason: expect.stringContaining('stale_job'),
        }),
      }),
    );
  });

  it('suppresses when task is already DONE', async () => {
    taskRepo.findOne.mockResolvedValue(makeTask({ status: 'DONE' }));

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({
          suppressionReason: 'task_closed:status=DONE',
        }),
      }),
    );
  });

  it('suppresses when task is CANCELLED', async () => {
    taskRepo.findOne.mockResolvedValue(makeTask({ status: 'CANCELLED' }));

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
  });

  it('suppresses when task is not found', async () => {
    taskRepo.findOne.mockResolvedValue(null);

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({ suppressionReason: 'task_not_found' }),
      }),
    );
  });

  it('suppresses when no assignee is set on lead or task', async () => {
    leadRepo.findOne.mockResolvedValue(makeLead({ assignedToId: null }));
    taskRepo.findOne.mockResolvedValue(makeTask({ assigneeId: null }));

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({ suppressionReason: 'no_assignee' }),
      }),
    );
  });

  it('suppresses when assignee workspace member is not found', async () => {
    memberRepo.findOne.mockResolvedValue(null);

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_suppressed',
        properties: expect.objectContaining({
          suppressionReason: expect.stringContaining('assignee_not_found'),
        }),
      }),
    );
  });

  // ─── Partial delivery (no email) ─────────────────────────────────────────────

  it('sends in-app notification only when assignee has no email', async () => {
    memberRepo.findOne.mockResolvedValue(makeMember({ userEmail: null }));

    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).not.toHaveBeenCalled();
    expect(notify.dispatchInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: 'FOLLOW_UP_REMINDER',
        recipientWorkspaceMemberId: MEMBER_ID,
      }),
    );

    expect(timeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.lead.followup_reminder_sent',
        properties: expect.objectContaining({ emailSent: false }),
      }),
    );
  });

  // ─── Retry deduplication ─────────────────────────────────────────────────────

  it('does not send twice on BullMQ retry because nextFollowUpDate is cleared after first dispatch', async () => {
    // First call
    await job.handle(BASE_PAYLOAD);

    expect(notify.dispatch).toHaveBeenCalledTimes(1);
    expect(leadRepo.update).toHaveBeenCalledWith(LEAD_ID, { nextFollowUpDate: null });

    // Simulate retry: lead.nextFollowUpDate is now null (cleared by first call)
    leadRepo.findOne.mockResolvedValue(makeLead({ nextFollowUpDate: null }));
    (notify.dispatch as jest.Mock).mockClear();

    await job.handle(BASE_PAYLOAD);

    // Second run is suppressed
    expect(notify.dispatch).not.toHaveBeenCalled();
  });

  // ─── reminderAt tolerance ────────────────────────────────────────────────────

  it('passes the stale check when reminderAt and nextFollowUpDate differ by < 1 second', async () => {
    const slightlyOff = new Date(REMINDER_AT.getTime() + 500); // 500 ms difference

    leadRepo.findOne.mockResolvedValue(makeLead({ nextFollowUpDate: slightlyOff }));

    await job.handle(BASE_PAYLOAD);

    // Should NOT be suppressed
    expect(notify.dispatch).toHaveBeenCalledTimes(1);
  });
});
