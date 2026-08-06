import { Test, TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { getQueueToken } from 'src/engine/core-modules/message-queue/utils/get-queue-token.util';
import { WaitStateEngineService } from 'src/modules/idda-wait-state/services/wait-state-engine.service';
import { DelayWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/delay.workflow-action';

const WORKSPACE_ID = 'ws-test';
const RUN_ID = 'run-test';
const STEP_ID = 'step-delay-1';

const makeBusinessDaysStep = (businessDays: number) => ({
  id: STEP_ID,
  name: 'Wait 2 business days',
  type: WorkflowActionType.DELAY,
  valid: true,
  settings: {
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      delayType: 'BUSINESS_DAYS' as const,
      businessDays,
    },
  },
});

describe('DelayWorkflowAction — BUSINESS_DAYS path', () => {
  let action: DelayWorkflowAction;
  let waitStateSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockQueueService = { add: jest.fn().mockResolvedValue(undefined) };
    const mockWaitStateService = {
      schedule: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DelayWorkflowAction,
        {
          provide: getQueueToken(MessageQueue.delayedJobsQueue),
          useValue: mockQueueService,
        },
        {
          provide: WaitStateEngineService,
          useValue: mockWaitStateService,
        },
      ],
    }).compile();

    action = module.get(DelayWorkflowAction);
    waitStateSpy = mockWaitStateService.schedule;
  });

  it('delegates to WaitStateEngineService for BUSINESS_DAYS and returns pendingEvent', async () => {
    const step = makeBusinessDaysStep(2);
    const output = await action.execute({
      currentStepId: STEP_ID,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: RUN_ID },
    });

    expect(waitStateSpy).toHaveBeenCalledTimes(1);
    expect(waitStateSpy).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      workflowRunId: RUN_ID,
      stepId: STEP_ID,
      input: { delayType: 'BUSINESS_DAYS', businessDays: 2 },
    });
    expect(output).toEqual({ pendingEvent: true });
  });

  it('throws INVALID_STEP_INPUT when businessDays is negative', async () => {
    const step = makeBusinessDaysStep(-1);

    await expect(
      action.execute({
        currentStepId: STEP_ID,
        steps: [step as any],
        context: {},
        runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: RUN_ID },
      }),
    ).rejects.toThrow('businessDays must be a non-negative number');

    expect(waitStateSpy).not.toHaveBeenCalled();
  });

  it('handles 0 business days (next business open) correctly', async () => {
    const step = makeBusinessDaysStep(0);
    const output = await action.execute({
      currentStepId: STEP_ID,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: RUN_ID },
    });

    expect(waitStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ input: { delayType: 'BUSINESS_DAYS', businessDays: 0 } }),
    );
    expect(output.pendingEvent).toBe(true);
  });

  it('does not call WaitStateEngineService for DURATION delay type', async () => {
    const step = {
      ...makeBusinessDaysStep(1),
      settings: {
        ...makeBusinessDaysStep(1).settings,
        input: { delayType: 'DURATION' as const, duration: { hours: 1 } },
      },
    };

    await action.execute({
      currentStepId: STEP_ID,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: RUN_ID },
    });

    expect(waitStateSpy).not.toHaveBeenCalled();
  });
});
