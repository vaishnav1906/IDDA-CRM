import { useCallback, useState } from 'react';

import { FullScreenModal } from '@/ui/layout/fullscreen/components/FullScreenModal';
import { VisitVerificationFlow } from '@/visit-verification/components/VisitVerificationFlow';
import { type VerifyVisitOutput } from '@/visit-verification/types/visitVerification.types';
import { Button } from 'twenty-ui/input';

type VisitVerifyButtonProps = {
  objectRecordId: string;
  clinicId: string;
};

export const VisitVerifyButton = ({
  objectRecordId,
  clinicId,
}: VisitVerifyButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleComplete = useCallback(
    (_result: VerifyVisitOutput) => {
      setIsOpen(false);
    },
    [],
  );

  return (
    <>
      <Button
        title="Verify Visit"
        Icon={undefined}
        variant="primary"
        size="small"
        onClick={() => setIsOpen(true)}
      />

      {isOpen && (
        <FullScreenModal
          links={[{ children: 'Verify Visit' }]}
          onClose={() => setIsOpen(false)}
        >
          <VisitVerificationFlow
            visitId={objectRecordId}
            clinicId={clinicId}
            onComplete={handleComplete}
            onCancel={() => setIsOpen(false)}
          />
        </FullScreenModal>
      )}
    </>
  );
};
