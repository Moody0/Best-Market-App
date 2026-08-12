import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, User as UserIcon, Phone, Mail } from 'lucide-react-native';
import { useAuthStore } from '@/store/auth';
import { useShallow } from 'zustand/react/shallow';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import api from '@/lib/api';
import { useCustomAlert } from '@/contexts/CustomAlertContext';
import * as Haptics from 'expo-haptics';

export default function EditProfileScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setAuth } = useAuthStore(useShallow(state => ({ user: state.user, setAuth: state.setAuth })));
  
  const nameParts = (user?.name || '').trim().split(' ');
  const defaultFirstName = user?.first_name || nameParts[0] || '';
  const defaultLastName = user?.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!firstName.trim() || !phone.trim()) {
      showAlert('خطأ', 'الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      showAlert('تنبيه', 'يجب أن يحتوي رقم الجوال على 9 أرقام على الأقل');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await api.put('/user', {
        name: fullName,
        phone: phone,
        email: email,
      });
      
      const updatedUser = res.data?.user || res.data;
      const currentToken = useAuthStore.getState().token;
      if (updatedUser && currentToken) {
        await setAuth(currentToken, updatedUser);
      }
      
      showAlert('نجاح', 'تم تحديث بيانات الحساب بنجاح');
      router.back();
    } catch (error: any) {
      showAlert('خطأ', error.response?.data?.message || 'حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تعديل البيانات الشخصية</Text>
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
        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>الاسم الأول *</Text>
            <View style={styles.inputContainer}>
              <UserIcon color={Colors.textMuted} size={18} />
              <TextInput
                style={styles.input}
                selectionColor={Colors.primary}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="الاسم الأول"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>الاسم الأخير *</Text>
            <View style={styles.inputContainer}>
              <UserIcon color={Colors.textMuted} size={18} />
              <TextInput
                style={styles.input}
                selectionColor={Colors.primary}
                value={lastName}
                onChangeText={setLastName}
                placeholder="الاسم الأخير"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>رقم الجوال *</Text>
            <View style={styles.inputContainer}>
              <Phone color={Colors.textMuted} size={18} />
              <TextInput
                style={styles.input}
                selectionColor={Colors.primary}
                value={phone}
                onChangeText={setPhone}
                placeholder="09xxxxxxxx"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>البريد الإلكتروني (اختياري)</Text>
            <View style={styles.inputContainer}>
              <Mail color={Colors.textMuted} size={18} />
              <TextInput
                style={styles.input}
                selectionColor={Colors.primary}
                value={email}
                onChangeText={setEmail}
                placeholder="example@mail.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleUpdate();
            }}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>حفظ التغييرات</Text>}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    color: Colors.text,
    textAlign: 'right',
    marginLeft: 10,
    fontSize: 13,
    outlineStyle: 'none' as any,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});
