import { Test, TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { HandleOppWonWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-handle-opp-won/handle-opp-won.workflow-action';

const WORKSPACE_ID = 'ws-opp-001';
const OPP_ID = 'opp-001';
const CLINIC_ID = 'clinic-001';
const DOCTOR_ID = 'doctor-001';
const OWNER_ID = 'member-sales-001';
const OPS_ID = 'member-ops-001';
const SUB_ID = 'sub-new-001';

const makeStep = (inputOverrides = {}) => ({
  id: 'step-opp-won-1',
  name: 'Handle Opp Won',
  type: WorkflowActionType.IDDA_HANDLE_OPP_WON,
  valid: true,
  settings: {
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      opportunityId: OPP_ID,
      ...inputOverrides,
    },
  },
});

const makeOpp = (overrides = {}) => ({
  id: OPP_ID,
  name: 'Sharma Dental Clinic Deal',
  stage: 'WON',
  ownerId: OWNER_ID,
  companyId: CLINIC_ID,
  pointOfContactId: DOCTOR_ID,
  ...overrides,
});

describe('HandleOppWonWorkflowAction', () => {
  let action: HandleOppWonWorkflowAction;

  const mockOppRepo = { findOne: jest.fn() };
  const mockSubRepo = { findOne: jest.fn(), save: jest.fn() };
  const mockTaskRepo = { save: jest.fn() };
  const mockTaskTargetRepo = { save: jest.fn() };
  const mockNotificationService = { dispatchInApp: jest.fn() };
  const mockTimelineWriter = { write: jest.fn() };

  const ormManager = {
    executeInWorkspaceContext: jest.fn(async (fn: () => Promise<void>) => fn()),
    getRepository: jest.fn((_wsId: string, objectName: string) => {
      if (objectName === 'opportunity') return mockOppRepo;
      if (objectName === 'subscription') return mockSubRepo;
      if (objectName === 'task') return mockTaskRepo;
      if (objectName === 'taskTarget') return mockTaskTargetRepo;

      return {};
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HandleOppWonWorkflowAction],
    })
      .overrideProvider(HandleOppWonWorkflowAction)
      .useFactory({
        factory: () =>
          new HandleOppWonWorkflowAction(
            ormManager as any,
            mockNotificationService as any,
            mockTimelineWriter as any,
          ),
      })
      .compile();

    action = module.get(HandleOppWonWorkflowAction);

    jest.clearAllMocks();

    // Default: no existing subscription
    mockOppRepo.findOne.mockResolvedValue(makeOpp());
    mockSubRepo.findOne.mockResolvedValue(null);
    mockSubRepo.save.mockResolvedValue({ id: SUB_ID });
    mockTaskRepo.save.mockResolvedValue({ id: 'task-new-001' });
    mockTaskTargetRepo.save.mockResolvedValue({});
    mockNotificationService.dispatchInApp.mockResolvedValue(undefined);
    mockTimelineWriter.write.mockResolvedValue(undefined);
    ormManager.executeInWorkspaceContext.mockImplementation(async (fn: () => Promise<void>) => fn());
  });

  it('creates Subscription and 5 tasks when no subscription exists', async () => {
    const step = makeStep();
    const result = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-1' },
    });

    expect(mockSubRepo.save).toHaveBeenCalledTimes(1);
    expect(mockSubRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING_ONBOARDING',
        opportunityId: OPP_ID,
        clinicId: CLINIC_ID,
        doctorId: DOCTOR_ID,
      }),
    );
    expect(mockTaskRepo.save).toHaveBeenCalledTimes(5);
    expect(result.result).toMatchObject({
      outcome: 'SUBSCRIPTION_CREATED',
      subscriptionId: SUB_ID,
      tasksCreated: 5,
    });
  });

  it('is idempotent — skips creation when Subscription already exists', async () => {
    mockSubRepo.findOne.mockResolvedValue({ id: 'existing-sub-001' });

    const step = makeStep();
    const result = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-2' },
    });

    expect(mockSubRepo.save).not.toHaveBeenCalled();
    expect(mockTaskRepo.save).not.toHaveBeenCalled();
    expect(result.result).toMatchObject({
      outcome: 'SUBSCRIPTION_ALREADY_EXISTS',
      subscriptionId: 'existing-sub-001',
    });
    expect(mockTimelineWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.opportunity.won.subscription_exists',
      }),
    );
  });

  it('returns OPP_NOT_FOUND when Opportunity does not exist', async () => {
    mockOppRepo.findOne.mockResolvedValue(null);

    const step = makeStep();
    const result = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-3' },
    });

    expect(mockSubRepo.save).not.toHaveBeenCalled();
    expect(result.result).toMatchObject({ outcome: 'OPP_NOT_FOUND' });
    expect(mockNotificationService.dispatchInApp).not.toHaveBeenCalled();
  });

  it('notifies Sales Executive after successful creation', async () => {
    const step = makeStep();
    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-4' },
    });

    expect(mockNotificationService.dispatchInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientWorkspaceMemberId: OWNER_ID,
        notificationType: 'OPP_WON_HANDOFF',
      }),
    );
  });

  it('also notifies Operations owner when different from Sales Executive', async () => {
    const step = makeStep({ operationsOwnerId: OPS_ID });
    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-5' },
    });

    const calls = mockNotificationService.dispatchInApp.mock.calls;

    expect(calls).toHaveLength(2);
    expect(calls.map((c: [{ recipientWorkspaceMemberId: string }]) => c[0].recipientWorkspaceMemberId)).toEqual(
      expect.arrayContaining([OWNER_ID, OPS_ID]),
    );
  });

  it('does not send duplicate notification when operationsOwnerId equals ownerId', async () => {
    const step = makeStep({ operationsOwnerId: OWNER_ID });
    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-6' },
    });

    expect(mockNotificationService.dispatchInApp).toHaveBeenCalledTimes(1);
  });

  it('handles missing Clinic, Doctor, and assignee safely — still creates Subscription', async () => {
    mockOppRepo.findOne.mockResolvedValue(makeOpp({
      ownerId: null,
      companyId: null,
      pointOfContactId: null,
    }));

    const step = makeStep();
    const result = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-7' },
    });

    expect(result.result).toMatchObject({ outcome: 'SUBSCRIPTION_CREATED' });
    expect(mockNotificationService.dispatchInApp).not.toHaveBeenCalled();
  });

  it('writes timeline event with correct eventName after creation', async () => {
    const step = makeStep();
    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-8' },
    });

    expect(mockTimelineWriter.write).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'workflow.opportunity.won.subscription_created',
        targetRecordId: OPP_ID,
      }),
    );
  });

  it('throws INVALID_STEP_INPUT when opportunityId is missing', async () => {
    const step = {
      ...makeStep({ opportunityId: undefined }),
      settings: {
        ...makeStep().settings,
        input: { opportunityId: undefined },
      },
    };

    await expect(
      action.execute({
        currentStepId: step.id,
        steps: [step as any],
        context: {},
        runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-9' },
      }),
    ).rejects.toThrow('opportunityId is required');
  });
});
