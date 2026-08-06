import { Test, TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { NotifyWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-notify/notify.workflow-action';

const WORKSPACE_ID = 'ws-001';
const MEMBER_ID = 'member-abc';

const makeStep = (inputOverrides = {}) => ({
  id: 'step-notify-1',
  name: 'Notify assignee',
  type: WorkflowActionType.IDDA_NOTIFY,
  valid: true,
  settings: {
    channel: 'IN_APP' as const,
    notificationType: 'LEAD_ASSIGNED' as const,
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      recipientWorkspaceMemberId: MEMBER_ID,
      title: 'New lead assigned',
      body: 'A lead has been assigned to you.',
      channel: 'IN_APP' as const,
      notificationType: 'LEAD_ASSIGNED' as const,
      ...inputOverrides,
    },
  },
});

describe('NotifyWorkflowAction', () => {
  let action: NotifyWorkflowAction;
  let dispatchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockDispatchService = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyWorkflowAction,
        { provide: NotificationDispatchService, useValue: mockDispatchService },
      ],
    }).compile();

    action = module.get(NotifyWorkflowAction);
    dispatchSpy = mockDispatchService.dispatch;
  });

  it('dispatches an in-app notification and returns success result', async () => {
    const step = makeStep();

    const output = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-1' },
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        recipientWorkspaceMemberId: MEMBER_ID,
        channel: 'IN_APP',
      }),
    );
    expect(output.result).toMatchObject({
      notificationQueued: true,
      recipientWorkspaceMemberId: MEMBER_ID,
    });
  });

  it('resolves template variables from context', async () => {
    const step = makeStep({
      recipientWorkspaceMemberId: '{{trigger.record.assigneeId}}',
      title: 'Lead: {{trigger.record.name}}',
    });

    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {
        trigger: {
          record: { assigneeId: 'resolved-member', name: 'Acme Corp' },
        },
      },
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-2' },
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientWorkspaceMemberId: 'resolved-member',
        title: 'Lead: Acme Corp',
      }),
    );
  });

  it('throws INVALID_STEP_INPUT when recipientWorkspaceMemberId is missing', async () => {
    const step = makeStep({ recipientWorkspaceMemberId: undefined });

    await expect(
      action.execute({
        currentStepId: step.id,
        steps: [step as any],
        context: {},
        runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-3' },
      }),
    ).rejects.toThrow('recipientWorkspaceMemberId is required');
  });

  it('throws INVALID_STEP_TYPE when step is not a notify action', async () => {
    const wrongStep = {
      ...makeStep(),
      type: WorkflowActionType.EMPTY,
    };

    await expect(
      action.execute({
        currentStepId: wrongStep.id,
        steps: [wrongStep as any],
        context: {},
        runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-4' },
      }),
    ).rejects.toThrow('Step is not a notify action');
  });
});
