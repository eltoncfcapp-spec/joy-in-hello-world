import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';

// VAPID public key for push subscriptions
const VAPID_PUBLIC_KEY = 'BGsjSHlYAj8OQGFiZScr0QJLc2yduNZ9UmLeXYf4dbEqfRQfvmMktRazaYySHSZHSQhsarql1PKPXayRvEU8n0I';

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
}

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
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
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
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
        // Check both database and actual push subscription
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint')
          .eq('member_id', memberId)
          .maybeSingle();

        // Also check if browser has active subscription
        let hasActiveSubscription = false;
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          hasActiveSubscription = !!subscription;
        }

        setState(prev => ({
          ...prev,
          isSubscribed: !!data && hasActiveSubscription,
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

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!memberId || !state.isSupported) return false;

    try {
      // Request permission first
      const granted = await requestPermission();
      if (!granted) return false;

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications with VAPID key
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      console.log('Push subscription created:', subscription);

      // Extract subscription details
      const subscriptionJSON = subscription.toJSON();
      const endpoint = subscriptionJSON.endpoint || '';
      const p256dh = subscriptionJSON.keys?.p256dh || '';
      const auth = subscriptionJSON.keys?.auth || '';

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          member_id: memberId,
          endpoint,
          p256dh,
          auth
        }, { onConflict: 'endpoint' });

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: true }));
      
      // Show confirmation notification
      registration.showNotification('Notifications Enabled', {
        body: 'You will now receive event reminders and announcements even when the app is closed.',
        icon: '/church-icon-192.png',
        tag: 'subscription-confirmed'
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  }, [memberId, state.isSupported, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!memberId) return false;

    try {
      // Unsubscribe from push manager
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove from database
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
