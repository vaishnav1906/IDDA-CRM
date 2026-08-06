import { useEffect, useState } from 'react';

import { useDecisionRegisterApi } from '@/decision-register/hooks/useDecisionRegisterApi';
import { DecisionThreadSection } from '@/decision-register/components/DecisionThreadSection';

type Props = {
  decisionId: string;
};

type Perms = {
  userId: string;
  canApprove: boolean;
};

export const DecisionNativeThreadSection = ({ decisionId }: Props) => {
  const { getPermissions } = useDecisionRegisterApi();
  const [perms, setPerms] = useState<Perms | null>(null);

  useEffect(() => {
    getPermissions()
      .then(({ userId, canApprove }) => setPerms({ userId, canApprove }))
      .catch(() => setPerms({ userId: '', canApprove: false }));
  }, [getPermissions]);

  if (!perms) return null;

  return (
    <DecisionThreadSection
      decisionId={decisionId}
      currentUserId={perms.userId}
      canModerate={perms.canApprove}
    />
  );
};
