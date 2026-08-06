export type BusinessDayHours = {
  open: string;
  close: string;
};

export type BusinessWeekSchedule = {
  monday: BusinessDayHours | null;
  tuesday: BusinessDayHours | null;
  wednesday: BusinessDayHours | null;
  thursday: BusinessDayHours | null;
  friday: BusinessDayHours | null;
  saturday: BusinessDayHours | null;
  sunday: BusinessDayHours | null;
};

export type BusinessHoliday = {
  date: string;
  name: string;
};

export type BusinessCalendar = {
  id: string;
  workspaceId: string;
  timezone: string;
  weekSchedule: BusinessWeekSchedule;
  holidays: BusinessHoliday[];
  slaSlaTargetMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_WEEK_SCHEDULE: BusinessWeekSchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
};

export const DAY_LABELS: { key: keyof BusinessWeekSchedule; label: string }[] =
  [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];
