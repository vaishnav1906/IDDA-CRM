import { Test, TestingModule } from '@nestjs/testing';

import { LeadConvertOnStatusPostQueryHook } from 'src/modules/lead/query-hooks/lead-convert-on-status.post-query.hook';
import { type LeadWorkspaceEntity } from 'src/modules/lead/standard-objects/lead.workspace-entity';

const WORKSPACE_ID = 'ws-test-001';
const LEAD_ID = 'lead-test-001';
const CLINIC_ID = 'clinic-test-001';

const makeLead = (overrides: Partial<LeadWorkspaceEntity> = {}): LeadWorkspaceEntity =>
  ({
    id: LEAD_ID,
    status: 'CONVERTED',
    doctorId: null,
    doctorName: 'Dr. Priya Sharma',
    clinicName: 'Sharma Dental Clinic',
    clinicId: CLINIC_ID,
    phone: '9876543210',
    specialization: 'DENTIST',
    assignedToId: 'member-001',
    ...overrides,
  } as LeadWorkspaceEntity);

const makeAuthContext = (workspaceIdOverride = WORKSPACE_ID) => ({
  workspace: { id: workspaceIdOverride },
  user: { id: 'user-001' },
  apiKey: null,
  workspaceMemberId: 'member-001',
});

describe('LeadConvertOnStatusPostQueryHook', () => {
  let hook: LeadConvertOnStatusPostQueryHook;
  let ormManager: {
    executeInWorkspaceContext: jest.Mock;
    getRepository: jest.Mock;
  };
  let timelineWriteSpy: jest.SpyInstance;

  const mockPersonRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLeadRepo = {
    update: jest.fn(),
  };

  beforeEach(async () => {
    ormManager = {
      executeInWorkspaceContext: jest.fn(async (fn: () => Promise<void>, _ctx: unknown) =>
        fn(),
      ),
      getRepository: jest.fn((_, objectName) => {
        if (objectName === 'person') return mockPersonRepo;
        if (objectName === 'lead') return mockLeadRepo;

        return {};
      }),
    };

    const timelineWriterMock = {
      write: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadConvertOnStatusPostQueryHook,
        { provide: 'GlobalWorkspaceOrmManager', useValue: ormManager },
        { provide: 'WorkflowTimelineWriterService', useValue: timelineWriterMock },
      ],
    })
      .overrideProvider(LeadConvertOnStatusPostQueryHook)
      .useFactory({
        factory: () =>
          new LeadConvertOnStatusPostQueryHook(
            ormManager as any,
            timelineWriterMock as any,
          ),
      })
      .compile();

    hook = module.get(LeadConvertOnStatusPostQueryHook);
    timelineWriteSpy = jest.spyOn(timelineWriterMock, 'write');

    jest.clearAllMocks();

    mockPersonRepo.findOne.mockResolvedValue(null);
    mockPersonRepo.create.mockImplementation((data) => ({ ...data, id: 'person-new-001' }));
    mockPersonRepo.save.mockResolvedValue({ id: 'person-new-001' });
    mockLeadRepo.update.mockResolvedValue(undefined);
    ormManager.executeInWorkspaceContext.mockImplementation(async (fn: () => Promise<void>) => fn());
    ormManager.getRepository.mockImplementation((_wsId: string, objectName: string) => {
      if (objectName === 'person') return mockPersonRepo;
      if (objectName === 'lead') return mockLeadRepo;

      return {};
    });
  });

  it('does nothing when lead status is not CONVERTED', async () => {
    const lead = makeLead({ status: 'INTERESTED' });

    await hook.execute(makeAuthContext() as any, 'lead', lead);

    expect(ormManager.executeInWorkspaceContext).not.toHaveBeenCalled();
  });

  it('does nothing when lead doctorId is already set (idempotent)', async () => {
    const lead = makeLead({ doctorId: 'existing-doctor-001' });

    await hook.execute(makeAuthContext() as any, 'lead', lead);

    expect(ormManager.executeInWorkspaceContext).not.toHaveBeenCalled();
  });

  it('creates a new Doctor Person when no existing Doctor by name+clinic', async () => {
    const lead = makeLead();

    await hook.execute(makeAuthContext() as any, 'lead', lead);

    expect(mockPersonRepo.findOne).toHaveBeenCalledWith({
      where: { name: { firstName: 'Priya', lastName: 'Sharma' }, companyId: CLINIC_ID },
    });
    expect(mockPersonRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isPrimaryDoctor: true,
        companyId: CLINIC_ID,
        jobTitle: 'Dentist',
      }),
    );
    expect(mockPersonRepo.save).toHaveBeenCalledTimes(1);
    expect(mockLeadRepo.update).toHaveBeenCalledWith(LEAD_ID, { doctorId: 'person-new-001' });
    expect(timelineWriteSpy).toHaveBeenCalledTimes(1);
  });

  it('links existing Doctor when same name+clinic found — no duplicate created', async () => {
    const existingDoctor = { id: 'person-existing-001' };

    mockPersonRepo.findOne.mockResolvedValue(existingDoctor);

    const lead = makeLead();

    await hook.execute(makeAuthContext() as any, 'lead', lead);

    expect(mockPersonRepo.create).not.toHaveBeenCalled();
    expect(mockPersonRepo.save).not.toHaveBeenCalled();
    expect(mockLeadRepo.update).toHaveBeenCalledWith(LEAD_ID, { doctorId: 'person-existing-001' });
    expect(timelineWriteSpy).toHaveBeenCalledTimes(1);
  });

  it('sets isPrimaryDoctor=true and uses humanized jobTitle not SELECT value', async () => {
    const lead = makeLead({ specialization: 'DERMATOLOGIST' });

    await hook.execute(makeAuthContext() as any, 'lead', lead);

    expect(mockPersonRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isPrimaryDoctor: true,
        jobTitle: 'Dermatologist',
      }),
    );
  });

  it('handles converted Lead with no assignedToId gracefully — no error thrown', async () => {
    const lead = makeLead({ assignedToId: null });

    await expect(hook.execute(makeAuthContext() as any, 'lead', lead)).resolves.toBeUndefined();
    expect(mockLeadRepo.update).toHaveBeenCalled();
  });

  it('does not create a second Doctor when CONVERTED lead is updated again', async () => {
    // First conversion: doctorId is null → Doctor created
    const lead = makeLead();

    await hook.execute(makeAuthContext() as any, 'lead', lead);
    expect(mockPersonRepo.save).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    mockPersonRepo.findOne.mockResolvedValue(null);
    ormManager.executeInWorkspaceContext.mockImplementation(async (fn: () => Promise<void>) => fn());
    ormManager.getRepository.mockImplementation((_wsId: string, objectName: string) => {
      if (objectName === 'person') return mockPersonRepo;
      if (objectName === 'lead') return mockLeadRepo;

      return {};
    });

    // Second update: doctorId is now set → guard fires, no DB calls
    const leadAfterFirstConversion = makeLead({ doctorId: 'person-new-001' });

    await hook.execute(makeAuthContext() as any, 'lead', leadAfterFirstConversion);

    expect(ormManager.executeInWorkspaceContext).not.toHaveBeenCalled();
  });

  it('logs error and does not throw when Doctor creation fails', async () => {
    mockPersonRepo.save.mockRejectedValue(new Error('DB constraint violation'));

    const loggerSpy = jest
      .spyOn(hook['logger'], 'error')
      .mockImplementation(() => undefined);

    const lead = makeLead();

    await expect(hook.execute(makeAuthContext() as any, 'lead', lead)).resolves.toBeUndefined();
    expect(loggerSpy).toHaveBeenCalled();
    expect(timelineWriteSpy).not.toHaveBeenCalled();
  });
});
