import React, { useState, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  LayoutAnimation,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  User, 
  MapPin, 
  Settings as SettingsIcon, 
  Phone, 
  FileText, 
  ShieldCheck, 
  Crown, 
  Star, 
  Receipt, 
  Clock,
  Gift, 
  ScrollText, 
  Bike, 
  LogOut, 
  ChevronLeft, 
  Lock, 
  HelpCircle,
  Shield,
  Heart
} from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore(useShallow(state => ({ user: state.user, logout: state.logout })));
  
  const [isBestOpen, setIsBestOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive?: boolean;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'إلغاء',
  });

  const toggleBestAccordion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsBestOpen(!isBestOpen);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAlertConfig({
      visible: true,
      title: 'تسجيل الخروج',
      message: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      confirmText: 'تأكيد الخروج',
      cancelText: 'إلغاء',
      isDestructive: true,
      onConfirm: async () => {
        await logout();
        router.replace('/');
      }
    });
  };

  const handleDeliveryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile/join-delivery');
  };

  const navigateTo = (path: string, reqAuth = false) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user && reqAuth) {
      router.push('/login');
    } else {
      router.push(path as any);
    }
  };

  const userName = user ? (user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'مستخدم بيست ماركت') : 'ضيف';

  const bestSubItems = [
    { id: 'points', label: 'بطاقتي ومكافآتي', icon: Star, route: '/profile/loyalty' },
    { id: 'redeem', label: 'استرداد نقاط فاتورة', icon: Receipt, route: '/profile/receipt-redemption' },
    { id: 'rewards', label: 'المكافآت والسحوبات', icon: Gift, route: '/profile/rewards' },
    { id: 'history', label: 'سجل النقاط', icon: ScrollText, route: '/profile/history' },
  ];

  const formatPhone = (phone?: string) => {
    if (!phone) return '\u202A+20 123456789\u202C'; // Default fallback if no phone
    const clean = phone.replace(/\s+/g, '');
    let formatted = '';
    if (clean.startsWith('+')) {
      formatted = clean.replace(/^(\+\d{2,3})(\d+)$/, '$1 $2');
    } else {
      formatted = `+20 ${clean}`;
    }
    return `\u202A${formatted}\u202C`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <ScrollView 
        style={styles.contentScroll} 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Top User Card */}
        <View style={styles.userCard}>
          {user && (
            <View style={styles.verifiedBadge}>
              <Shield color={Colors.primary} size={13} />
              <Text style={styles.verifiedText}>عضو موثق</Text>
            </View>
          )}

          <View style={styles.avatarContainer}>
            <User color={Colors.primary} size={28} />
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            {user ? (
              <Text style={styles.userPhone}>{formatPhone(user.phone)}</Text>
            ) : (
              <TouchableOpacity 
                style={styles.loginPill} 
                onPress={() => router.push('/login')}
                activeOpacity={0.8}
              >
                <Lock color="#fff" size={13} />
                <Text style={styles.loginPillText}>تسجيل الدخول / حساب جديد</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2. Main Navigation Menu Card */}
        <View style={styles.menuCard}>
          
          {/* Section: خليك BEST (Animated Smooth Accordion Banner) */}
          <View style={styles.bestSection}>
            <TouchableOpacity 
              style={styles.bestBanner}
              onPress={toggleBestAccordion}
              activeOpacity={0.9}
            >
              <View style={styles.bannerContent}>
                <Crown color="#fff" size={18} />
                <Text style={styles.bestBannerText}>خليك BEST</Text>
              </View>
              
              <View style={{ transform: [{ rotate: isBestOpen ? '-90deg' : '0deg' }] }}>
                <ChevronLeft color="#fff" size={16} />
              </View>
            </TouchableOpacity>

            {/* Smooth Expanding Dropdown Area */}
            {isBestOpen && (
              <View style={styles.accordionWrapper}>
                {bestSubItems.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.menuItem} 
                    onPress={() => navigateTo(item.route, true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemContent}>
                      <item.icon color={Colors.textMuted} size={18} />
                      <Text style={styles.menuItemText}>{item.label}</Text>
                    </View>
                    <ChevronLeft color={Colors.textSecondary} size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Section: عام */}
          <View style={styles.groupHeader}>
            <SettingsIcon color={Colors.textSecondary} size={15} />
            <Text style={styles.groupTitle}>عام</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigateTo('/profile/edit', true)}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <User color={Colors.textMuted} size={18} />
              <Text style={styles.menuItemText}>المعلومات الشخصية</Text>
            </View>
            <ChevronLeft color={Colors.textSecondary} size={16} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigateTo('/orders', true)}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <Clock color={Colors.textMuted} size={18} />
              <Text style={styles.menuItemText}>طلباتي</Text>
            </View>
            <ChevronLeft color={Colors.textSecondary} size={16} />
          </TouchableOpacity>

          {user && (
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => router.push('/profile/favorites')}
              activeOpacity={0.7}
            >
              <View style={styles.itemContent}>
                <Heart color={Colors.textMuted} size={18} />
                <Text style={styles.menuItemText}>المفضلة</Text>
              </View>
              <ChevronLeft color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
          )}

          {/* Section: الدعم والإعدادات */}
          <View style={styles.groupHeader}>
            <HelpCircle color={Colors.textSecondary} size={15} />
            <Text style={styles.groupTitle}>الدعم والإعدادات</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigateTo('/profile/contact', false)}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <Phone color={Colors.textMuted} size={18} />
              <Text style={styles.menuItemText}>خدمة العملاء</Text>
            </View>
            <ChevronLeft color={Colors.textSecondary} size={16} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigateTo('/profile/settings', false)}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <SettingsIcon color={Colors.textMuted} size={18} />
              <Text style={styles.menuItemText}>الإعدادات</Text>
            </View>
            <ChevronLeft color={Colors.textSecondary} size={16} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigateTo('/profile/terms', false)}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <FileText color={Colors.textMuted} size={18} />
              <Text style={styles.menuItemText}>الشروط والأحكام</Text>
            </View>
            <ChevronLeft color={Colors.textSecondary} size={16} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigateTo('/profile/privacy', false)}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <ShieldCheck color={Colors.textMuted} size={18} />
              <Text style={styles.menuItemText}>سياسة الخصوصية</Text>
            </View>
            <ChevronLeft color={Colors.textSecondary} size={16} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Section: انضم إلينا كمندوب */}
          <TouchableOpacity 
            style={styles.deliveryItem} 
            onPress={handleDeliveryPress}
            activeOpacity={0.7}
          >
            <View style={styles.itemContent}>
              <Bike color={Colors.primary} size={18} />
              <Text style={styles.deliveryText}>انضم إلينا كمندوب</Text>
            </View>
            <ChevronLeft color={Colors.primary} size={16} />
          </TouchableOpacity>

          {/* Section: تسجيل الخروج (If User Logged In) */}
          {user && (
            <TouchableOpacity 
              style={styles.logoutItem} 
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.itemContent}>
                <LogOut color={Colors.danger} size={18} />
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
              </View>
              <ChevronLeft color={Colors.danger} size={16} />
            </TouchableOpacity>
          )}

        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Custom Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={styles.modalMessage}>{alertConfig.message}</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalBtnCancel} 
                onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.modalBtnCancelText}>{alertConfig.cancelText}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtnConfirm, alertConfig.isDestructive && styles.modalBtnDestructive]} 
                onPress={() => {
                  setAlertConfig(prev => ({ ...prev, visible: false }));
                  alertConfig.onConfirm?.();
                }}
              >
                <Text style={styles.modalBtnConfirmText}>{alertConfig.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  /* Top User Card */
  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.input,
    borderWidth: 2,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'flex-start',
    flex: 1,
  },
  userName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  userPhone: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  loginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  loginPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  verifiedText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  /* Main Menu Card */
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  groupTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  /* خليك BEST Banner */
  bestSection: {
    marginVertical: 4,
  },
  bestBanner: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bestBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  accordionWrapper: {
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  deliveryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  deliveryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  logoutText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.input,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalBtnDestructive: {
    backgroundColor: Colors.danger,
  },
  modalBtnConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
