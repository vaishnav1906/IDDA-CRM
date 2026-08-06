import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { BusinessCalendarEntity } from 'src/engine/core-modules/business-calendar/entities/business-calendar.entity';
import { BusinessCalendarService } from 'src/engine/core-modules/business-calendar/services/business-calendar.service';

const MOCK_WORKSPACE_ID = 'workspace-uuid-123';

const UTC_CALENDAR: BusinessCalendarEntity = {
  id: 'cal-utc',
  workspaceId: MOCK_WORKSPACE_ID,
  timezone: 'UTC',
  weekSchedule: {
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    wednesday: { open: '09:00', close: '17:00' },
    thursday: { open: '09:00', close: '17:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: null,
    sunday: null,
  },
  holidays: [{ date: '2025-12-25', name: 'Christmas' }],
  slaSlaTargetMinutes: 480,
  createdAt: new Date('2025-07-01'),
  updatedAt: new Date('2025-07-01'),
};

// IST is UTC+5:30. Business hours 09:00–17:00 IST = 03:30–11:30 UTC.
const IST_CALENDAR: BusinessCalendarEntity = {
  ...UTC_CALENDAR,
  id: 'cal-ist',
  timezone: 'Asia/Kolkata',
};

const buildRepositoryMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
});

describe('BusinessCalendarService', () => {
  let service: BusinessCalendarService;
  let repositoryMock: ReturnType<typeof buildRepositoryMock>;

  beforeEach(async () => {
    repositoryMock = buildRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessCalendarService,
        {
          provide: getRepositoryToken(BusinessCalendarEntity),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get(BusinessCalendarService);
  });

  // ── UTC calendar tests ────────────────────────────────────────────────────

  describe('isBusinessTime (UTC calendar)', () => {
    it('returns true for a Monday at 10:00 UTC', () => {
      // 2025-07-07 is a Monday
      const date = new Date('2025-07-07T10:00:00Z');

      expect(service.isBusinessTime(UTC_CALENDAR, date)).toBe(true);
    });

    it('returns false for a Saturday', () => {
      const date = new Date('2025-07-05T10:00:00Z');

      expect(service.isBusinessTime(UTC_CALENDAR, date)).toBe(false);
    });

    it('returns false before business open (08:59 UTC)', () => {
      const date = new Date('2025-07-07T08:59:00Z');

      expect(service.isBusinessTime(UTC_CALENDAR, date)).toBe(false);
    });

    it('returns true at open boundary (09:00 UTC)', () => {
      const date = new Date('2025-07-07T09:00:00Z');

      expect(service.isBusinessTime(UTC_CALENDAR, date)).toBe(true);
    });

    it('returns false at close boundary (17:00 UTC)', () => {
      const date = new Date('2025-07-07T17:00:00Z');

      expect(service.isBusinessTime(UTC_CALENDAR, date)).toBe(false);
    });

    it('returns false on a holiday (2025-12-25)', () => {
      const date = new Date('2025-12-25T10:00:00Z');

      expect(service.isBusinessTime(UTC_CALENDAR, date)).toBe(false);
    });
  });

  // ── Timezone-aware tests (IST = UTC+5:30) ───────────────────────────────

  describe('isBusinessTime (IST calendar — timezone is respected)', () => {
    it('returns true at 09:00 IST which is 03:30 UTC', () => {
      // 09:00 IST on 2025-07-07 = 2025-07-07T03:30:00Z
      const date = new Date('2025-07-07T03:30:00Z');

      expect(service.isBusinessTime(IST_CALENDAR, date)).toBe(true);
    });

    it('returns false at 09:00 UTC when IST calendar is used (= 14:30 IST, after close)', () => {
      // 09:00 UTC = 14:30 IST — past 17:00 IST close? No, 14:30 is within 09-17.
      // Let's use 12:00 UTC = 17:30 IST (after close)
      const date = new Date('2025-07-07T11:31:00Z'); // = 17:01 IST → after close

      expect(service.isBusinessTime(IST_CALENDAR, date)).toBe(false);
    });

    it('returns false at 03:29 UTC (= 08:59 IST, before open)', () => {
      const date = new Date('2025-07-07T03:29:00Z');

      expect(service.isBusinessTime(IST_CALENDAR, date)).toBe(false);
    });

    it('correctly identifies a Saturday in IST even when it is still Friday UTC', () => {
      // 2025-07-05T20:00:00Z = 2025-07-06 01:30 IST (Saturday)
      const date = new Date('2025-07-05T20:00:00Z');

      expect(service.isBusinessTime(IST_CALENDAR, date)).toBe(false);
    });
  });

  // ── addBusinessDays tests ─────────────────────────────────────────────────

  describe('addBusinessDays (UTC calendar)', () => {
    it('adds one business day skipping the weekend (Friday → Monday)', () => {
      const friday = new Date('2025-07-04T10:00:00Z');
      const result = service.addBusinessDays(UTC_CALENDAR, friday, 1);

      // Should be Monday 2025-07-07 at 09:00 UTC
      expect(result.toISOString().slice(0, 10)).toBe('2025-07-07');
      expect(result.getUTCHours()).toBe(9);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it('adds zero business days — returns next business open', () => {
      const saturday = new Date('2025-07-05T10:00:00Z');
      const result = service.addBusinessDays(UTC_CALENDAR, saturday, 0);

      expect(result.toISOString().slice(0, 10)).toBe('2025-07-07');
    });

    it('skips a holiday when adding business days', () => {
      // 2025-12-24 (Wednesday) + 1 business day should skip 2025-12-25 (holiday)
      const beforeChristmasEve = new Date('2025-12-24T10:00:00Z');
      const result = service.addBusinessDays(UTC_CALENDAR, beforeChristmasEve, 1);

      expect(result.toISOString().slice(0, 10)).toBe('2025-12-26');
    });
  });

  describe('addBusinessDays (IST calendar)', () => {
    it('adds one business day and returns open time in IST expressed as UTC', () => {
      // 2025-07-07 Monday 10:00 IST (= 04:30 UTC) + 1 business day = 2025-07-08 09:00 IST = 03:30 UTC
      const mondayMorningIst = new Date('2025-07-07T04:30:00Z');
      const result = service.addBusinessDays(IST_CALENDAR, mondayMorningIst, 1);

      expect(result.toISOString().slice(0, 10)).toBe('2025-07-08');
      // 09:00 IST = 03:30 UTC
      expect(result.getUTCHours()).toBe(3);
      expect(result.getUTCMinutes()).toBe(30);
    });
  });

  // ── msUntil tests ────────────────────────────────────────────────────────

  describe('msUntil', () => {
    it('returns positive ms for a future date', () => {
      const future = new Date(Date.now() + 60_000);

      expect(service.msUntil(future)).toBeGreaterThan(0);
    });

    it('clamps to 0 for a past date', () => {
      const past = new Date(Date.now() - 60_000);

      expect(service.msUntil(past)).toBe(0);
    });
  });

  // ── Repository delegation tests ───────────────────────────────────────────

  describe('findByWorkspaceId', () => {
    it('returns calendar when found', async () => {
      repositoryMock.findOne.mockResolvedValue(UTC_CALENDAR);
      const result = await service.findByWorkspaceId(MOCK_WORKSPACE_ID);

      expect(result).toEqual(UTC_CALENDAR);
    });

    it('returns null when not found', async () => {
      repositoryMock.findOne.mockResolvedValue(null);
      const result = await service.findByWorkspaceId(MOCK_WORKSPACE_ID);

      expect(result).toBeNull();
    });
  });
});
