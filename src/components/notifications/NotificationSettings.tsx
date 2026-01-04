import { Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationSettingsProps {
  memberId?: string;
}

export function NotificationSettings({ memberId }: NotificationSettingsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe
  } = useNotifications(memberId);

  if (!isSupported) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Notifications Not Supported</p>
            <p className="text-sm text-muted-foreground">
              Your browser doesn't support push notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-foreground">Notifications Blocked</p>
            <p className="text-sm text-muted-foreground">
              Please enable notifications in your browser settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="p-2 bg-primary/10 rounded-full">
              <Bell className="h-5 w-5 text-primary" />
            </div>
          ) : (
            <div className="p-2 bg-muted rounded-full">
              <BellOff className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed 
                ? 'You will receive event reminders and announcements' 
                : 'Get notified about events and announcements'}
            </p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isSubscribed
              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading...
            </span>
          ) : isSubscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </button>
      </div>

      {isSubscribed && (
        <div className="mt-3 flex items-center gap-2 text-sm text-primary">
          <CheckCircle className="h-4 w-4" />
          <span>Notifications are enabled</span>
        </div>
      )}
    </div>
  );
}
