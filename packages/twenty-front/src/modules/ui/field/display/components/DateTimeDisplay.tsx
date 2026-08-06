import { type FieldDateMetadataSettings, FieldDateDisplayFormat } from '@/object-record/record-field/ui/types/FieldMetadata';
import { TimeZoneAbbreviation } from '@/ui/input/components/internal/date/components/TimeZoneAbbreviation';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { UserContext } from '@/users/contexts/UserContext';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { useContext, useEffect, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { dateLocaleState } from '~/localization/states/dateLocaleState';
import { formatDateTimeString } from '~/utils/string/formatDateTimeString';
import { EllipsisDisplay } from './EllipsisDisplay';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTimeZoneSpacer = styled.span`
  min-width: ${themeCssVariables.spacing[1]};
`;

type DateTimeDisplayProps = {
  value: string | null | undefined;
  dateFieldSettings?: FieldDateMetadataSettings;
};

export const DateTimeDisplay = ({
  value,
  dateFieldSettings,
}: DateTimeDisplayProps) => {
  const { dateFormat, timeFormat, timeZone } = useContext(UserContext);
  const dateLocale = useAtomStateValue(dateLocaleState);

  const isRelative = dateFieldSettings?.displayFormat === FieldDateDisplayFormat.RELATIVE;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isRelative || !value) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [isRelative, value]);

  const formattedDate = formatDateTimeString({
    value,
    timeZone,
    dateFormat,
    timeFormat,
    dateFieldSettings,
    localeCatalog: dateLocale.localeCatalog,
  });

  return (
    <EllipsisDisplay>
      {formattedDate}
      <span></span>
      {isNonEmptyString(value) && (
        <>
          <StyledTimeZoneSpacer />
          <TimeZoneAbbreviation instant={Temporal.Instant.from(value)} />
        </>
      )}
    </EllipsisDisplay>
  );
};
