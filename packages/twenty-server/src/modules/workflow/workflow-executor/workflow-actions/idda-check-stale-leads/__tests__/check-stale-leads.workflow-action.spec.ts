import { Test, type TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { CheckStaleLeadsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-stale-leads/check-stale-leads.workflow-action';

const WS_ID = 'ws-001';

const makeStep = (inputOverrides: Record<string, unknown> = {}) => ({
  id: 'step-stale-1',
  name: 'Check stale leads',
  type: WorkflowActionType.IDDA_CHECK_STALE_LEADS,
  valid: true,
  settings: {
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      staleDaysThreshold: 30,
      activeStatuses: ['NEW', 'ASSIGNED', 'CONTACTED', 'INTERESTED'],
      limitPerRun: 50,
      ...inputOverrides,
    },
  },
});

const makeOrmManager = (
  leads: any[] = [],
  timelineEntries: any[] = [],
) => ({
  executeInWorkspaceContext: jest.fn(
    async (fn: () => Promise<void>, _ctx: unknown) => fn(),
  ),
  getRepository: jest.fn(async (_wsId: string, name: string) => {
    if (name === 'lead') {
      return { find: jest.fn(async () => leads) };
    }
    if (name === 'timelineActivity') {
      return { find: jest.fn(async () => timelineEntries) };
    }
    throw new Error(`Unknown repo: ${name}`);
  }),
});

describe('CheckStaleLeadsWorkflowAction', () => {
  let action: CheckStaleLeadsWorkflowAction;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CheckStaleLeadsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: makeOrmManager() },
        { provide: NotificationDispatchService, useValue: { dispatchInApp: jest.fn() } },
        { provide: WorkflowTimelineWriterService, useValue: { write: jest.fn() } },
      ],
    }).compile();

    action = mod.get(CheckStaleLeadsWorkflowAction);
  });

  it('throws INVALID_STEP_TYPE when step type is wrong', async () => {
    const wrongStep = { ...makeStep(), type: WorkflowActionType.EMPTY };

    await expect(
      action.execute({
        currentStepId: wrongStep.id,
        steps: [wrongStep as any],
        context: {},
        runInfo: { workspaceId: WS_ID, workflowRunId: 'run-1' },
      }),
    ).rejects.toThrow('Step is not a check-stale-leads action');
  });

  it('returns zero counts when no stale leads exist', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CheckStaleLeadsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: makeOrmManager([], []) },
        { provide: NotificationDispatchService, useValue: { dispatchInApp: jest.fn() } },
        { provide: WorkflowTimelineWriterService, useValue: { write: jest.fn() } },
      ],
    }).compile();

    const act = mod.get(CheckStaleLeadsWorkflowAction);
    const step = makeStep();

    const output = await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-2' },
    });

    expect(output.result).toMatchObject({ totalChecked: 0, totalAlerted: 0 });
  });

  it('notifies assignee and writes timeline for stale lead', async () => {
    const staleUpdatedAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const leads = [
      { id: 'lead-1', clinicName: 'Apollo Clinic', assignedToId: 'wm-001', updatedAt: staleUpdatedAt, status: 'CONTACTED' },
    ];

    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckStaleLeadsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: makeOrmManager(leads, []) },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckStaleLeadsWorkflowAction);
    const step = makeStep();

    const output = await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-3' },
    });

    expect(output.result).toMatchObject({
      totalChecked: 1,
      totalAlerted: 1,
      staleDaysThreshold: 30,
    });
    expect(mockNotify.dispatchInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientWorkspaceMemberId: 'wm-001',
        relatedRecordId: 'lead-1',
      }),
    );
    expect(mockTimeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        targetObjectSingularName: 'lead',
        targetRecordId: 'lead-1',
        eventName: 'workflow.lead.stale_alert',
      }),
    );
  });

  it('skips leads already alerted this week (deduplication)', async () => {
    const staleUpdatedAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const leads = [
      { id: 'lead-1', clinicName: 'Clinic A', assignedToId: 'wm-001', updatedAt: staleUpdatedAt, status: 'NEW' },
      { id: 'lead-2', clinicName: 'Clinic B', assignedToId: 'wm-002', updatedAt: staleUpdatedAt, status: 'NEW' },
    ];
    const timelineEntries = [
      { targetLeadId: 'lead-1', name: 'workflow.lead.stale_alert' },
    ];

    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckStaleLeadsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: makeOrmManager(leads, timelineEntries) },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckStaleLeadsWorkflowAction);
    const step = makeStep();

    const output = await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-4' },
    });

    expect(output.result).toMatchObject({ totalChecked: 2, totalAlerted: 1 });
    expect(mockNotify.dispatchInApp).toHaveBeenCalledTimes(1);
    expect(mockNotify.dispatchInApp).toHaveBeenCalledWith(
      expect.objectContaining({ recipientWorkspaceMemberId: 'wm-002' }),
    );
  });

  it('uses custom staleDaysThreshold from input', async () => {
    const leads: any[] = [];

    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckStaleLeadsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: makeOrmManager(leads, []) },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckStaleLeadsWorkflowAction);
    const step = makeStep({ staleDaysThreshold: 14 });

    const output = await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-5' },
    });

    expect((output.result as any).staleDaysThreshold).toBe(14);
  });

  it('skips notification when lead has no assignee, still writes timeline', async () => {
    const staleUpdatedAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    const leads = [
      { id: 'lead-1', clinicName: 'Unassigned Clinic', assignedToId: null, updatedAt: staleUpdatedAt, status: 'NEW' },
    ];

    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckStaleLeadsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: makeOrmManager(leads, []) },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckStaleLeadsWorkflowAction);
    const step = makeStep();

    await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-6' },
    });

    expect(mockNotify.dispatchInApp).not.toHaveBeenCalled();
    expect(mockTimeline.write).toHaveBeenCalledTimes(1);
  });
});
