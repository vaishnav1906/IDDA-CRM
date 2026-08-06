import { useCallback } from 'react';

import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

import { REACT_APP_VAPID_PUBLIC_KEY } from '~/config';

const SUBSCRIBE_MUTATION = gql`
  mutation SubscribeToPushNotifications(
    $endpoint: String!
    $p256dhKey: String!
    $authKey: String!
  ) {
    subscribeToPushNotifications(
      endpoint: $endpoint
      p256dhKey: $p256dhKey
      authKey: $authKey
    )
  }
`;

const UNSUBSCRIBE_MUTATION = gql`
  mutation UnsubscribeFromPushNotifications($endpoint: String!) {
    unsubscribeFromPushNotifications(endpoint: $endpoint)
  }
`;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = atob(base64);

  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const usePushNotifications = () => {
  const [subscribe] = useMutation(SUBSCRIBE_MUTATION);
  const [unsubscribe] = useMutation(UNSUBSCRIBE_MUTATION);

  const requestPermissionAndSubscribe = useCallback(async (): Promise<
    'granted' | 'denied' | 'unsupported'
  > => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported';
    }
    if (!REACT_APP_VAPID_PUBLIC_KEY) return 'unsupported';

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') return 'denied';

    const reg = await navigator.serviceWorker.register('/sw.js');

    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          REACT_APP_VAPID_PUBLIC_KEY,
        ).buffer as ArrayBuffer,
      });
    }

    const json = sub.toJSON();

    await subscribe({
      variables: {
        endpoint: sub.endpoint,
        p256dhKey: json.keys?.p256dh ?? '',
        authKey: json.keys?.auth ?? '',
      },
    });

    return 'granted';
  }, [subscribe]);

  const unsubscribeFromPush = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');

    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();

    if (!sub) return;
    const endpoint = sub.endpoint;

    await sub.unsubscribe();
    await unsubscribe({ variables: { endpoint } });
  }, [unsubscribe]);

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const currentPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';

  return {
    requestPermissionAndSubscribe,
    unsubscribeFromPush,
    isSupported,
    currentPermission,
  };
};
