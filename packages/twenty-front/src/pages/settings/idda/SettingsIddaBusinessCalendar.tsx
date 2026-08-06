import { useState, useEffect } from 'react';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { isDefined } from 'twenty-shared/utils';
import { IconCalendar } from 'twenty-ui/icon';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { Button } from 'twenty-ui/input';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';

import { useBusinessCalendar } from '@/settings/idda-business-calendar/hooks/useBusinessCalendar';
import { useUpsertBusinessCalendar } from '@/settings/idda-business-calendar/hooks/useUpsertBusinessCalendar';
import { BusinessCalendarWeekSchedule } from '@/settings/idda-business-calendar/components/BusinessCalendarWeekSchedule';
import { BusinessCalendarHolidayList } from '@/settings/idda-business-calendar/components/BusinessCalendarHolidayList';
import {
  type BusinessWeekSchedule,
  type BusinessHoliday,
  DEFAULT_WEEK_SCHEDULE,
} from '@/settings/idda-business-calendar/types/businessCalendar.type';

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8)' },
];

const SLA_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours (1 day)' },
  { value: 1440, label: '1 day (24h)' },
  { value: 2880, label: '2 days' },
];

export const SettingsIddaBusinessCalendar = () => {
  const { t } = useLingui();
  const { businessCalendar, loading } = useBusinessCalendar();
  const { upsertBusinessCalendar, loading: saving } = useUpsertBusinessCalendar();

  const [timezone, setTimezone] = useState('UTC');
  const [weekSchedule, setWeekSchedule] =
    useState<BusinessWeekSchedule>(DEFAULT_WEEK_SCHEDULE);
  const [holidays, setHolidays] = useState<BusinessHoliday[]>([]);
  const [slaSlaTargetMinutes, setSlaSlaTargetMinutes] = useState(480);

  useEffect(() => {
    if (!isDefined(businessCalendar)) return;
    setTimezone(businessCalendar.timezone);
    setWeekSchedule(businessCalendar.weekSchedule);
    setHolidays(businessCalendar.holidays ?? []);
    setSlaSlaTargetMinutes(businessCalendar.slaSlaTargetMinutes ?? 480);
  }, [businessCalendar]);

  const handleSave = async () => {
    await upsertBusinessCalendar({
      timezone,
      weekSchedule,
      holidays,
      slaSlaTargetMinutes,
    });
  };

  return (
    <SettingsPageLayout
      title={t`Business Calendar`}
      icon={<IconCalendar />}
      links={[
        {
          children: t`Workspace`,
          href: getSettingsPath(SettingsPath.General),
        },
        { children: t`Business Calendar` },
      ]}
      actionButton={
        <Button
          title={t`Save`}
          variant="primary"
          accent="blue"
          size="small"
          onClick={handleSave}
          disabled={loading || saving}
        />
      }
    >
      <SettingsPageContainer>
        <Section>
          <H2Title
            title={t`Timezone`}
            description={t`All business hour calculations use this timezone.`}
          />
          <Select
            dropdownId="business-calendar-timezone"
            options={TIMEZONE_OPTIONS}
            value={timezone}
            onChange={setTimezone}
            dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
          />
        </Section>

        <Section>
          <H2Title
            title={t`Working Hours`}
            description={t`Toggle days on or off and set open / close times.`}
          />
          <BusinessCalendarWeekSchedule
            schedule={weekSchedule}
            onChange={setWeekSchedule}
          />
        </Section>

        <Section>
          <H2Title
            title={t`Holidays`}
            description={t`Dates excluded from SLA and business-day calculations.`}
          />
          <BusinessCalendarHolidayList
            holidays={holidays}
            onChange={setHolidays}
          />
        </Section>

        <Section>
          <H2Title
            title={t`Default SLA Target`}
            description={t`Fallback SLA window used when no priority is specified.`}
          />
          <Select
            dropdownId="business-calendar-sla"
            options={SLA_OPTIONS.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
            value={String(slaSlaTargetMinutes)}
            onChange={(v) => setSlaSlaTargetMinutes(Number(v))}
            dropdownWidth={GenericDropdownContentWidth.Large}
          />
        </Section>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
