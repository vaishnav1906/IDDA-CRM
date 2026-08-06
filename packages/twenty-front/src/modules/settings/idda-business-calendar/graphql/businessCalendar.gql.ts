import { gql } from '@apollo/client';

export const BUSINESS_CALENDAR_FRAGMENT = gql`
  fragment BusinessCalendarFields on BusinessCalendar {
    id
    workspaceId
    timezone
    weekSchedule
    holidays
    slaSlaTargetMinutes
    createdAt
    updatedAt
  }
`;

export const GET_BUSINESS_CALENDAR = gql`
  ${BUSINESS_CALENDAR_FRAGMENT}
  query GetBusinessCalendar {
    businessCalendar {
      ...BusinessCalendarFields
    }
  }
`;

export const UPSERT_BUSINESS_CALENDAR = gql`
  ${BUSINESS_CALENDAR_FRAGMENT}
  mutation UpsertBusinessCalendar($input: UpsertBusinessCalendarInput!) {
    upsertBusinessCalendar(input: $input) {
      ...BusinessCalendarFields
    }
  }
`;

export const DELETE_BUSINESS_CALENDAR = gql`
  mutation DeleteBusinessCalendar {
    deleteBusinessCalendar
  }
`;
