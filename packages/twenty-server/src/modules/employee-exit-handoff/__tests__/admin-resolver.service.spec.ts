import { AdminResolverService } from 'src/modules/employee-exit-handoff/services/admin-resolver.service';

const WS_ID = 'workspace-001';

const makeRoleRepo = (roles: { id: string; label: string }[] = []) => ({
  find: jest.fn(async () => roles),
});

const makeRoleTargetRepo = (
  targets: { userWorkspaceId: string | null }[] = [],
) => ({
  find: jest.fn(async () => targets),
});

const makeUserWorkspaceRepo = (
  rows: { userId: string }[] = [],
) => ({
  find: jest.fn(async () => rows),
});

const makeUserRepo = (
  users: { id: string; email: string }[] = [],
) => ({
  find: jest.fn(async () => users),
});

const makeGlobalOrmManager = (
  members: { id: string; userEmail: string }[] = [],
) => ({
  executeInWorkspaceContext: jest.fn(
    async (fn: () => Promise<void>) => fn(),
  ),
  getRepository: jest.fn(async () => ({
    find: jest.fn(async () => members),
  })),
});

const buildService = ({
  roles = [{ id: 'role-admin', label: 'Admin' }],
  targets = [{ userWorkspaceId: 'uw-001' as string | null }],
  userWorkspaces = [{ userId: 'user-001' }],
  users = [{ id: 'user-001', email: 'admin@idda.com' }],
  members = [{ id: 'wm-admin', userEmail: 'admin@idda.com' }],
} = {}): AdminResolverService =>
  new AdminResolverService(
    makeRoleRepo(roles) as any,
    makeRoleTargetRepo(targets) as any,
    makeUserWorkspaceRepo(userWorkspaces) as any,
    makeUserRepo(users) as any,
    makeGlobalOrmManager(members) as any,
  );

describe('AdminResolverService', () => {
  it('returns Admin workspace member IDs via role chain', async () => {
    const svc = buildService();
    const ids = await svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID);
    expect(ids).toEqual(['wm-admin']);
  });

  it('includes HR role members', async () => {
    const svc = buildService({
      roles: [
        { id: 'role-admin', label: 'Admin' },
        { id: 'role-hr', label: 'HR' },
      ],
      targets: [
        { userWorkspaceId: 'uw-001' },
        { userWorkspaceId: 'uw-002' },
      ],
      userWorkspaces: [{ userId: 'user-001' }, { userId: 'user-002' }],
      users: [
        { id: 'user-001', email: 'admin@idda.com' },
        { id: 'user-002', email: 'hr@idda.com' },
      ],
      members: [
        { id: 'wm-admin', userEmail: 'admin@idda.com' },
        { id: 'wm-hr', userEmail: 'hr@idda.com' },
      ],
    });

    const ids = await svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID);
    expect(ids).toHaveLength(2);
    expect(ids).toContain('wm-admin');
    expect(ids).toContain('wm-hr');
  });

  it('returns empty array when no alert roles exist', async () => {
    const svc = buildService({ roles: [{ id: 'role-guest', label: 'Guest' }] });
    const ids = await svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID);
    expect(ids).toEqual([]);
  });

  it('returns empty array when no roleTargets exist for alert roles', async () => {
    const svc = buildService({ targets: [] });
    const ids = await svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID);
    expect(ids).toEqual([]);
  });

  it('returns empty array when no userWorkspaces match', async () => {
    const svc = buildService({ userWorkspaces: [] });
    const ids = await svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID);
    expect(ids).toEqual([]);
  });

  it('returns empty array when no user emails match any workspaceMember', async () => {
    const svc = buildService({
      members: [{ id: 'wm-other', userEmail: 'different@idda.com' }],
    });
    const ids = await svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID);
    expect(ids).toEqual([]);
  });

  it('does not throw when a repository call fails — returns empty array', async () => {
    const svc = new AdminResolverService(
      { find: jest.fn(async () => { throw new Error('DB error'); }) } as any,
      makeRoleTargetRepo() as any,
      makeUserWorkspaceRepo() as any,
      makeUserRepo() as any,
      makeGlobalOrmManager() as any,
    );

    await expect(
      svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID),
    ).resolves.toEqual([]);
  });

  it('filters out null userWorkspaceIds from roleTargets', async () => {
    const svc = buildService({
      targets: [
        { userWorkspaceId: null },    // API key target — skip
        { userWorkspaceId: 'uw-001' }, // user target — include
      ],
    });

    const ids = await svc.resolveAdminAndHrWorkspaceMemberIds(WS_ID);
    expect(ids).toEqual(['wm-admin']);
  });
});
