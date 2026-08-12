import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Linking, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Phone, MessageCircle, MapPin, Send } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as Haptics from 'expo-haptics';
import { useCustomAlert } from '@/contexts/CustomAlertContext';

export default function ContactScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const { showAlert } = useCustomAlert();

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCall = () => {
    Linking.openURL('tel:0989280280');
  };

  const handleWhatsApp = () => {
    Linking.openURL('https://wa.me/963989280280');
  };

  const handleSubmit = () => {
    if (!name || !phone || !message) {
      showAlert('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setName('');
      setPhone('');
      setMessage('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('تم الإرسال بنجاح', 'شكراً لتواصلك معنا، سيقوم فريق الدعم بالرد عليك في أقرب وقت.');
    }, 800);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الدعم والمساعدة</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
        >
        {/* Intro */}
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>نحن هنا <Text style={{ color: Colors.primary }}>لخدمتك</Text></Text>
          <Text style={styles.introSub}>
            لديك استفسار أو مشكلة في طلبك؟ فريقنا متواجد دائماً لمساعدتك بكل سرور.
          </Text>
        </View>

        {/* Quick Contact Cards */}
        <View style={styles.cardsRow}>
          {/* Phone */}
          <TouchableOpacity style={styles.contactCard} onPress={handleCall} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
              <Phone color={Colors.primary} size={22} />
            </View>
            <Text style={styles.cardTitle}>اتصل بنا</Text>
            <Text style={styles.cardSub}>0998 216 528</Text>
            <Text style={styles.cardTiming}>من ٩ ص حتى ١١ م</Text>
          </TouchableOpacity>

          {/* WhatsApp */}
          <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp} activeOpacity={0.8}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <MessageCircle color={Colors.success} size={22} />
            </View>
            <Text style={styles.cardTitle}>واتساب</Text>
            <Text style={[styles.cardSub, { color: Colors.success }]}>مراسلة فورية</Text>
            <Text style={styles.cardTiming}>دعم مباشر</Text>
          </TouchableOpacity>
        </View>

        {/* Location Info */}
        <View style={styles.locationCard}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
            <MapPin color="#3B82F6" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationTitle}>مقرنا في حمص</Text>
            <Text style={styles.locationText}>سوريا، حمص - الحمرة، جانب مخبز الملعب</Text>
          </View>
        </View>

        {/* Send Message Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>أرسل لنا رسالة</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>الاسم الكامل</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="محمد أحمد"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="09XXXXXXXX"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>الرسالة</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="اكتب استفسارك أو اقتراحك هنا..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Send color="#fff" size={18} />
            <Text style={styles.submitBtnText}>
              {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
            </Text>
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
  introCard: {
    alignItems: 'flex-start',
    marginVertical: 16,
    width: '100%',
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
  introSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'left',
    lineHeight: 20,
    width: '100%',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  cardTiming: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'left',
  },
  locationText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 2,
    textAlign: 'left',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
  },
  formTitle: {
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'left',
  },
  input: {
    backgroundColor: Colors.input,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    textAlign: 'right',
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
