import { useEffect, useState } from 'react';

import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { VisitVerifyButton } from '@/visit-verification/components/VisitVerifyButton';

type VisitVerifyButtonContainerProps = {
  objectRecordId: string;
};

type VisitRecord = {
  __typename: string;
  id: string;
  clinicId?: string | null;
};

export const VisitVerifyButtonContainer = ({
  objectRecordId,
}: VisitVerifyButtonContainerProps) => {
  const [clinicId, setClinicId] = useState<string | null>(null);

  const { findOneRecord } = useLazyFindOneRecord<VisitRecord>({
    objectNameSingular: 'visit',
    recordGqlFields: { id: true, clinicId: true },
  });

  useEffect(() => {
    findOneRecord({
      objectRecordId,
      onCompleted: (record) => {
        setClinicId(record.clinicId ?? null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectRecordId]);

  // Don't render until we have the clinic ID — the orchestrator needs it for GPS check
  if (!clinicId) return null;

  return (
    <VisitVerifyButton
      objectRecordId={objectRecordId}
      clinicId={clinicId}
    />
  );
};
