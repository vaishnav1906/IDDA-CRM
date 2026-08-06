import { styled } from '@linaria/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { tokenPairState } from '@/auth/states/tokenPairState';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const POLL_INTERVAL_MS = 30_000;

type NotificationItem = { id: string; title: string; actionUrl: string | null };

const StyledBadge = styled.span`
  align-items: center;
  background: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: white;
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 16px;
  justify-content: center;
  min-width: 16px;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

export const IddaNotificationBell = () => {
  const tokenPair = useAtomStateValue(tokenPairState);
  const accessToken = tokenPair?.accessOrWorkspaceAgnosticToken?.token;
  const { enqueueInfoSnackBar } = useSnackBar();

  const [count, setCount] = useState(0);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const fetchCount = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch('/api/idda/notifications/unread-count', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data: { count: number; notifications: NotificationItem[] } = await res.json();

      setCount(data.count ?? 0);

      if (initializedRef.current) {
        const newOnes = data.notifications.filter(
          (n) => !seenIdsRef.current.has(n.id),
        );
        for (const n of newOnes) {
          enqueueInfoSnackBar({ message: n.title });
          const audio = new Audio('/notification.wav');
          audio.play().catch(() => {});
        }
      }

      data.notifications.forEach((n) => seenIdsRef.current.add(n.id));
      initializedRef.current = true;
    } catch {
      // silently ignore
    }
  }, [accessToken, enqueueInfoSnackBar]);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  if (count === 0) return null;

  return (
    <StyledBadge aria-label={`${count} unread notifications`}>
      {count > 99 ? '99+' : count}
    </StyledBadge>
  );
};
