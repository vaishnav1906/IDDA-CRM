import { useEffect } from 'react';

import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { IconBell, IconCheck } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { AnimatePresence, motion } from 'framer-motion';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { EnablePushNotificationsButton } from '@/notification/components/EnablePushNotificationsButton';
import { usePushNotifications } from '@/notification/hooks/usePushNotifications';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const GET_NOTIFICATIONS = gql`
  query GetIddaNotifications($recipientId: ID!) {
    inAppNotifications(
      filter: { recipientId: { eq: $recipientId } }
      orderBy: { createdAt: DescNullsLast }
      first: 50
    ) {
      edges {
        node {
          id
          title
          body
          isRead
          notificationType
          actionUrl
          createdAt
        }
      }
      totalCount
    }
  }
`;

const MARK_AS_READ = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    updateInAppNotification(id: $id, input: { isRead: true }) {
      id
      isRead
    }
  }
`;

const MARK_ALL_AS_READ = gql`
  mutation MarkAllNotificationsAsRead($recipientId: ID!) {
    updateInAppNotifications(
      filter: { isRead: { eq: false }, recipientId: { eq: $recipientId } }
      input: { isRead: true }
    ) {
      id
      isRead
    }
  }
`;

type NotificationNode = {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  notificationType: string;
  actionUrl: string | null;
  createdAt: string;
};

type NotificationsData = {
  inAppNotifications: {
    edges: { node: NotificationNode }[];
    totalCount: number;
  };
};

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledHeaderActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledItem = styled(motion.div)`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-left: 3px solid ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  transition: background 0.15s ease;

  &[data-read='true'] {
    background: ${themeCssVariables.background.primary};
    border-left: 3px solid transparent;
  }

  &:hover {
    background: ${themeCssVariables.background.tertiary};
  }
`;

const StyledItemTitle = styled.span`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  color: ${themeCssVariables.font.color.primary};

  &[data-read='true'] {
    color: ${themeCssVariables.font.color.secondary};
    font-weight: ${themeCssVariables.font.weight.regular};
  }
`;

const StyledItemBody = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledItemMeta = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
  margin-top: ${themeCssVariables.spacing[1]};
`;

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: center;
  padding: ${themeCssVariables.spacing[12]} 0;
`;

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;

  return 'Just now';
};

export const IddaNotificationsPage = () => {
  const navigate = useNavigate();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const recipientId = currentWorkspaceMember?.id ?? '';
  const { requestPermissionAndSubscribe, currentPermission, isSupported } =
    usePushNotifications();

  // Silently re-register the push subscription when permission was already
  // granted (e.g. after a page reload or browser restart).
  useEffect(() => {
    if (isSupported && currentPermission === 'granted') {
      requestPermissionAndSubscribe().catch(() => {
        // best-effort — ignore errors (user may have revoked in OS settings)
      });
    }
  }, [isSupported, currentPermission, requestPermissionAndSubscribe]);

  const { data, refetch } = useQuery<NotificationsData>(GET_NOTIFICATIONS, {
    variables: { recipientId },
    skip: !recipientId,
    fetchPolicy: 'cache-and-network',
  });

  const [markAsRead] = useMutation(MARK_AS_READ, {
    onCompleted: () => refetch(),
  });

  const [markAllAsRead, { loading: markingAll }] = useMutation(
    MARK_ALL_AS_READ,
    { onCompleted: () => refetch() },
  );

  const notifications =
    data?.inAppNotifications?.edges?.map((e) => e.node) ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleItemClick = async (n: NotificationNode) => {
    if (!n.isRead) {
      await markAsRead({ variables: { id: n.id } });
    }
    if (isDefined(n.actionUrl) && n.actionUrl !== '') {
      navigate(n.actionUrl);
    }
  };

  return (
    <StyledPage>
      <StyledHeader>
        <H2Title
          title={t`Notifications`}
          description={
            unreadCount > 0
              ? t`${unreadCount} unread`
              : t`All caught up`
          }
        />
        <StyledHeaderActions>
          <EnablePushNotificationsButton />
          {unreadCount > 0 && (
            <Button
              title={t`Mark all as read`}
              Icon={IconCheck}
              size="small"
              variant="secondary"
              onClick={() => markAllAsRead({ variables: { recipientId } })}
              disabled={markingAll}
            />
          )}
        </StyledHeaderActions>
      </StyledHeader>

      {notifications.length === 0 ? (
        <StyledEmpty>
          <IconBell size={40} />
          <span>{t`No notifications yet`}</span>
        </StyledEmpty>
      ) : (
        <StyledList>
          <AnimatePresence initial={false}>
            {notifications.map((n) => (
              <StyledItem
                key={n.id}
                data-read={String(n.isRead)}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => handleItemClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') handleItemClick(n);
                }}
                aria-label={n.title}
              >
                <StyledItemTitle data-read={String(n.isRead)}>
                  {n.title}
                </StyledItemTitle>
                {isDefined(n.body) && n.body !== '' && (
                  <StyledItemBody>{n.body}</StyledItemBody>
                )}
                <StyledItemMeta>
                  {formatRelativeTime(n.createdAt)}
                </StyledItemMeta>
              </StyledItem>
            ))}
          </AnimatePresence>
        </StyledList>
      )}
    </StyledPage>
  );
};
