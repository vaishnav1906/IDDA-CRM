import { useMutation } from '@apollo/client/react';

import {
  GET_BUSINESS_CALENDAR,
  UPSERT_BUSINESS_CALENDAR,
} from '@/settings/idda-business-calendar/graphql/businessCalendar.gql';
import { type BusinessCalendar } from '@/settings/idda-business-calendar/types/businessCalendar.type';

type UpsertBusinessCalendarInput = {
  timezone?: string;
  weekSchedule?: unknown;
  holidays?: unknown;
  slaSlaTargetMinutes?: number;
};

type UpsertBusinessCalendarData = {
  upsertBusinessCalendar: BusinessCalendar;
};

export const useUpsertBusinessCalendar = () => {
  const [mutate, { loading, error }] = useMutation<
    UpsertBusinessCalendarData,
    { input: UpsertBusinessCalendarInput }
  >(UPSERT_BUSINESS_CALENDAR, {
    refetchQueries: [{ query: GET_BUSINESS_CALENDAR }],
  });

  const upsertBusinessCalendar = async (input: UpsertBusinessCalendarInput) => {
    const result = await mutate({ variables: { input } });

    return result.data?.upsertBusinessCalendar ?? null;
  };

  return { upsertBusinessCalendar, loading, error };
};
