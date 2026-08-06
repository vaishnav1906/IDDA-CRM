import { TeamEmploymentStatusPostQueryHook } from 'src/modules/employee-exit-handoff/query-hooks/team-employment-status.post-query.hook';
import { TeamEmploymentStatusUpdateManyPostQueryHook } from 'src/modules/employee-exit-handoff/query-hooks/team-employment-status-update-many.post-query.hook';

const WS_ID = 'workspace-001';
const TEAM_ID = 'team-001';

const makeAuthContext = (workspaceMemberId = 'wm-actor-001') => ({
  type: 'user' as const,
  workspace: { id: WS_ID },
  workspaceMemberId,
});

const makeHandoffService = () => ({
  maybeEnqueueHandoff: jest.fn(async () => {}),
});

// ─── updateOne hook ──────────────────────────────────────────────────────────

describe('TeamEmploymentStatusPostQueryHook (updateOne)', () => {
  const buildHook = () => {
    const svc = makeHandoffService();
    const hook = new TeamEmploymentStatusPostQueryHook(svc as any);
    return { hook, svc };
  };

  it('enqueues handoff when employmentStatus contains RESIGNED', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['RESIGNED'] },
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledWith({
      workspaceId: WS_ID,
      teamMemberId: TEAM_ID,
      employmentStatus: ['RESIGNED'],
      actorWorkspaceMemberId: 'wm-actor-001',
    });
  });

  it('enqueues handoff when employmentStatus contains TERMINATED', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['TERMINATED'] },
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledTimes(1);
  });

  it('does NOT enqueue for ACTIVE status', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['ACTIVE'] },
    );
    expect(svc.maybeEnqueueHandoff).not.toHaveBeenCalled();
  });

  it('does NOT enqueue for ON_LEAVE status', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['ON_LEAVE'] },
    );
    expect(svc.maybeEnqueueHandoff).not.toHaveBeenCalled();
  });

  it('does NOT enqueue for NOTICE_PERIOD status', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['NOTICE_PERIOD'] },
    );
    expect(svc.maybeEnqueueHandoff).not.toHaveBeenCalled();
  });

  it('does NOT enqueue when employmentStatus is empty', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { id: TEAM_ID, employmentStatus: [] },
    );
    expect(svc.maybeEnqueueHandoff).not.toHaveBeenCalled();
  });

  it('does NOT enqueue when payload has no id', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { employmentStatus: ['RESIGNED'] }, // no id
    );
    expect(svc.maybeEnqueueHandoff).not.toHaveBeenCalled();
  });

  it('does NOT enqueue when payload is null', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(makeAuthContext() as any, 'team', null);
    expect(svc.maybeEnqueueHandoff).not.toHaveBeenCalled();
  });

  it('handles array payload (uses first element)', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      [{ id: TEAM_ID, employmentStatus: ['RESIGNED'] }],
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledTimes(1);
  });

  it('does not throw when maybeEnqueueHandoff fails — hook swallows error', async () => {
    const svc = {
      maybeEnqueueHandoff: jest.fn(async () => {
        throw new Error('queue down');
      }),
    };
    const hook = new TeamEmploymentStatusPostQueryHook(svc as any);

    await expect(
      hook.execute(
        makeAuthContext() as any,
        'team',
        { id: TEAM_ID, employmentStatus: ['RESIGNED'] },
      ),
    ).resolves.not.toThrow();
  });

  it('passes actorWorkspaceMemberId from user auth context', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext('wm-specific-actor') as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['TERMINATED'] },
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ actorWorkspaceMemberId: 'wm-specific-actor' }),
    );
  });

  it('passes null actorWorkspaceMemberId for API-key auth context', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      { type: 'api-key', workspace: { id: WS_ID } } as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['RESIGNED'] },
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ actorWorkspaceMemberId: null }),
    );
  });
});

// ─── updateMany hook ─────────────────────────────────────────────────────────

describe('TeamEmploymentStatusUpdateManyPostQueryHook (updateMany)', () => {
  const buildHook = () => {
    const svc = makeHandoffService();
    const hook = new TeamEmploymentStatusUpdateManyPostQueryHook(svc as any);
    return { hook, svc };
  };

  it('enqueues one job per exiting team member in a batch', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      [
        { id: 'team-001', employmentStatus: ['RESIGNED'] },
        { id: 'team-002', employmentStatus: ['TERMINATED'] },
        { id: 'team-003', employmentStatus: ['ACTIVE'] }, // not exiting
      ],
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledTimes(2);
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ teamMemberId: 'team-001' }),
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledWith(
      expect.objectContaining({ teamMemberId: 'team-002' }),
    );
  });

  it('handles empty batch gracefully', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(makeAuthContext() as any, 'team', []);
    expect(svc.maybeEnqueueHandoff).not.toHaveBeenCalled();
  });

  it('skips records with no id', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      [
        { employmentStatus: ['RESIGNED'] }, // no id
        { id: 'team-001', employmentStatus: ['RESIGNED'] },
      ],
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledTimes(1);
  });

  it('continues processing remaining records if one enqueue fails', async () => {
    let callCount = 0;
    const svc = {
      maybeEnqueueHandoff: jest.fn(async () => {
        callCount++;
        if (callCount === 1) throw new Error('queue error');
      }),
    };
    const hook = new TeamEmploymentStatusUpdateManyPostQueryHook(svc as any);

    await expect(
      hook.execute(
        makeAuthContext() as any,
        'team',
        [
          { id: 'team-001', employmentStatus: ['RESIGNED'] },
          { id: 'team-002', employmentStatus: ['TERMINATED'] },
        ],
      ),
    ).resolves.not.toThrow();

    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledTimes(2);
  });

  it('handles a single-record payload (non-array)', async () => {
    const { hook, svc } = buildHook();
    await hook.execute(
      makeAuthContext() as any,
      'team',
      { id: TEAM_ID, employmentStatus: ['RESIGNED'] },
    );
    expect(svc.maybeEnqueueHandoff).toHaveBeenCalledTimes(1);
  });
});
