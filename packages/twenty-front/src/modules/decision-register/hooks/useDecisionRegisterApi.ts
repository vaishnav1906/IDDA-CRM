import { useCallback } from 'react';

import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import {
  CreateDecisionInput,
  Decision,
  DecisionComment,
  ListDecisionsResponse,
  UpdateDecisionInput,
} from '@/decision-register/types/decision.type';

type ListParams = {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

export const useDecisionRegisterApi = () => {
  const tokenPair = useAtomStateValue(tokenPairState);
  const accessToken = tokenPair?.accessOrWorkspaceAgnosticToken?.token ?? '';

  const headers = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  const baseUrl = `${REACT_APP_SERVER_BASE_URL}/rest/decision-register`;

  const listDecisions = useCallback(
    async (params: ListParams = {}): Promise<ListDecisionsResponse> => {
      const searchParams = new URLSearchParams();

      if (params.search) searchParams.set('search', params.search);
      if (params.category) searchParams.set('category', params.category);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

      const qs = searchParams.toString();
      const res = await fetch(`${baseUrl}${qs ? `?${qs}` : ''}`, {
        headers: headers(),
      });

      if (!res.ok) throw new Error(`Failed to list decisions: ${res.status}`);

      return res.json() as Promise<ListDecisionsResponse>;
    },
    [baseUrl, headers],
  );

  const getDecision = useCallback(
    async (id: string): Promise<Decision> => {
      const res = await fetch(`${baseUrl}/${id}`, { headers: headers() });

      if (!res.ok) throw new Error(`Decision not found: ${res.status}`);

      return res.json() as Promise<Decision>;
    },
    [baseUrl, headers],
  );

  const getPermissions = useCallback(
    async (): Promise<{ userId: string; canApprove: boolean; userName: string; role: string; userEmail: string }> => {
      const res = await fetch(`${baseUrl}/me/permissions`, { headers: headers() });
      if (!res.ok) throw new Error(`Failed to load permissions: ${res.status}`);
      return res.json();
    },
    [baseUrl, headers],
  );

  const createDecision = useCallback(
    async (input: CreateDecisionInput): Promise<Decision> => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error(`Failed to create decision: ${res.status}`);

      return res.json() as Promise<Decision>;
    },
    [baseUrl, headers],
  );

  const updateDecision = useCallback(
    async (id: string, input: UpdateDecisionInput): Promise<Decision> => {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(input),
      });

      if (!res.ok) throw new Error(`Failed to update decision: ${res.status}`);

      return res.json() as Promise<Decision>;
    },
    [baseUrl, headers],
  );

  const deleteDecision = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });

      if (!res.ok) throw new Error(`Failed to delete decision: ${res.status}`);
    },
    [baseUrl, headers],
  );

  const listComments = useCallback(
    async (decisionId: string): Promise<DecisionComment[]> => {
      const res = await fetch(`${baseUrl}/${decisionId}/comments`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error(`Failed to load comments: ${res.status}`);
      return res.json() as Promise<DecisionComment[]>;
    },
    [baseUrl, headers],
  );

  const addComment = useCallback(
    async (decisionId: string, body: string, parentId?: string): Promise<DecisionComment> => {
      const res = await fetch(`${baseUrl}/${decisionId}/comments`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ body, parentId }),
      });
      if (!res.ok) throw new Error(`Failed to post comment: ${res.status}`);
      return res.json() as Promise<DecisionComment>;
    },
    [baseUrl, headers],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      const res = await fetch(`${baseUrl}/comments/${commentId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (!res.ok) throw new Error(`Failed to delete comment: ${res.status}`);
    },
    [baseUrl, headers],
  );

  return {
    listDecisions,
    getDecision,
    getPermissions,
    createDecision,
    updateDecision,
    deleteDecision,
    listComments,
    addComment,
    deleteComment,
  };
};
