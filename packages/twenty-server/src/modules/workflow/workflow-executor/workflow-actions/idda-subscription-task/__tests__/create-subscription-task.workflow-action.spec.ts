import { Test, TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { CreateSubscriptionTaskWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-subscription-task/create-subscription-task.workflow-action';

const WORKSPACE_ID = 'ws-001';
const SUB_ID = 'sub-999';
const MEMBER_ID = 'member-xyz';
const TASK_ID = 'task-generated-id';
const RENEWAL_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const makeStep = (inputOverrides = {}, settingsOverrides = {}) => ({
  id: 'step-sub-task-1',
  name: 'Create renewal task',
  type: WorkflowActionType.IDDA_CREATE_SUBSCRIPTION_TASK,
  valid: true,
  settings: {
    defaultDueDaysBeforeRenewal: 7,
    notifyAssignee: false,
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      subscriptionId: SUB_ID,
      renewalDate: RENEWAL_DATE,
      assigneeWorkspaceMemberId: MEMBER_ID,
      ...inputOverrides,
    },
    ...settingsOverrides,
  },
});

describe('CreateSubscriptionTaskWorkflowAction', () => {
  let action: CreateSubscriptionTaskWorkflowAction;
  let saveSpy: jest.SpyInstance;
  let timelineWriteSpy: jest.SpyInstance;
  let dispatchInAppSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockTask = { id: TASK_ID, title: 'Renewal reminder', dueAt: '' };
    const mockRepository = { save: jest.fn().mockResolvedValue(mockTask) };
    saveSpy = mockRepository.save;

    const mockOrmManager = {
      executeInWorkspaceContext: jest.fn().mockImplementation(
        async (fn: () => Promise<void>, _ctx: unknown) => fn(),
      ),
      getRepository: jest.fn().mockResolvedValue(mockRepository),
    };

    const mockTimeline = { write: jest.fn().mockResolvedValue(undefined) };
    timelineWriteSpy = mockTimeline.write;

    const mockNotify = { dispatchInApp: jest.fn().mockResolvedValue(undefined) };
    dispatchInAppSpy = mockNotify.dispatchInApp;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSubscriptionTaskWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: mockOrmManager },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
        { provide: NotificationDispatchService, useValue: mockNotify },
      ],
    }).compile();

    action = module.get(CreateSubscriptionTaskWorkflowAction);
  });

  it('creates a task, writes timeline, returns result', async () => {
    const step = makeStep();

    const output = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-1' },
    });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        assigneeId: MEMBER_ID,
        status: 'TODO',
      }),
    );
    expect(timelineWriteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetObjectSingularName: 'subscription',
        targetRecordId: SUB_ID,
        eventName: 'workflow.subscription.created',
      }),
    );
    expect(output.result).toMatchObject({
      taskId: TASK_ID,
      subscriptionId: SUB_ID,
      assigneeWorkspaceMemberId: MEMBER_ID,
    });
  });

  it('due date is 7 days before renewal by default', async () => {
    const step = makeStep();

    const output = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-2' },
    });

    const dueAt = new Date((output.result as any).dueAt);
    const renewal = new Date(RENEWAL_DATE);
    const diffDays = (renewal.getTime() - dueAt.getTime()) / (24 * 60 * 60 * 1000);

    expect(diffDays).toBeCloseTo(7, 0);
  });

  it('respects custom dueDaysBeforeRenewal', async () => {
    const step = makeStep({ dueDaysBeforeRenewal: 14 });

    const output = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-3' },
    });

    const dueAt = new Date((output.result as any).dueAt);
    const renewal = new Date(RENEWAL_DATE);
    const diffDays = (renewal.getTime() - dueAt.getTime()) / (24 * 60 * 60 * 1000);

    expect(diffDays).toBeCloseTo(14, 0);
  });

  it('sends notification when notifyAssignee is true', async () => {
    const step = makeStep({}, { notifyAssignee: true });

    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-4' },
    });

    expect(dispatchInAppSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientWorkspaceMemberId: MEMBER_ID,
        notificationType: 'TASK_ASSIGNED',
      }),
    );
  });

  it('resolves inputs from context', async () => {
    const step = makeStep({
      subscriptionId: '{{trigger.record.id}}',
      assigneeWorkspaceMemberId: '{{trigger.record.assigneeId}}',
    });

    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {
        trigger: {
          record: { id: 'ctx-sub-id', assigneeId: 'ctx-member-id' },
        },
      },
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-5' },
    });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: 'ctx-member-id' }),
    );
  });

  it('throws when subscriptionId is missing', async () => {
    const step = makeStep({ subscriptionId: undefined });

    await expect(
      action.execute({
        currentStepId: step.id,
        steps: [step as any],
        context: {},
        runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-6' },
      }),
    ).rejects.toThrow('subscriptionId is required');
  });
});
