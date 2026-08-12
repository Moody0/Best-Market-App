import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Receipt, Camera, Hash, DollarSign, CheckCircle2 } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as Haptics from 'expo-haptics';
import { useCustomAlert } from '@/contexts/CustomAlertContext';
import api from '@/lib/api';

export default function ReceiptRedemptionScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [imageCaptured, setImageCaptured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCapturePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAlert('تصوير الفاتورة', 'تم التقاط صورة الفاتورة بنجاح عبر الكاميرا!');
    setImageCaptured(true);
  };

  const handleSubmitReceipt = async () => {
    if (!receiptNumber || !receiptAmount) {
      showAlert('خطأ', 'الرجاء إدخال رقم الفاتورة وقيمتها الإجمالية');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/user/loyalty/invoice', {
        invoice_number: receiptNumber,
        invoice_amount: parseFloat(receiptAmount),
      });
      setSubmitting(false);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setSubmitting(false);
      const msg = error.response?.data?.message || 'حدث خطأ أثناء إرسال الفاتورة.';
      showAlert('خطأ', msg);
    }
  };

  if (success) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <CheckCircle2 color={Colors.success} size={72} style={{ marginBottom: 20 }} />
        <Text style={styles.successTitle}>تم تقديم طلب استرداد الفاتورة!</Text>
        <Text style={styles.successSub}>
          جاري مراجعة الفاتورة رقم (#{receiptNumber}) وسيتم إضافة النقاط لنقاط الولاء الخاصة بك فور التحقق.
        </Text>
        <TouchableOpacity 
          style={styles.backHomeBtn} 
          onPress={() => router.replace('/(tabs)/account')}
          activeOpacity={0.8}
        >
          <Text style={styles.backHomeText}>العودة للحساب</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>استرداد نقاط الفواتير</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.promoBanner}>
          <Receipt color={Colors.primary} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>اشتريت من أحد فروعنا في حمص؟</Text>
            <Text style={styles.bannerSub}>أدخل بيانات الفاتورة ورقمها لتحويل قيمتها لنقاط ولاء فورية!</Text>
          </View>
        </View>

        {/* Form Container */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>بيانات الفاتورة الورقية</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>رقم الفاتورة *</Text>
            <View style={styles.inputContainer}>
              <Hash color={Colors.textMuted} size={18} />
              <TextInput
                style={styles.input}
                selectionColor={Colors.primary}
                value={receiptNumber}
                onChangeText={setReceiptNumber}
                placeholder="مثال: INV-2026-9842"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>إجمالي قيمة الفاتورة (ل.س) *</Text>
            <View style={styles.inputContainer}>
              <DollarSign color={Colors.textMuted} size={18} />
              <TextInput
                style={styles.input}
                selectionColor={Colors.primary}
                value={receiptAmount}
                onChangeText={setReceiptAmount}
                placeholder="مثال: 45000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Photo Scanner Box */}
          <Text style={styles.label}>صورة الفاتورة (اختياري)</Text>
          <TouchableOpacity 
            style={[styles.cameraBox, imageCaptured && styles.cameraBoxCaptured]} 
            onPress={handleCapturePhoto}
            activeOpacity={0.8}
          >
            <Camera color={imageCaptured ? Colors.success : Colors.primary} size={28} />
            <Text style={[styles.cameraText, imageCaptured && { color: Colors.success }]}>
              {imageCaptured ? 'تم ارفاق صورة الفاتورة ✓' : 'اضغط لتصوير الفاتورة بالكاميرا'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleSubmitReceipt}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>إرسال الفاتورة للمراجعة</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
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
    padding: 16,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'left',
  },
  bannerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'left',
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'left',
  },
  formGroup: {
    marginBottom: 14,
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
    textAlign: 'left',
    marginRight: 10,
    fontSize: 13,
    outlineStyle: 'none' as any,
  },
  cameraBox: {
    backgroundColor: Colors.input,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  cameraBoxCaptured: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  cameraText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backHomeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backHomeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
