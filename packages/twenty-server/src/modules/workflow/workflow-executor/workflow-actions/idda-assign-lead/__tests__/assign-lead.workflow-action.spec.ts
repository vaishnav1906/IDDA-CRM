import { Test, TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { AssignLeadWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-assign-lead/assign-lead.workflow-action';

const WORKSPACE_ID = 'ws-001';
const LEAD_ID = 'lead-xyz';
const MEMBER_ID = 'member-abc';

const makeStep = (inputOverrides = {}, settingsOverrides = {}) => ({
  id: 'step-assign-1',
  name: 'Assign Lead',
  type: WorkflowActionType.IDDA_ASSIGN_LEAD,
  valid: true,
  settings: {
    notifyAssignee: false,
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      leadId: LEAD_ID,
      assigneeWorkspaceMemberId: MEMBER_ID,
      ...inputOverrides,
    },
    ...settingsOverrides,
  },
});

describe('AssignLeadWorkflowAction', () => {
  let action: AssignLeadWorkflowAction;
  let updateSpy: jest.SpyInstance;
  let timelineWriteSpy: jest.SpyInstance;
  let dispatchInAppSpy: jest.SpyInstance;
  let mockOrmManager: { executeInWorkspaceContext: jest.Mock; getRepository: jest.Mock };

  beforeEach(async () => {
    const mockRepository = { update: jest.fn().mockResolvedValue(undefined) };

    mockOrmManager = {
      executeInWorkspaceContext: jest.fn().mockImplementation(
        async (fn: () => Promise<void>, _ctx: unknown) => fn(),
      ),
      getRepository: jest.fn().mockResolvedValue(mockRepository),
    };
    updateSpy = mockRepository.update;

    const mockTimeline = { write: jest.fn().mockResolvedValue(undefined) };
    timelineWriteSpy = mockTimeline.write;

    const mockNotify = { dispatchInApp: jest.fn().mockResolvedValue(undefined) };
    dispatchInAppSpy = mockNotify.dispatchInApp;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignLeadWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: mockOrmManager },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
        { provide: NotificationDispatchService, useValue: mockNotify },
      ],
    }).compile();

    action = module.get(AssignLeadWorkflowAction);
  });

  it('updates the lead assignee and writes timeline', async () => {
    const step = makeStep();

    const output = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-1' },
    });

    expect(updateSpy).toHaveBeenCalledWith(
      { id: LEAD_ID },
      { assigneeId: MEMBER_ID },
    );
    expect(timelineWriteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRecordId: LEAD_ID,
        eventName: 'workflow.lead.assigned',
      }),
    );
    expect(output.result).toMatchObject({ leadId: LEAD_ID, assignedTo: MEMBER_ID });
  });

  it('sends in-app notification when notifyAssignee is true', async () => {
    const step = makeStep({ notifyAssignee: true });

    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-2' },
    });

    expect(dispatchInAppSpy).toHaveBeenCalledTimes(1);
    expect(dispatchInAppSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientWorkspaceMemberId: MEMBER_ID,
        notificationType: 'LEAD_ASSIGNED',
      }),
    );
  });

  it('does not send notification when notifyAssignee is false (default)', async () => {
    const step = makeStep();

    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-3' },
    });

    expect(dispatchInAppSpy).not.toHaveBeenCalled();
  });

  it('resolves leadId and assigneeId from context', async () => {
    const step = makeStep({
      leadId: '{{trigger.record.id}}',
      assigneeWorkspaceMemberId: '{{trigger.record.ownerId}}',
    });

    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: { trigger: { record: { id: 'ctx-lead', ownerId: 'ctx-member' } } },
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-4' },
    });

    expect(updateSpy).toHaveBeenCalledWith(
      { id: 'ctx-lead' },
      { assigneeId: 'ctx-member' },
    );
  });

  it('throws INVALID_STEP_INPUT when leadId is missing', async () => {
    const step = makeStep({ leadId: undefined });

    await expect(
      action.execute({
        currentStepId: step.id,
        steps: [step as any],
        context: {},
        runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-5' },
      }),
    ).rejects.toThrow('leadId is required');
  });
});
