import { useQuery } from '@apollo/client/react';

import { GET_BUSINESS_CALENDAR } from '@/settings/idda-business-calendar/graphql/businessCalendar.gql';
import { type BusinessCalendar } from '@/settings/idda-business-calendar/types/businessCalendar.type';

type GetBusinessCalendarData = {
  businessCalendar: BusinessCalendar | null;
};

export const useBusinessCalendar = () => {
  const { data, loading, error, refetch } = useQuery<GetBusinessCalendarData>(
    GET_BUSINESS_CALENDAR,
    { fetchPolicy: 'cache-and-network' },
  );

  return {
    businessCalendar: data?.businessCalendar ?? null,
    loading,
    error,
    refetch,
  };
};
