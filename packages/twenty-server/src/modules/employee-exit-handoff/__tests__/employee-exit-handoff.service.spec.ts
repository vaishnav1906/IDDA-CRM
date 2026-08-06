import { Test, type TestingModule } from '@nestjs/testing';

import { EmployeeExitHandoffService } from 'src/modules/employee-exit-handoff/services/employee-exit-handoff.service';
import {
  HANDOFF_DONE_KEY_TTL_SECONDS,
  exitHandoffDoneKey,
  exitHandoffJobId,
  HANDOFF_BATCH_SIZE,
} from 'src/modules/employee-exit-handoff/constants/exit-handoff.constants';

// ─── Helpers ───────────────────────────────────────────────────────────────

const WS_ID = 'workspace-001';
const EMPLOYEE_TEAM_ID = 'team-employee-001';
const MANAGER_TEAM_ID = 'team-manager-001';
const EMPLOYEE_EMAIL = 'rahul@idda.com';
const MANAGER_EMAIL = 'priya@idda.com';
const EMPLOYEE_WM_ID = 'wm-employee-001';
const MANAGER_WM_ID = 'wm-manager-001';

const makePendingTask = (id: string, assigneeId = EMPLOYEE_WM_ID) => ({
  id,
  status: 'TODO',
  assigneeId,
  deletedAt: null,
});

const makeInProgressTask = (id: string) => ({
  id,
  status: 'IN_PROGRESS',
  assigneeId: EMPLOYEE_WM_ID,
  deletedAt: null,
});

const makeDoneTask = (id: string) => ({
  id,
  status: 'DONE',
  assigneeId: EMPLOYEE_WM_ID,
  deletedAt: null,
});

// ─── Mock factories ────────────────────────────────────────────────────────

const makeTeamRepo = (overrides: Record<string, any> = {}) => ({
  findOne: jest.fn(async ({ where }) => {
    if (where?.id === EMPLOYEE_TEAM_ID) {
      return {
        id: EMPLOYEE_TEAM_ID,
        name: 'Rahul Sharma',
        emailPrimaryEmail: EMPLOYEE_EMAIL,
        employmentStatus: ['RESIGNED'],
        reportingManagerId: MANAGER_TEAM_ID,
        ...overrides.employee,
      };
    }
    if (where?.id === MANAGER_TEAM_ID) {
      return {
        id: MANAGER_TEAM_ID,
        name: 'Priya Singh',
        emailPrimaryEmail: MANAGER_EMAIL,
        employmentStatus: ['ACTIVE'],
        ...overrides.manager,
      };
    }
    return null;
  }),
});

const makeWmRepo = (overrides: Record<string, any> = {}) => ({
  findOne: jest.fn(async ({ where }) => {
    if (where?.userEmail === EMPLOYEE_EMAIL)
      return { id: EMPLOYEE_WM_ID, userEmail: EMPLOYEE_EMAIL };
    if (where?.userEmail === MANAGER_EMAIL)
      return { id: MANAGER_WM_ID, userEmail: MANAGER_EMAIL, ...overrides.manager };
    return null;
  }),
  find: jest.fn(async () => [{ id: MANAGER_WM_ID }]),
  count: jest.fn(async () => 5),
});

const makeTaskRepo = (tasks: any[] = []) => ({
  find: jest.fn(async ({ skip = 0, take = HANDOFF_BATCH_SIZE }) =>
    tasks.slice(skip, skip + take),
  ),
  findOne: jest.fn(async ({ where }) =>
    tasks.find((t) => t.id === where.id) ?? null,
  ),
  update: jest.fn(async () => ({ affected: 1 })),
  count: jest.fn(async () => tasks.length),
  save: jest.fn(async (data) => ({ id: 'new-task-001', ...data })),
});

const makeGlobalOrmManager = (repos: {
  team?: any;
  workspaceMember?: any;
  task?: any;
}) =>
  ({
    executeInWorkspaceContext: jest.fn(
      async (fn: () => Promise<void>, _authContext: any) => fn(),
    ),
    getRepository: jest.fn(async (_wsId: string, name: string) => {
      if (name === 'team') return repos.team ?? makeTeamRepo();
      if (name === 'workspaceMember') return repos.workspaceMember ?? makeWmRepo();
      if (name === 'task') return repos.task ?? makeTaskRepo();
      throw new Error(`Unknown repo: ${name}`);
    }),
  } as any);

/** Stateful Redis mock — set() actually persists the key so get() returns '1' on subsequent calls. */
const makeRedis = (existingKeys: Set<string> = new Set()) => {
  const store = new Set<string>([...existingKeys]);
  return {
    get: jest.fn(async (key: string) => (store.has(key) ? '1' : null)),
    set: jest.fn(async (key: string) => {
      store.add(key);
      return 'OK';
    }),
  };
};

const makeQueue = () => ({
  add: jest.fn(async () => {}),
});

const makeRedisClientService = (redis: any) => ({
  getClient: jest.fn(() => redis),
});

const makeNotificationService = () => ({
  dispatch: jest.fn(async () => {}),
  dispatchInApp: jest.fn(async () => {}),
});

const makeTimelineWriter = () => ({
  write: jest.fn(async () => {}),
});

const ADMIN_WM_ID = 'wm-admin-001';

const makeAdminResolver = () => ({
  resolveAdminAndHrWorkspaceMemberIds: jest.fn(async () => [ADMIN_WM_ID]),
});

// ─── Service builder ───────────────────────────────────────────────────────

const buildService = ({
  redis = makeRedis(),
  queue = makeQueue(),
  ormManager,
  notificationService = makeNotificationService(),
  timelineWriter = makeTimelineWriter(),
  adminResolver = makeAdminResolver(),
}: {
  redis?: ReturnType<typeof makeRedis>;
  queue?: ReturnType<typeof makeQueue>;
  ormManager?: any;
  notificationService?: ReturnType<typeof makeNotificationService>;
  timelineWriter?: ReturnType<typeof makeTimelineWriter>;
  adminResolver?: ReturnType<typeof makeAdminResolver>;
} = {}): EmployeeExitHandoffService => {
  const service = new EmployeeExitHandoffService(
    ormManager ?? makeGlobalOrmManager({}),
    queue as any,
    makeRedisClientService(redis) as any,
    notificationService as any,
    timelineWriter as any,
    adminResolver as any,
  );

  return service;
};

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('EmployeeExitHandoffService', () => {
  // ── resolveExitStatus ───────────────────────────────────────────────────

  describe('resolveExitStatus', () => {
    const svc = buildService();

    it('returns RESIGNED when array contains RESIGNED', () => {
      expect(svc.resolveExitStatus(['ACTIVE', 'RESIGNED'])).toBe('RESIGNED');
    });

    it('returns TERMINATED when array contains TERMINATED', () => {
      expect(svc.resolveExitStatus(['TERMINATED'])).toBe('TERMINATED');
    });

    it('returns null for active-only statuses', () => {
      expect(svc.resolveExitStatus(['ACTIVE'])).toBeNull();
      expect(svc.resolveExitStatus(['ON_LEAVE'])).toBeNull();
      expect(svc.resolveExitStatus(['NOTICE_PERIOD'])).toBeNull();
    });

    it('returns null for empty array', () => {
      expect(svc.resolveExitStatus([])).toBeNull();
    });
  });

  // ── maybeEnqueueHandoff ─────────────────────────────────────────────────

  describe('maybeEnqueueHandoff', () => {
    it('enqueues job when exit status present and key not set', async () => {
      const queue = makeQueue();
      const redis = makeRedis();
      const svc = buildService({ queue, redis });

      await svc.maybeEnqueueHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        employmentStatus: ['RESIGNED'],
        actorWorkspaceMemberId: MANAGER_WM_ID,
      });

      expect(queue.add).toHaveBeenCalledWith(
        'employee-exit-handoff',
        expect.objectContaining({ teamMemberId: EMPLOYEE_TEAM_ID, exitStatus: 'RESIGNED' }),
        expect.objectContaining({ id: exitHandoffJobId(WS_ID, EMPLOYEE_TEAM_ID) }),
      );
    });

    it('does NOT enqueue when idempotency key already exists', async () => {
      const queue = makeQueue();
      const existingKeys = new Set([exitHandoffDoneKey(WS_ID, EMPLOYEE_TEAM_ID)]);
      const redis = makeRedis(existingKeys);
      const svc = buildService({ queue, redis });

      await svc.maybeEnqueueHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        employmentStatus: ['RESIGNED'],
        actorWorkspaceMemberId: null,
      });

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('does NOT enqueue for non-exit statuses', async () => {
      const queue = makeQueue();
      const svc = buildService({ queue });

      await svc.maybeEnqueueHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        employmentStatus: ['ACTIVE', 'ON_LEAVE'],
        actorWorkspaceMemberId: null,
      });

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('does NOT enqueue for empty status array', async () => {
      const queue = makeQueue();
      const svc = buildService({ queue });

      await svc.maybeEnqueueHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        employmentStatus: [],
        actorWorkspaceMemberId: null,
      });

      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  // ── executeHandoff — happy paths ─────────────────────────────────────────

  describe('executeHandoff — happy paths', () => {
    it('Active→Resigned: transfers 5 pending tasks, sends notification, sets idempotency key', async () => {
      const tasks = [
        makePendingTask('t1'),
        makePendingTask('t2'),
        makePendingTask('t3'),
        makePendingTask('t4'),
        makePendingTask('t5'),
      ];
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({
        team: makeTeamRepo(),
        workspaceMember: makeWmRepo(),
        task: taskRepo,
      });
      const redis = makeRedis();
      const notif = makeNotificationService();
      const timeline = makeTimelineWriter();
      const svc = buildService({ ormManager, redis, notificationService: notif, timelineWriter: timeline });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('COMPLETED');
      if (result.outcome === 'COMPLETED') {
        expect(result.transferred).toBe(5);
        expect(result.skipped).toBe(0);
        expect(result.failed).toBe(0);
      }

      expect(taskRepo.update).toHaveBeenCalledTimes(5);
      expect(redis.set).toHaveBeenCalledWith(
        exitHandoffDoneKey(WS_ID, EMPLOYEE_TEAM_ID),
        '1',
        'EX',
        HANDOFF_DONE_KEY_TTL_SECONDS,
      );
      expect(notif.dispatch).toHaveBeenCalledTimes(1);
      expect(timeline.write).toHaveBeenCalledTimes(5);
    });

    it('Active→Terminated: transfers all pending tasks', async () => {
      const tasks = [makePendingTask('t1'), makePendingTask('t2')];
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'TERMINATED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('COMPLETED');
      if (result.outcome === 'COMPLETED') expect(result.transferred).toBe(2);
    });

    it('Active→Inactive: no pending tasks → COMPLETED with 0 transferred', async () => {
      const taskRepo = makeTaskRepo([]);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const notif = makeNotificationService();
      const svc = buildService({ ormManager, notificationService: notif });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('COMPLETED');
      if (result.outcome === 'COMPLETED') {
        expect(result.transferred).toBe(0);
        expect(result.skipped).toBe(0);
      }
      // No notification because transferred=0
      expect(notif.dispatch).not.toHaveBeenCalled();
    });

    it('completed tasks remain unchanged (skipped)', async () => {
      const tasks = [
        makePendingTask('t1'),
        makeDoneTask('t2'),
        makeDoneTask('t3'),
      ];
      // Simulate fresh re-fetch: done tasks won't pass the status check in reassignTask
      const taskRepo = {
        find: jest.fn(async () => tasks),
        findOne: jest.fn(async ({ where }: any) => tasks.find((t) => t.id === where.id)),
        update: jest.fn(async () => ({ affected: 1 })),
        count: jest.fn(async () => tasks.length),
        save: jest.fn(async (d: any) => d),
      };
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('COMPLETED');
      if (result.outcome === 'COMPLETED') {
        expect(result.transferred).toBe(1);
        expect(result.skipped).toBe(2);
      }
      expect(taskRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  // ── executeHandoff — failure scenarios ───────────────────────────────────

  describe('executeHandoff — failure scenarios', () => {
    it('already processed: returns ALREADY_PROCESSED without touching DB', async () => {
      const existingKeys = new Set([exitHandoffDoneKey(WS_ID, EMPLOYEE_TEAM_ID)]);
      const redis = makeRedis(existingKeys);
      const ormManager = makeGlobalOrmManager({});
      const svc = buildService({ redis, ormManager });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('ALREADY_PROCESSED');
      expect(ormManager.getRepository).not.toHaveBeenCalled();
    });

    it('no WorkspaceMember for leaving employee: notifies admins, returns NO_WORKSPACE_MEMBER_FOR_EMPLOYEE', async () => {
      const wmRepo = {
        findOne: jest.fn(async () => null), // no match
        find: jest.fn(async () => [{ id: MANAGER_WM_ID }]),
        count: jest.fn(async () => 0),
      };
      const ormManager = makeGlobalOrmManager({ workspaceMember: wmRepo });
      const notif = makeNotificationService();
      const svc = buildService({ ormManager, notificationService: notif });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('NO_WORKSPACE_MEMBER_FOR_EMPLOYEE');
      expect(notif.dispatchInApp).toHaveBeenCalled();
    });

    it('no Reporting Manager: notifies admins, creates review task', async () => {
      const teamRepo = makeTeamRepo({ employee: { reportingManagerId: null } });
      const taskRepo = makeTaskRepo([makePendingTask('t1'), makePendingTask('t2')]);
      const ormManager = makeGlobalOrmManager({ team: teamRepo, task: taskRepo });
      const notif = makeNotificationService();
      const svc = buildService({ ormManager, notificationService: notif });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('NO_REPORTING_MANAGER');
      expect(notif.dispatchInApp).toHaveBeenCalled();
    });

    it('Reporting Manager has no WorkspaceMember: notifies and returns NO_WORKSPACE_MEMBER_FOR_MANAGER', async () => {
      const wmRepo = {
        findOne: jest.fn(async ({ where }: any) => {
          if (where?.userEmail === EMPLOYEE_EMAIL) return { id: EMPLOYEE_WM_ID, userEmail: EMPLOYEE_EMAIL };
          return null; // manager has no WM
        }),
        find: jest.fn(async () => [{ id: MANAGER_WM_ID }]),
        count: jest.fn(async () => 2),
      };
      const taskRepo = makeTaskRepo([makePendingTask('t1')]);
      const ormManager = makeGlobalOrmManager({ workspaceMember: wmRepo, task: taskRepo });
      const notif = makeNotificationService();
      const svc = buildService({ ormManager, notificationService: notif });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('NO_WORKSPACE_MEMBER_FOR_MANAGER');
      expect(notif.dispatchInApp).toHaveBeenCalled();
    });

    it('Reporting Manager is inactive: notifies and returns MANAGER_INACTIVE', async () => {
      const teamRepo = makeTeamRepo({
        manager: { employmentStatus: ['RESIGNED'], emailPrimaryEmail: MANAGER_EMAIL },
      });
      const taskRepo = makeTaskRepo([makePendingTask('t1')]);
      const ormManager = makeGlobalOrmManager({ team: teamRepo, task: taskRepo });
      const notif = makeNotificationService();
      const svc = buildService({ ormManager, notificationService: notif });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('MANAGER_INACTIVE');
      expect(notif.dispatchInApp).toHaveBeenCalled();
    });
  });

  // ── executeHandoff — idempotency / race conditions ───────────────────────

  describe('executeHandoff — idempotency and race conditions', () => {
    it('duplicate event delivery: second call returns ALREADY_PROCESSED', async () => {
      const taskRepo = makeTaskRepo([makePendingTask('t1')]);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const redis = makeRedis();
      const svc = buildService({ ormManager, redis });

      await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      const secondResult = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(secondResult.outcome).toBe('ALREADY_PROCESSED');
      // First run: 1 update call. Second run: zero additional updates.
      expect(taskRepo.update).toHaveBeenCalledTimes(1);
    });

    it('same record edited after handoff: re-trigger is suppressed', async () => {
      const doneKey = exitHandoffDoneKey(WS_ID, EMPLOYEE_TEAM_ID);
      const existingKeys = new Set([doneKey]);
      const redis = makeRedis(existingKeys);
      const svc = buildService({ redis });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('ALREADY_PROCESSED');
    });

    it('task manually reassigned during processing: skips that task', async () => {
      const otherWmId = 'wm-other-999';
      const tasks = [
        makePendingTask('t1'),
        { ...makePendingTask('t2'), assigneeId: otherWmId }, // already reassigned
        makePendingTask('t3'),
      ];
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('COMPLETED');
      if (result.outcome === 'COMPLETED') {
        expect(result.transferred).toBe(2); // t1 + t3
        expect(result.skipped).toBe(1);    // t2 — different assignee
      }
    });

    it('worker retry after partial failure: idempotency key prevents double transfer', async () => {
      const tasks = [makePendingTask('t1')];
      const redis = makeRedis();
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager, redis });

      // First run succeeds and sets the key
      const firstResult = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });
      expect(firstResult.outcome).toBe('COMPLETED');

      // Retry: key is now set, job suppressed
      const retryResult = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });
      expect(retryResult.outcome).toBe('ALREADY_PROCESSED');
      expect(taskRepo.update).toHaveBeenCalledTimes(1); // not called again
    });
  });

  // ── executeHandoff — bulk processing ─────────────────────────────────────

  describe('executeHandoff — bulk processing', () => {
    it('processes 100+ tasks in batches without loading all into memory at once', async () => {
      const totalTasks = 125;
      const tasks = Array.from({ length: totalTasks }, (_, i) =>
        makePendingTask(`t${i}`),
      );
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('COMPLETED');
      if (result.outcome === 'COMPLETED') {
        expect(result.transferred).toBe(totalTasks);
      }
      // 3 batched fetches: 50 + 50 + 25. The last batch (25 < 50) triggers the break so no 4th call.
      expect(taskRepo.find).toHaveBeenCalledTimes(3);
    });

    it('grouped notification sent once (not per task)', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => makePendingTask(`t${i}`));
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const notif = makeNotificationService();
      const svc = buildService({ ormManager, notificationService: notif });

      await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(notif.dispatch).toHaveBeenCalledTimes(1);
    });

    it('partial failure: PARTIAL_FAILURE outcome, idempotency key still set', async () => {
      const tasks = [makePendingTask('t1'), makePendingTask('t2')];
      let callCount = 0;
      const taskRepo = {
        find: jest.fn(async () => tasks),
        findOne: jest.fn(async ({ where }: any) => tasks.find((t) => t.id === where.id)),
        update: jest.fn(async () => {
          callCount++;
          if (callCount === 2) throw new Error('DB write error');
          return { affected: 1 };
        }),
        count: jest.fn(async () => tasks.length),
        save: jest.fn(async (d: any) => d),
      };
      const redis = makeRedis();
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager, redis });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('PARTIAL_FAILURE');
      if (result.outcome === 'PARTIAL_FAILURE') {
        expect(result.transferred).toBe(1);
        expect(result.failed).toBe(1);
      }
      // Idempotency key still set to prevent infinite retries
      expect(redis.set).toHaveBeenCalledWith(
        exitHandoffDoneKey(WS_ID, EMPLOYEE_TEAM_ID),
        '1',
        'EX',
        HANDOFF_DONE_KEY_TTL_SECONDS,
      );
    });
  });

  // ── In-progress tasks ────────────────────────────────────────────────────

  describe('executeHandoff — in-progress task handling', () => {
    it('transfers IN_PROGRESS tasks alongside TODO tasks', async () => {
      const tasks = [
        makePendingTask('t1'),
        makeInProgressTask('t2'),
        makeDoneTask('t3'),
      ];
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager });

      const result = await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      expect(result.outcome).toBe('COMPLETED');
      if (result.outcome === 'COMPLETED') {
        expect(result.transferred).toBe(2); // t1 + t2
        expect(result.skipped).toBe(1);     // t3
      }
    });
  });

  // ── No duplicate tasks created ────────────────────────────────────────────

  describe('executeHandoff — no duplicate tasks', () => {
    it('does not create new tasks; updates assigneeId in place', async () => {
      const tasks = [makePendingTask('t1')];
      const taskRepo = makeTaskRepo(tasks);
      const ormManager = makeGlobalOrmManager({ task: taskRepo });
      const svc = buildService({ ormManager });

      await svc.executeHandoff({
        workspaceId: WS_ID,
        teamMemberId: EMPLOYEE_TEAM_ID,
        exitStatus: 'RESIGNED',
        actorWorkspaceMemberId: null,
      });

      // Only save() is called for the review task path; NOT for reassignment
      // Reassignment uses taskRepo.update(), not save()
      expect(taskRepo.update).toHaveBeenCalledWith('t1', { assigneeId: MANAGER_WM_ID });
      expect(taskRepo.save).not.toHaveBeenCalled();
    });
  });
});
