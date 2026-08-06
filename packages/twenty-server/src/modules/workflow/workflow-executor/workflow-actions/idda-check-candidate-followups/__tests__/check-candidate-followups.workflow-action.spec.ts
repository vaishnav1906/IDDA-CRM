import { Test, type TestingModule } from '@nestjs/testing';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { NotificationDispatchService } from 'src/modules/idda-notifications/services/notification-dispatch.service';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';
import { CheckCandidateFollowupsWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/idda-check-candidate-followups/check-candidate-followups.workflow-action';

const WS_ID = 'ws-001';

const makeStep = (inputOverrides: Record<string, unknown> = {}) => ({
  id: 'step-cand-fu-1',
  name: 'Check candidate follow-ups',
  type: WorkflowActionType.IDDA_CHECK_CANDIDATE_FOLLOWUPS,
  valid: true,
  settings: {
    outputSchema: {},
    errorHandlingOptions: {
      retryOnFailure: { value: false },
      continueOnFailure: { value: false },
    },
    input: {
      activeStatuses: ['SCREENING', 'INTERVIEWING', 'OFFER_SENT'],
      limitPerRun: 50,
      ...inputOverrides,
    },
  },
});

const makeOrmManager = (
  candidates: any[] = [],
  timelineEntries: any[] = [],
) => ({
  executeInWorkspaceContext: jest.fn(
    async (fn: () => Promise<void>, _ctx: unknown) => fn(),
  ),
  getRepository: jest.fn(async (_wsId: string, name: string) => {
    if (name === 'candidate') {
      return {
        find: jest.fn(async () => candidates),
      };
    }
    if (name === 'timelineActivity') {
      return {
        find: jest.fn(async () => timelineEntries),
      };
    }
    throw new Error(`Unknown repo: ${name}`);
  }),
});

describe('CheckCandidateFollowupsWorkflowAction', () => {
  let action: CheckCandidateFollowupsWorkflowAction;
  let dispatchInAppSpy: jest.Mock;
  let timelineWriteSpy: jest.Mock;

  const buildAction = (ormManager: any) => {
    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };
    dispatchInAppSpy = mockNotify.dispatchInApp;
    timelineWriteSpy = mockTimeline.write;

    const module: TestingModule = Test.createTestingModule({
      providers: [
        CheckCandidateFollowupsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: ormManager },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile() as unknown as TestingModule;

    // Synchronous compile for speed
    return (module as any).providers
      ? module
      : (() => {
          throw new Error('compile failed');
        })();
  };

  beforeEach(async () => {
    const ormManager = makeOrmManager();
    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };
    dispatchInAppSpy = mockNotify.dispatchInApp;
    timelineWriteSpy = mockTimeline.write;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckCandidateFollowupsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: ormManager },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    action = module.get(CheckCandidateFollowupsWorkflowAction);
  });

  it('throws INVALID_STEP_TYPE when step type is wrong', async () => {
    const wrongStep = {
      ...makeStep(),
      type: WorkflowActionType.EMPTY,
    };

    await expect(
      action.execute({
        currentStepId: wrongStep.id,
        steps: [wrongStep as any],
        context: {},
        runInfo: { workspaceId: WS_ID, workflowRunId: 'run-1' },
      }),
    ).rejects.toThrow('Step is not a check-candidate-followups action');
  });

  it('returns zero counts when no overdue candidates exist', async () => {
    const ormManager = makeOrmManager([], []);
    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckCandidateFollowupsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: ormManager },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckCandidateFollowupsWorkflowAction);
    const step = makeStep();

    const output = await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-2' },
    });

    expect(output.result).toMatchObject({ totalChecked: 0, totalWarned: 0 });
    expect(mockNotify.dispatchInApp).not.toHaveBeenCalled();
    expect(mockTimeline.write).not.toHaveBeenCalled();
  });

  it('notifies assignee and writes timeline for overdue candidate', async () => {
    const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = [
      { id: 'cand-1', name: 'Dr. Rahul', assignedToId: 'wm-001', nextFollowUpDate: overdueDate, status: 'SCREENING' },
    ];

    const ormManager = makeOrmManager(candidates, []);
    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckCandidateFollowupsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: ormManager },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckCandidateFollowupsWorkflowAction);
    const step = makeStep();

    const output = await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-3' },
    });

    expect(output.result).toMatchObject({ totalChecked: 1, totalWarned: 1 });
    expect(mockNotify.dispatchInApp).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientWorkspaceMemberId: 'wm-001',
        relatedRecordId: 'cand-1',
      }),
    );
    expect(mockTimeline.write).toHaveBeenCalledWith(
      expect.objectContaining({
        targetObjectSingularName: 'candidate',
        targetRecordId: 'cand-1',
        eventName: 'workflow.candidate.missed_followup_warning',
      }),
    );
  });

  it('skips candidates already warned today (deduplication)', async () => {
    const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = [
      { id: 'cand-1', name: 'Dr. X', assignedToId: 'wm-001', nextFollowUpDate: overdueDate, status: 'INTERVIEWING' },
      { id: 'cand-2', name: 'Dr. Y', assignedToId: 'wm-002', nextFollowUpDate: overdueDate, status: 'INTERVIEWING' },
    ];
    // cand-1 was already warned today
    const timelineEntries = [
      { targetCandidateId: 'cand-1', name: 'workflow.candidate.missed_followup_warning' },
    ];

    const ormManager = makeOrmManager(candidates, timelineEntries);
    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckCandidateFollowupsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: ormManager },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckCandidateFollowupsWorkflowAction);
    const step = makeStep();

    const output = await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-4' },
    });

    expect(output.result).toMatchObject({ totalChecked: 2, totalWarned: 1 });
    expect(mockNotify.dispatchInApp).toHaveBeenCalledTimes(1);
    expect(mockNotify.dispatchInApp).toHaveBeenCalledWith(
      expect.objectContaining({ recipientWorkspaceMemberId: 'wm-002' }),
    );
  });

  it('skips notification when candidate has no assignee, still writes timeline', async () => {
    const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = [
      { id: 'cand-1', name: 'Unassigned', assignedToId: null, nextFollowUpDate: overdueDate, status: 'SCREENING' },
    ];

    const ormManager = makeOrmManager(candidates, []);
    const mockNotify = { dispatchInApp: jest.fn(async () => {}) };
    const mockTimeline = { write: jest.fn(async () => {}) };

    const mod = await Test.createTestingModule({
      providers: [
        CheckCandidateFollowupsWorkflowAction,
        { provide: GlobalWorkspaceOrmManager, useValue: ormManager },
        { provide: NotificationDispatchService, useValue: mockNotify },
        { provide: WorkflowTimelineWriterService, useValue: mockTimeline },
      ],
    }).compile();

    const act = mod.get(CheckCandidateFollowupsWorkflowAction);
    const step = makeStep();

    await act.execute({
      currentStepId: step.id,
      steps: [step as any],
      context: {},
      runInfo: { workspaceId: WS_ID, workflowRunId: 'run-5' },
    });

    expect(mockNotify.dispatchInApp).not.toHaveBeenCalled();
    expect(mockTimeline.write).toHaveBeenCalledTimes(1);
  });
});
