import React, { useEffect } from 'react';
import { Tabs, useSegments, useRouter, Link } from 'expo-router';
import { Home, LayoutGrid, ShoppingCart, Clock, User } from 'lucide-react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, Pressable, View, Text, StyleSheet, Dimensions, I18nManager, Modal } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useCartStore } from '@/store/cart';
import CartOverlay from '@/components/CartOverlay';

function TabBarBackground({ bgColor, borderColor }: { bgColor: string, borderColor: string }) {
  const segments = useSegments();
  
  const currentTab = segments.length > 1 ? (segments as string[])[1] : 'index';
  
  const tabOrder = ['index', 'categories', 'cart', 'account'];
  let activeIndex = tabOrder.indexOf(currentTab as string);
  if (activeIndex === -1) activeIndex = 0;

  const { width } = Dimensions.get('window');
  const tabWidth = (width - 40) / 4;

  const translateX = useSharedValue(0);

  useEffect(() => {
    const direction = I18nManager.isRTL ? -1 : 1;
    translateX.value = withSpring(activeIndex * tabWidth * direction, { 
      damping: 26, 
      stiffness: 250,
      mass: 0.8
    });
  }, [activeIndex, tabWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { 
      backgroundColor: bgColor, 
      borderRadius: 36,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 3,
    }]}>
      <Animated.View 
        style={[
          { 
            width: tabWidth, 
            height: '100%', 
            justifyContent: 'center', 
            alignItems: 'center',
            position: 'absolute',
            top: 0,
            left: 0
          }, 
          animatedStyle
        ]}
      >
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 102, 0, 0.08)' }} />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const totalItems = useCartStore((state) => state.items.length);
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const segments = useSegments();

  const activeColor = colors.primary; // Make the icon match the orange circle tone
  const insets = useSafeAreaInsets();

  const bottomInset = insets.bottom;
  const tabHeight = 60 + bottomInset;

  const renderTabBarBackground = React.useCallback(
    () => <TabBarBackground bgColor={colors.surface} borderColor={colors.border} />,
    [colors.surface, colors.border]
  );

  const renderTabBarButton = React.useCallback(
    (props: any) => (
      <Pressable 
        {...props} 
        android_ripple={{ color: 'transparent' }} 
        style={[props.style, { backgroundColor: 'transparent' }]} 
      />
    ),
    []
  );

  return (
    <>
    <Tabs
      backBehavior="history"
      screenOptions={{
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 16,
          marginTop: 2,
          // @ts-ignore
          overflow: 'visible',
          fontFamily: 'Cairo_700Bold',
        },
        tabBarStyle: {
          backgroundColor: 'transparent', // Let tabBarBackground handle the color
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 72,
          position: 'absolute',
          bottom: bottomInset + 21,
          left: 20,
          right: 20,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarBackground: renderTabBarBackground,
        tabBarItemStyle: {
          flex: 1,
          paddingHorizontal: 0,
          paddingVertical: 0,
          paddingTop: 6, // Push content down to vertically center with the circle
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarButton: renderTabBarButton,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'الأقسام',
          tabBarIcon: ({ color }) => <LayoutGrid color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="cart-tab"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            toggleCart(true);
          },
        })}
        options={{
          title: 'السلة',
          tabBarIcon: ({ color }) => (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              <ShoppingCart color={color} size={24} />
              {totalItems > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -6,
                  right: -10,
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{totalItems}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
    
    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents={isCartOpen ? 'auto' : 'none'}>
      <CartOverlay />
    </View>
    </>
  );
}
