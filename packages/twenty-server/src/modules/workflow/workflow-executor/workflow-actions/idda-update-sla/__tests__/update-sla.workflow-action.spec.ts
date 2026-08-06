import { Test, TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { BusinessCalendarService } from 'src/engine/core-modules/business-calendar/services/business-calendar.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { UpdateSlaWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-update-sla/update-sla.workflow-action';

const WORKSPACE_ID = 'ws-001';
const RECORD_ID = 'lead-sla-test';

const makeStep = (inputOverrides = {}, settingsOverrides = {}) => ({
  id: 'step-sla-1',
  name: 'Update SLA',
  type: WorkflowActionType.IDDA_UPDATE_SLA,
  valid: true,
  settings: {
    defaultSlaHours: 24,
    useBusinessCalendar: false,
    priorityConfig: [
      { priority: 'URGENT', slaHours: 4 },
      { priority: 'HIGH', slaHours: 8 },
    ],
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      recordId: RECORD_ID,
      objectSingularName: 'lead',
      slaFieldName: 'slaDeadline',
      useBusinessCalendar: false,
      priority: 'NORMAL',
      ...inputOverrides,
    },
    ...settingsOverrides,
  },
});

describe('UpdateSlaWorkflowAction', () => {
  let action: UpdateSlaWorkflowAction;
  let updateSpy: jest.SpyInstance;
  let timelineWriteSpy: jest.SpyInstance;
  let findCalendarSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockRepository = { update: jest.fn().mockResolvedValue(undefined) };
    const mockOrmManager = {
      executeInWorkspaceContext: jest.fn().mockImplementation(
        async (fn: () => Promise<void>, _ctx: unknown) => fn(),
      ),
      getRepository: jest.fn().mockResolvedValue(mockRepository),
    };
    updateSpy = mockRepository.update;

    const mockTimeline = { write: jest.fn().mockResolvedValue(undefined) };
    timelineWriteSpy = mockTimeline.write;

    const mockCalendarService = {
      findByWorkspaceId: jest.fn().mockResolvedValue(null),
      addBusinessDays: jest.fn(),
    };
    findCalendarSpy = mockCalendarService.findByWorkspaceId;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSlaWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: mockOrmManager },
        { provide: BusinessCalendarService, useValue: mockCalendarService },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    action = module.get(UpdateSlaWorkflowAction);
  });

  it('sets a wall-clock SLA deadline when useBusinessCalendar is false', async () => {
    const beforeMs = Date.now();
    const step = makeStep({ useBusinessCalendar: false, priority: 'NORMAL' });

    const output = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-1' },
    });

    const deadline = new Date((output.result as any).slaDeadline);
    const expectedMs = beforeMs + 24 * 60 * 60 * 1000;

    expect(deadline.getTime()).toBeGreaterThanOrEqual(beforeMs + 23 * 60 * 60 * 1000);
    expect(deadline.getTime()).toBeLessThanOrEqual(expectedMs + 2_000);
    expect(updateSpy).toHaveBeenCalledWith(
      { id: RECORD_ID },
      { slaDeadline: expect.any(String) },
    );
    expect(timelineWriteSpy).toHaveBeenCalledTimes(1);
    expect(findCalendarSpy).not.toHaveBeenCalled();
  });

  it('uses priorityConfig sla hours for URGENT priority', async () => {
    const beforeMs = Date.now();
    const step = makeStep({ useBusinessCalendar: false, priority: 'URGENT' });

    const output = await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-2' },
    });

    const deadline = new Date((output.result as any).slaDeadline);

    expect(deadline.getTime() - beforeMs).toBeLessThanOrEqual(4 * 60 * 60 * 1000 + 1_000);
    expect(deadline.getTime() - beforeMs).toBeGreaterThanOrEqual(4 * 60 * 60 * 1000 - 1_000);
  });

  it('falls back to wall-clock when business calendar is not configured', async () => {
    findCalendarSpy.mockResolvedValue(null);
    const step = makeStep({ useBusinessCalendar: true, priority: 'HIGH' });

    await action.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-3' },
    });

    expect(findCalendarSpy).toHaveBeenCalledWith(WORKSPACE_ID);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it('throws INVALID_STEP_INPUT when recordId is missing', async () => {
    const step = makeStep({ recordId: undefined });

    await expect(
      action.execute({
        currentStepId: step.id,
        steps: [step as any],
        context: {},
        runInfo: { workspaceId: WORKSPACE_ID, workflowRunId: 'run-4' },
      }),
    ).rejects.toThrow('recordId is required');
  });
});
