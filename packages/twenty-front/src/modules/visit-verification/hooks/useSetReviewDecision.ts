import { useMutation } from '@apollo/client/react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

import { SET_VISIT_REVIEW_DECISION } from '../graphql/visitReviewOperations';

type SetReviewDecisionInput = {
  visitId: string;
  decision: string;
  reviewComment?: string;
};

type SetReviewDecisionOutput = {
  visitId: string;
  reviewDecision: string;
  reviewComment: string | null;
};

type MutationResult = {
  setVisitReviewDecision: SetReviewDecisionOutput;
};

export const useSetReviewDecision = () => {
  const coreClient = useApolloCoreClient();

  const [mutate, { loading, error }] = useMutation<
    MutationResult,
    { input: SetReviewDecisionInput }
  >(SET_VISIT_REVIEW_DECISION, { client: coreClient });

  const setReviewDecision = async (
    input: SetReviewDecisionInput,
  ): Promise<SetReviewDecisionOutput> => {
    const result = await mutate({ variables: { input } });

    if (!result.data) {
      throw new Error('No data returned from setVisitReviewDecision');
    }

    return result.data.setVisitReviewDecision;
  };

  return { setReviewDecision, loading, error };
};
