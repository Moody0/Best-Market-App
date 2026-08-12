import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Moon, Sun, Monitor, CheckCircle2, Circle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useThemeStore } from '@/store/theme';
import { useAuthStore } from '@/store/auth';
import { ThemePalette } from '@/constants/Colors';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { colors, isDark } = useAppTheme();
  const { themePreference, setThemePreference } = useThemeStore();
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Theme */}
          <Text style={styles.sectionTitle}>مظهر التطبيق</Text>
          <View style={styles.card}>
            <View style={styles.themeListContainer}>
              <TouchableOpacity 
                style={[styles.themeRowBtn, themePreference === 'light' && styles.themeRowBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemePreference('light');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeRowContent}>
                  <View style={[styles.themeIconBox, themePreference === 'light' && styles.themeIconBoxActive]}>
                    <Sun color={themePreference === 'light' ? colors.primary : colors.textMuted} size={20} />
                  </View>
                  <View style={styles.themeRowText}>
                    <Text style={styles.themeRowTitle}>فاتح</Text>
                    <Text style={styles.themeRowDesc}>تفعيل المظهر الفاتح دائماً</Text>
                  </View>
                </View>
                {themePreference === 'light' ? (
                  <CheckCircle2 color={colors.primary} size={22} />
                ) : (
                  <Circle color={colors.border} size={22} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.themeRowBtn, themePreference === 'dark' && styles.themeRowBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemePreference('dark');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeRowContent}>
                  <View style={[styles.themeIconBox, themePreference === 'dark' && styles.themeIconBoxActive]}>
                    <Moon color={themePreference === 'dark' ? colors.primary : colors.textMuted} size={20} />
                  </View>
                  <View style={styles.themeRowText}>
                    <Text style={styles.themeRowTitle}>داكن</Text>
                    <Text style={styles.themeRowDesc}>تفعيل المظهر الداكن دائماً</Text>
                  </View>
                </View>
                {themePreference === 'dark' ? (
                  <CheckCircle2 color={colors.primary} size={22} />
                ) : (
                  <Circle color={colors.border} size={22} />
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.themeRowBtn, themePreference === 'system' && styles.themeRowBtnActive, { borderBottomWidth: 0 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setThemePreference('system');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeRowContent}>
                  <View style={[styles.themeIconBox, themePreference === 'system' && styles.themeIconBoxActive]}>
                    <Monitor color={themePreference === 'system' ? colors.primary : colors.textMuted} size={20} />
                  </View>
                  <View style={styles.themeRowText}>
                    <Text style={styles.themeRowTitle}>تلقائي (حسب النظام)</Text>
                    <Text style={styles.themeRowDesc}>يتغير المظهر تلقائياً حسب إعدادات جهازك</Text>
                  </View>
                </View>
                {themePreference === 'system' ? (
                  <CheckCircle2 color={colors.primary} size={22} />
                ) : (
                  <Circle color={colors.border} size={22} />
                )}
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  backBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
    textAlign: 'left',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  themeListContainer: {
    flexDirection: 'column',
  },
  themeRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  themeRowBtnActive: {
  },
  themeRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  themeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeIconBoxActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  themeRowText: {
    flex: 1,
  },
  themeRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    marginBottom: 2,
  },
  themeRowDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'left',
  },
});
