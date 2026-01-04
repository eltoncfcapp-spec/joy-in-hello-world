import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useNotifications(memberId?: string) {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true
  });

  // Check if notifications are supported
  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied'
    }));
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!memberId) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('member_id', memberId)
          .maybeSingle();

        setState(prev => ({
          ...prev,
          isSubscribed: !!data,
          isLoading: false
        }));
      } catch (error) {
        console.error('Error checking subscription:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, [memberId]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [state.isSupported]);

  // Subscribe to notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!memberId || !state.isSupported) return false;

    try {
      // Request permission first
      const granted = await requestPermission();
      if (!granted) return false;

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Create a simple subscription record
      const subscriptionData = {
        member_id: memberId,
        endpoint: `browser-${memberId}-${Date.now()}`,
        p256dh: 'browser-notification',
        auth: 'enabled'
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, { onConflict: 'endpoint' });

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: true }));
      
      // Show confirmation notification
      if (registration.showNotification) {
        registration.showNotification('Notifications Enabled', {
          body: 'You will now receive event reminders and announcements.',
          icon: '/church-icon-192.png',
          tag: 'subscription-confirmed'
        });
      }

      return true;
    } catch (error) {
      console.error('Error subscribing:', error);
      return false;
    }
  }, [memberId, state.isSupported, requestPermission]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!memberId) return false;

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('member_id', memberId);

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: false }));
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }, [memberId]);

  // Send local notification (for testing/immediate notifications)
  const sendLocalNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!state.isSupported || state.permission !== 'granted') return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/church-icon-192.png',
        badge: '/church-icon-72.png',
        ...options
      });
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [state.isSupported, state.permission]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification
  };
}
