import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';
import * as SecureStore from 'expo-secure-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function savePushToken(token: string): Promise<void> {
  try {
    const savedToken = await SecureStore.getItemAsync('push_token');
    
    // Always try to sync with backend if we have a token, 
    // because the user might have just logged in
    try {
      await api.post('/user/push-token', { token });
    } catch (apiError) {
      // Silently fail if not logged in (401) or network error
      console.log('Could not sync push token with backend (might not be logged in yet)');
    }

    if (savedToken !== token) {
      console.log('Push token:', token);
      await SecureStore.setItemAsync('push_token', token);
    }
  } catch (e) {
    console.error('Failed to save push token', e);
  }
}

export async function syncPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync('push_token');
    if (token) {
      await api.post('/user/push-token', { token });
    }
  } catch (e) {
    console.log('Could not sync push token with backend');
  }
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    console.log('Push notifications are not supported on web in this app.');
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Expo project ID should ideally be fetched from app.json
    token = (await Notifications.getExpoPushTokenAsync()).data;
    
    if (token) {
      await savePushToken(token);
    }
    
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
