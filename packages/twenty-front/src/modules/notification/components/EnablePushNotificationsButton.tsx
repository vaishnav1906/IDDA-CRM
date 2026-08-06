import { useState } from 'react';

import { IconBell } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';

import { usePushNotifications } from '@/notification/hooks/usePushNotifications';

export const EnablePushNotificationsButton = () => {
  const { requestPermissionAndSubscribe, isSupported, currentPermission } =
    usePushNotifications();
  const [status, setStatus] = useState<string | null>(null);

  if (!isSupported || currentPermission === 'granted') return null;

  const handleClick = async () => {
    const result = await requestPermissionAndSubscribe();

    setStatus(result);
  };

  return (
    <Button
      title={status === 'denied' ? 'Permission denied' : 'Enable Notifications'}
      Icon={IconBell}
      variant="secondary"
      size="small"
      onClick={handleClick}
      disabled={status === 'denied'}
    />
  );
};
