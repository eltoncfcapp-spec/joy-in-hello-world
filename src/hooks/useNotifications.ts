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

  // Register service worker and auto-subscribe if permission granted
  useEffect(() => {
    const initServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
        
        // Auto-subscribe if permission already granted
        if (Notification.permission === 'granted') {
          await autoSubscribe(registration);
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    initServiceWorker();
  }, []);

  // Auto subscribe function - works without memberId
  const autoSubscribe = async (registration: ServiceWorkerRegistration) => {
    try {
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        // Verify it's in database
        const subscriptionJSON = existingSubscription.toJSON();
        const endpoint = subscriptionJSON.endpoint || '';
        
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', endpoint)
          .maybeSingle();
        
        if (data) {
          setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
          return;
        }
      }

      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subscriptionJSON = subscription.toJSON();
      const endpoint = subscriptionJSON.endpoint || '';
      const p256dh = subscriptionJSON.keys?.p256dh || '';
      const auth = subscriptionJSON.keys?.auth || '';

      // Save to database (member_id is optional now)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          member_id: memberId || null,
          endpoint,
          p256dh,
          auth
        }, { onConflict: 'endpoint' });

      if (error) {
        console.error('Error saving subscription:', error);
      } else {
        console.log('Push subscription saved to database');
        setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      }
    } catch (error) {
      console.error('Auto-subscribe error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          const subscriptionJSON = subscription.toJSON();
          const endpoint = subscriptionJSON.endpoint || '';
          
          const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', endpoint)
            .maybeSingle();
          
          setState(prev => ({
            ...prev,
            isSubscribed: !!data,
            isLoading: false
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();
  }, []);

  // Request notification permission and auto-subscribe
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        await autoSubscribe(registration);
      }
      
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [state.isSupported, memberId]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    try {
      const granted = await requestPermission();
      if (!granted) return false;

      const registration = await navigator.serviceWorker.ready;
      await autoSubscribe(registration);
      
      // Show confirmation notification
      registration.showNotification('Notifications Enabled', {
        body: 'You will receive event reminders and updates.',
        icon: '/church-icon-192.png',
        tag: 'subscription-confirmed'
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  }, [state.isSupported, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          const subscriptionJSON = subscription.toJSON();
          const endpoint = subscriptionJSON.endpoint || '';
          
          await subscription.unsubscribe();
          
          // Remove from database by endpoint
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);
        }
      }

      setState(prev => ({ ...prev, isSubscribed: false }));
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }, []);

  // Send local notification (for immediate notifications)
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
