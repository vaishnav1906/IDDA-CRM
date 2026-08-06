import { Test, TestingModule } from '@nestjs/testing';

import { BusinessCalendarService } from 'src/engine/core-modules/business-calendar/services/business-calendar.service';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { getQueueToken } from 'src/engine/core-modules/message-queue/utils/get-queue-token.util';
import { RESUME_DELAYED_WORKFLOW_JOB_NAME } from 'src/modules/workflow/workflow-executor/workflow-actions/delay/contants/resume-delayed-workflow-job-name';
import { WaitStateEngineService } from 'src/modules/idda-wait-state/services/wait-state-engine.service';

const WORKSPACE_ID = 'ws-abc';
const RUN_ID = 'run-xyz';
const STEP_ID = 'step-1';

describe('WaitStateEngineService', () => {
  let service: WaitStateEngineService;
  let queueAddSpy: jest.SpyInstance;
  let businessCalendarFindSpy: jest.SpyInstance;
  let addBusinessDaysSpy: jest.SpyInstance;
  let msUntilSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockQueueService = { add: jest.fn().mockResolvedValue(undefined) };
    const mockCalendarService = {
      findByWorkspaceId: jest.fn(),
      addBusinessDays: jest.fn(),
      msUntil: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitStateEngineService,
        {
          provide: getQueueToken(MessageQueue.delayedJobsQueue),
          useValue: mockQueueService,
        },
        {
          provide: BusinessCalendarService,
          useValue: mockCalendarService,
        },
      ],
    }).compile();

    service = module.get(WaitStateEngineService);
    queueAddSpy = mockQueueService.add;
    businessCalendarFindSpy = mockCalendarService.findByWorkspaceId;
    addBusinessDaysSpy = mockCalendarService.addBusinessDays;
    msUntilSpy = mockCalendarService.msUntil;
  });

  describe('schedule with DURATION delay type', () => {
    it('enqueues job with correct ms delay', async () => {
      await service.schedule({
        workspaceId: WORKSPACE_ID,
        workflowRunId: RUN_ID,
        stepId: STEP_ID,
        input: {
          delayType: 'DURATION',
          duration: { hours: 1, minutes: 30 },
        },
      });

      expect(queueAddSpy).toHaveBeenCalledWith(
        RESUME_DELAYED_WORKFLOW_JOB_NAME,
        { workspaceId: WORKSPACE_ID, workflowRunId: RUN_ID, stepId: STEP_ID },
        { delay: 5_400_000 },
      );
    });
  });

  describe('schedule with SCHEDULED_DATE delay type', () => {
    it('enqueues job with ms until the target date', async () => {
      const futureDate = new Date(Date.now() + 120_000);

      await service.schedule({
        workspaceId: WORKSPACE_ID,
        workflowRunId: RUN_ID,
        stepId: STEP_ID,
        input: {
          delayType: 'SCHEDULED_DATE',
          scheduledDateTime: futureDate.toISOString(),
        },
      });

      expect(queueAddSpy).toHaveBeenCalledTimes(1);
      const callArgs = queueAddSpy.mock.calls[0];
      const delay = callArgs[2].delay;

      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(120_000);
    });

    it('clamps a past date to 0 delay', async () => {
      const pastDate = new Date(Date.now() - 10_000);

      await service.schedule({
        workspaceId: WORKSPACE_ID,
        workflowRunId: RUN_ID,
        stepId: STEP_ID,
        input: {
          delayType: 'SCHEDULED_DATE',
          scheduledDateTime: pastDate.toISOString(),
        },
      });

      expect(queueAddSpy.mock.calls[0][2].delay).toBe(0);
    });
  });

  describe('schedule with BUSINESS_DAYS delay type', () => {
    it('falls back to calendar days when no business calendar is configured', async () => {
      businessCalendarFindSpy.mockResolvedValue(null);

      await service.schedule({
        workspaceId: WORKSPACE_ID,
        workflowRunId: RUN_ID,
        stepId: STEP_ID,
        input: { delayType: 'BUSINESS_DAYS', businessDays: 2 },
      });

      const delay = queueAddSpy.mock.calls[0][2].delay;

      expect(delay).toBe(2 * 24 * 60 * 60 * 1000);
    });

    it('uses business calendar when available', async () => {
      const mockCalendar = { id: 'cal-1' } as any;
      const targetDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      businessCalendarFindSpy.mockResolvedValue(mockCalendar);
      addBusinessDaysSpy.mockReturnValue(targetDate);
      msUntilSpy.mockReturnValue(259_200_000);

      await service.schedule({
        workspaceId: WORKSPACE_ID,
        workflowRunId: RUN_ID,
        stepId: STEP_ID,
        input: { delayType: 'BUSINESS_DAYS', businessDays: 3 },
      });

      expect(addBusinessDaysSpy).toHaveBeenCalledWith(mockCalendar, expect.any(Date), 3);
      expect(queueAddSpy.mock.calls[0][2].delay).toBe(259_200_000);
    });
  });
});
