import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState, useMemo } from 'react';
import { I18nManager, Text, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, Cairo_900Black } from '@expo-google-fonts/cairo';
import { Blaka_400Regular } from '@expo-google-fonts/blaka';

import { Platform } from 'react-native';

// Apply global font
if (Platform.OS === 'web') {
  // On web, React Native Web's default system fonts often override defaultProps. 
  // Injecting a global stylesheet guarantees Cairo is used everywhere.
  if (typeof document !== 'undefined') {
    document.documentElement.dir = 'rtl'; // Force Web DOM into RTL
    
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
      * {
        font-family: 'Cairo', sans-serif !important;
      }
    `;
    document.head.appendChild(style);
  }
} else {
  // On native (iOS/Android)
  // Safely apply default font using defaultProps instead of the unstable render monkey-patch
  interface TextWithDefaultProps { defaultProps?: { style?: any } }
  
  const TextComp = (Text as unknown) as TextWithDefaultProps;
  TextComp.defaultProps = TextComp.defaultProps || {};
  TextComp.defaultProps.style = [{ fontFamily: 'Cairo_600SemiBold' }];

  const TextInputComp = (TextInput as unknown) as TextWithDefaultProps;
  TextInputComp.defaultProps = TextInputComp.defaultProps || {};
  TextInputComp.defaultProps.style = [{ fontFamily: 'Cairo_600SemiBold' }];
}

import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthStore } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';
import CustomSplashScreen from '@/components/CustomSplashScreen';
import { CustomAlertProvider } from '@/contexts/CustomAlertContext';
import CardLinkPrompt from '@/components/CardLinkPrompt';
import { useLocationStore } from '@/store/location';

// Force RTL for Arabic
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);
  const [loaded, error] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_900Black,
    Blaka_400Regular,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  const restoreToken = useAuthStore(state => state.restoreToken);
  
  useEffect(() => {
    restoreToken();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Hide native splash screen quickly, because custom animated one is covering it
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CustomAlertProvider>
          <View style={{ flex: 1 }}>
            {loaded && <RootLayoutNav />}
            {(!loaded || !splashAnimationComplete) && (
              <View style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 99999 }]}>
                <CustomSplashScreen onAnimationComplete={() => setSplashAnimationComplete(true)} />
              </View>
            )}
          </View>
        </CustomAlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AuthRedirect() {
  const { user, isLoading } = useAuthStore(useShallow(state => ({ user: state.user, isLoading: state.isLoading })));
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'login' || segments[0] === 'register';
    const requireAuthRoutes = ['checkout', 'order'];
    const requiresAuth = segments.some(segment => requireAuthRoutes.includes(segment as string));
    
    if (!user && requiresAuth) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }

    if (user) {
      registerForPushNotificationsAsync();
    }
  }, [user, isLoading, segments]);

  return null;
}

function RootLayoutNav() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  // Silent startup routines (runs on every launch)
  useEffect(() => {
    const runStartupRoutines = async () => {
      try {
        if (Platform.OS === 'web') return;
        
        // Always try to fetch location on startup if we already have permission
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          useLocationStore.getState().requestAndSetLocation(false);
        }
      } catch (e) {
        console.warn('Startup routine error:', e);
      }
    };
    runStartupRoutines();
  }, []);

  // Request permissions on very first app launch
  useEffect(() => {
    const requestInitialPermissions = async () => {
      try {
        if (Platform.OS === 'web') return;
        const hasAsked = await AsyncStorage.getItem('has_asked_permissions_startup');
        if (hasAsked === 'true') return;

        // Ask for Location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Immediately fetch and save to the store so the Home page updates
          useLocationStore.getState().requestAndSetLocation(false);
        }
        
        // Ask for Notifications (this will also fetch the token and sync if granted)
        await registerForPushNotificationsAsync();

        await AsyncStorage.setItem('has_asked_permissions_startup', 'true');
      } catch (e) {
        console.log('Error requesting initial permissions:', e);
      }
    };

    requestInitialPermissions();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.order_id) {
        setTimeout(() => {
          router.push(`/order/${data.order_id}`);
        }, 500);
      }
    });

    return () => {
      responseListener.remove();
    };
  }, []);

  const customTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surfaceAlt,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: { fontFamily: 'Cairo_600SemiBold', fontWeight: '400' as const },
      medium: { fontFamily: 'Cairo_700Bold', fontWeight: '500' as const },
      bold: { fontFamily: 'Cairo_900Black', fontWeight: '700' as const },
      heavy: { fontFamily: 'Cairo_900Black', fontWeight: '900' as const },
    },
  }), [isDark, colors]);

  return (
    <ThemeProvider value={customTheme}>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="products" />
        <Stack.Screen name="product/[id]" options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="register" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
      </Stack>
      <CardLinkPrompt />
    </ThemeProvider>
  );
}
