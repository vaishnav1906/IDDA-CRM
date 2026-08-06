import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { UpsertBusinessCalendarInput } from 'src/engine/core-modules/business-calendar/dtos/upsert-business-calendar.input';
import {
  type BusinessHoliday,
  type BusinessWeekSchedule,
  BusinessCalendarEntity,
} from 'src/engine/core-modules/business-calendar/entities/business-calendar.entity';

const DEFAULT_WEEK_SCHEDULE: BusinessWeekSchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
};

const DAY_NAMES: (keyof BusinessWeekSchedule)[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns the individual date/time parts of a UTC instant expressed in the
 * given IANA timezone using `Intl.DateTimeFormat`.  This is the correct,
 * dependency-free way to do timezone-aware arithmetic in Node.js 18+.
 */
function getPartsInTz(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number; weekday: number; hours: number; minutes: number } {
  // 'en-CA' gives us YYYY-MM-DD date parts reliably
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    Number(dateParts.find((p) => p.type === type)?.value ?? '0');

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hours = get('hour') % 24; // hour12:false can still produce 24 for midnight on some runtimes
  const minutes = get('minute');

  // Compute weekday (0=Sun…6=Sat) from the local date in the timezone.
  // We reconstruct a Date at midnight UTC that represents the local date.
  const midnightUtc = Date.UTC(year, month - 1, day);
  const weekday = new Date(midnightUtc).getUTCDay();

  return { year, month, day, weekday, hours, minutes };
}

/**
 * Returns a local-date string `YYYY-MM-DD` for `date` in the given timezone.
 */
function localDateString(date: Date, timezone: string): string {
  const { year, month, day } = getPartsInTz(date, timezone);

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Returns a Date representing the start of the given local date (i.e. HH:MM)
 * expressed in the given timezone, as a UTC instant.
 */
function localHhmToUtc(
  year: number,
  month: number,
  day: number,
  hhMm: string,
  timezone: string,
): Date {
  const [hours, minutes] = hhMm.split(':').map(Number);
  // Build an ISO string that we resolve in the target timezone via
  // Intl. We use a binary-search approach: find the UTC offset at the
  // approximate local time, then correct.
  // Simpler and sufficient: create a UTC candidate, then read it back
  // in the timezone and adjust by the offset.
  const candidate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const parts = getPartsInTz(candidate, timezone);
  const offsetMinutes =
    (hours - parts.hours) * 60 + (minutes - parts.minutes);

  return new Date(candidate.getTime() + offsetMinutes * 60_000);
}

@Injectable()
export class BusinessCalendarService {
  private readonly logger = new Logger(BusinessCalendarService.name);

  constructor(
    @InjectRepository(BusinessCalendarEntity)
    private readonly businessCalendarRepository: Repository<BusinessCalendarEntity>,
  ) {}

  async upsert(
    workspaceId: string,
    input: UpsertBusinessCalendarInput,
  ): Promise<BusinessCalendarEntity> {
    const existing = await this.businessCalendarRepository.findOne({
      where: { workspaceId },
    });

    if (isDefined(existing)) {
      const updated = this.businessCalendarRepository.merge(existing, {
        timezone: input.timezone ?? existing.timezone,
        weekSchedule:
          (input.weekSchedule as BusinessWeekSchedule) ?? existing.weekSchedule,
        holidays:
          (input.holidays as BusinessHoliday[]) ?? existing.holidays,
        slaSlaTargetMinutes:
          input.slaSlaTargetMinutes ?? existing.slaSlaTargetMinutes,
      });

      return this.businessCalendarRepository.save(updated);
    }

    const created = this.businessCalendarRepository.create({
      workspaceId,
      timezone: input.timezone ?? 'UTC',
      weekSchedule:
        (input.weekSchedule as BusinessWeekSchedule) ?? DEFAULT_WEEK_SCHEDULE,
      holidays: (input.holidays as BusinessHoliday[]) ?? [],
      slaSlaTargetMinutes: input.slaSlaTargetMinutes ?? 480,
    });

    return this.businessCalendarRepository.save(created);
  }

  async findByWorkspaceId(
    workspaceId: string,
  ): Promise<BusinessCalendarEntity | null> {
    return this.businessCalendarRepository.findOne({ where: { workspaceId } });
  }

  async findByWorkspaceIdOrFail(
    workspaceId: string,
  ): Promise<BusinessCalendarEntity> {
    const calendar = await this.findByWorkspaceId(workspaceId);

    if (!isDefined(calendar)) {
      throw new NotFoundException(
        `Business calendar not found for workspace ${workspaceId}`,
      );
    }

    return calendar;
  }

  async delete(workspaceId: string, requestingWorkspaceId: string): Promise<void> {
    if (workspaceId !== requestingWorkspaceId) {
      throw new UnauthorizedException(
        'Cannot delete business calendar for another workspace',
      );
    }

    await this.businessCalendarRepository.delete({ workspaceId });
  }

  /**
   * Returns true if `date` (a UTC instant) falls within the workspace's
   * configured business hours in the workspace's timezone, and is not a
   * holiday.
   */
  isBusinessTime(calendar: BusinessCalendarEntity, date: Date): boolean {
    const tz = calendar.timezone;
    const localDateStr = localDateString(date, tz);
    const isHoliday = calendar.holidays.some((h) => h.date === localDateStr);

    if (isHoliday) {
      return false;
    }

    const { weekday, hours, minutes } = getPartsInTz(date, tz);
    const dayName = DAY_NAMES[weekday];
    const daySchedule = calendar.weekSchedule[dayName];

    if (!isDefined(daySchedule)) {
      return false;
    }

    const [openHour, openMin] = daySchedule.open.split(':').map(Number);
    const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  /**
   * Returns the next UTC instant that is within business hours, advancing
   * day by day if necessary.  All comparisons are done in the workspace
   * timezone.
   */
  nextBusinessOpen(calendar: BusinessCalendarEntity, from: Date): Date {
    const tz = calendar.timezone;
    let candidate = new Date(from);

    for (let attempt = 0; attempt < 365; attempt++) {
      const localDateStr = localDateString(candidate, tz);
      const isHoliday = calendar.holidays.some((h) => h.date === localDateStr);
      const { year, month, day, weekday } = getPartsInTz(candidate, tz);
      const dayName = DAY_NAMES[weekday];
      const daySchedule = calendar.weekSchedule[dayName];

      if (isDefined(daySchedule) && !isHoliday) {
        const openUtc = localHhmToUtc(year, month, day, daySchedule.open, tz);
        const closeUtc = localHhmToUtc(year, month, day, daySchedule.close, tz);

        if (openUtc > from) {
          return openUtc;
        }

        if (candidate < closeUtc) {
          return candidate;
        }
      }

      // Advance to midnight of next local day in the target timezone.
      // We do this by adding 24h then snapping to midnight in local time.
      const next = new Date(candidate.getTime() + MS_PER_DAY);
      const { year: ny, month: nm, day: nd } = getPartsInTz(next, tz);

      candidate = localHhmToUtc(ny, nm, nd, '00:00', tz);
    }

    return candidate;
  }

  /**
   * Adds `businessDays` working days to `from` and returns the resulting UTC
   * instant at the start of business on that day.  All calculations respect
   * the workspace timezone and holiday list.
   */
  addBusinessDays(
    calendar: BusinessCalendarEntity,
    from: Date,
    businessDays: number,
  ): Date {
    if (businessDays <= 0) {
      return this.nextBusinessOpen(calendar, from);
    }

    const tz = calendar.timezone;
    let daysAdded = 0;

    // Start from the next local day.
    const fromParts = getPartsInTz(from, tz);
    let candidate = localHhmToUtc(
      fromParts.year,
      fromParts.month,
      fromParts.day + 1,
      '00:00',
      tz,
    );

    while (daysAdded < businessDays) {
      const localDateStr = localDateString(candidate, tz);
      const isHoliday = calendar.holidays.some((h) => h.date === localDateStr);
      const { weekday } = getPartsInTz(candidate, tz);
      const daySchedule = calendar.weekSchedule[DAY_NAMES[weekday]];

      if (isDefined(daySchedule) && !isHoliday) {
        daysAdded++;
      }

      if (daysAdded < businessDays) {
        const next = new Date(candidate.getTime() + MS_PER_DAY);
        const { year: ny, month: nm, day: nd } = getPartsInTz(next, tz);

        candidate = localHhmToUtc(ny, nm, nd, '00:00', tz);
      }
    }

    // Return the start of business on the target day.
    const { year, month, day, weekday } = getPartsInTz(candidate, tz);
    const daySchedule = calendar.weekSchedule[DAY_NAMES[weekday]];

    if (isDefined(daySchedule)) {
      return localHhmToUtc(year, month, day, daySchedule.open, tz);
    }

    return candidate;
  }

  /**
   * Returns the milliseconds until `targetDate`, clamped to 0 for past dates.
   */
  msUntil(targetDate: Date): number {
    return Math.max(0, targetDate.getTime() - Date.now());
  }
}
