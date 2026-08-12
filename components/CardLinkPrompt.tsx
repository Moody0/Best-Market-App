import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthStore } from '@/store/auth';
import { ThemePalette } from '@/constants/Colors';
import api from '@/lib/api';

type CardStatus = {
  has_card: boolean;
  card: { card_number: string; points: number; linked_at: string } | null;
  pending_request: { card_number: string; status: string; created_at: string } | null;
};

export default function CardLinkPrompt() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const token = useAuthStore(state => state.token);

  const [isVisible, setIsVisible] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedNumber, setSubmittedNumber] = useState('');

  useEffect(() => {
    const checkShouldShow = async () => {
      if (!token) {
        setIsVisible(false);
        return;
      }
      try {
        const dismissed = await AsyncStorage.getItem('card_prompt_dismissed');
        if (dismissed === 'true') return;

        const res = await api.get('/user/card');
        const data: CardStatus = res.data;

        // If they have a card or a pending request, don't show prompt
        if (data.has_card || data.pending_request) return;

        setTimeout(() => {
          setIsVisible(true);
        }, 1500);
      } catch {
        // Ignored. Probably not logged in.
      }
    };

    checkShouldShow();
  }, [token]);

  const handleDismiss = async () => {
    await AsyncStorage.setItem('card_prompt_dismissed', 'true');
    setIsVisible(false);
  };

  const handleSubmit = async () => {
    if (!cardNumber || cardNumber.length < 1) return;
    setError('');
    setIsLoading(true);
    try {
      const paddedNumber = cardNumber.padStart(6, '0');
      const res = await api.post('/user/card/link', { card_number: paddedNumber });
      setSubmittedNumber(paddedNumber);
      setSuccess(true);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('حدث خطأ أثناء ربط البطاقة. حاول مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCard = async () => {
    setError('');
    setIsGenerating(true);
    try {
      const res = await api.post('/user/card/generate');
      setSubmittedNumber(res.data.card.card_number);
      setSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('حدث خطأ أثناء إصدار البطاقة.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
              <X color="rgba(255,255,255,0.7)" size={16} />
            </TouchableOpacity>

            <Text style={styles.title}>هل لديك بطاقة؟</Text>
            <Text style={styles.subtitle}>
              أدخل رقم بطاقة <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>خليك BEST</Text> لربطها بحسابك وتتبع نقاطك
            </Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {success ? (
              <View style={styles.successState}>
                <View style={styles.successIcon}>
                  <CheckCircle2 color={Colors.success} size={40} />
                </View>
                <Text style={styles.successTitle}>تم إرسال الطلب بنجاح!</Text>
                <Text style={styles.successDesc}>
                  رقم البطاقة: <Text style={styles.highlightNumber}>{submittedNumber}</Text>
                </Text>
                <TouchableOpacity onPress={handleDismiss} style={styles.doneBtn}>
                  <Text style={styles.doneBtnText}>تم</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {error ? (
                  <View style={styles.errorBox}>
                    <AlertCircle color={Colors.danger} size={16} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>رقم البطاقة (6 أرقام)</Text>
                  <TextInput
                    style={[styles.input, { letterSpacing: 16, writingDirection: 'ltr' }]}
                    textAlign="center"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(t.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, (!cardNumber || isLoading) && styles.disabledBtn]}
                  onPress={handleSubmit}
                  disabled={!cardNumber || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>ربط البطاقة</Text>
                      <CreditCard color="#fff" size={18} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.orDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.orText}>أو</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.generateBtn, isGenerating && styles.disabledBtn]}
                  onPress={handleGenerateCard}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <Text style={styles.generateBtnText}>لا يوجد لدي بطاقة - احصل على بطاقة رقمية الآن</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDismiss} style={styles.notNowBtn}>
                  <Text style={styles.notNowText}>ليس الآن</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.surface,
    padding: 24,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 8,
    zIndex: 10,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
    lineHeight: 22,
  },
  body: {
    padding: 24,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  highlightNumber: {
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    width: '100%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  generateBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(234, 88, 12, 0.2)',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  generateBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  notNowBtn: {
    padding: 12,
    alignItems: 'center',
  },
  notNowText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
