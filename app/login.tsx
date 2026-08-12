import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, Shield, ChevronLeft, ArrowRight } from 'lucide-react-native';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { syncPushToken } from '@/lib/push-notifications';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'choose' | 'phone' | 'name' | 'otp'>('choose');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  React.useEffect(() => {
    GoogleSignin.configure({
      webClientId: '267021137621-cbt7fa5e7h3fatfuot3brvekih07n0ue.apps.googleusercontent.com',
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token found');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      const userCredential = await signInWithCredential(firebaseAuth, googleCredential);
      
      const res = await api.post('/auth/google', {
        firebase_token: idToken,
        email: userCredential.user.email,
        name: userCredential.user.displayName,
      });

      if (res.data.token) {
        await setAuth(res.data.token, res.data.user);
        syncPushToken();
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('تسجيل الدخول قيد التنفيذ...');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('خدمات Google Play غير متوفرة أو قديمة.');
      } else {
        setError(err.message || 'حدث خطأ أثناء تسجيل الدخول بحساب Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPhone = async () => {
    if (!phone || phone.length !== 9 || !phone.startsWith('9')) {
      setError('رقم الهاتف غير صالح');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fullPhone = '+963' + phone;
      const res = await api.post('/auth/check-phone', { phone: fullPhone });
      if (res.data.exists) {
        await handleSendOTP();
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStep('name');
        setLoading(false);
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء فحص رقم الهاتف.');
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (step === 'name' && (!name || name.trim().length < 2)) {
      setError('يرجى إدخال الاسم كاملاً');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const fullPhone = '+963' + phone;
      await api.post('/auth/otp/send', { phone: fullPhone });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep('otp');
      setCountdown(60);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء إرسال رمز التحقق.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    setOtp(cleanValue);
    if (cleanValue.length === 6) {
      handleVerifyOTP(cleanValue);
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    const finalOtp = code || otp;
    if (finalOtp.length !== 6) { setError('يرجى إدخال رمز التحقق كاملاً'); return; }
    setLoading(true);
    setError('');
    try {
      const fullPhone = '+963' + phone;
      const payload: any = { phone: fullPhone, otp: finalOtp };
      if (name) payload.name = name;
      const res = await api.post('/auth/otp/verify', payload);
      if (res.data.token) {
        await setAuth(res.data.token, res.data.user);
        syncPushToken();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء التحقق. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    handleSendOTP();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
        <View style={styles.card}>

          {/* === STEP: Choose Method === */}
          {step === 'choose' && (
            <>
              <View style={[styles.header, { alignItems: 'flex-start', width: '100%' }]}>
                <Text style={styles.heading}>تسجيل الدخول</Text>
                <Text style={styles.subheading}>اختر طريقة تسجيل الدخول المفضلة لديك</Text>
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <View style={[styles.buttonsGroup, { width: '100%' }]}>
                {/* Google Button */}
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#4285F4" />
                  ) : (
                    <>
                      <Image 
                        source={require('../assets/images/google-icon.png')}
                        style={{ width: 22, height: 22 }}
                        resizeMode="contain"
                      />
                      <Text style={styles.googleButtonText}>تسجيل الدخول بحساب Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>أو</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Phone Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.primaryButton, { flexDirection: 'row' }]}
                  onPress={() => { 
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStep('phone'); 
                    setError(''); 
                  }}
                  disabled={loading}
                >
                  <Phone color="#fff" size={20} />
                  <Text style={styles.primaryButtonText}>تسجيل الدخول برقم الهاتف</Text>
                </TouchableOpacity>

                {/* Continue as Guest Button (Forced visible) */}
                <TouchableOpacity
                  style={[styles.guestButton]}
                  onPress={() => router.replace('/(tabs)')}
                  disabled={loading}
                >
                  <Text style={styles.guestButtonText}>المتابعة كزائر</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* === STEP: Phone Input === */}
          {step === 'phone' && (
            <>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { 
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep('choose'); 
                  setError(''); 
                }}
              >
                <ArrowRight color={Colors.textMuted} size={16} />
                <Text style={styles.backBtnText}>رجوع</Text>
              </TouchableOpacity>

              <View style={[styles.header, { alignItems: 'flex-start', width: '100%' }]}>
                <Text style={styles.heading}>رقم الهاتف</Text>
                <Text style={styles.subheading}>أدخل رقم هاتفك وسنرسل لك رمز تحقق</Text>
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <View style={[styles.inputGroup, { position: 'relative', marginTop: 12 }]}>
                <View style={styles.phoneRow}>
                  <View style={[styles.dialCodeBox, { flexDirection: 'row', gap: 6 }]}>
                    <Text style={[styles.dialCodeText, { writingDirection: 'ltr' }]}>{'\u200E'}+963</Text>
                    <Text style={{ fontSize: 16 }}>🇸🇾</Text>
                  </View>
                  <View style={{ width: 1, height: 24, backgroundColor: Colors.border, alignSelf: 'center' }} />
                  <TextInput
                    style={[styles.phoneInput, { paddingLeft: 10, writingDirection: 'ltr' }]}
                    placeholder="9XX XXX XXX"
                    placeholderTextColor="rgba(156, 163, 175, 0.6)"
                    keyboardType="phone-pad"
                    maxLength={9}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 9))}
                    textAlign="left"
                    autoFocus
                  />
                </View>
                <View style={{ position: 'absolute', top: -10, left: 24, backgroundColor: Colors.surface, paddingHorizontal: 6, zIndex: 10 }}>
                  <Text style={{ fontSize: 12, color: Colors.text, fontWeight: 'bold' }}>رقم الهاتف</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, { marginTop: 16 }, loading && styles.buttonDisabled]}
                onPress={handleCheckPhone}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>المتابعة</Text>
                    <ChevronLeft color="#fff" size={20} />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* === STEP: Name Input (New Users) === */}
          {step === 'name' && (
            <>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { 
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep('phone'); 
                  setError(''); 
                }}
              >
                <ArrowRight color={Colors.textMuted} size={16} />
                <Text style={styles.backBtnText}>رجوع</Text>
              </TouchableOpacity>

              <View style={[styles.header, { alignItems: 'flex-start', width: '100%' }]}>
                <Text style={styles.heading}>الاسم الكامل</Text>
                <Text style={styles.subheading}>يبدو أنك مستخدم جديد! ما هو اسمك الكريم؟</Text>
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <TextInput
                  style={styles.input}
                  placeholder="مثال: محمد الأحمد"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, { marginTop: 16 }, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>إرسال رمز التحقق</Text>
                    <ChevronLeft color="#fff" size={20} />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* === STEP: OTP Verification === */}
          {step === 'otp' && (
            <>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { 
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep('phone'); 
                  setError(''); 
                  setOtp(''); 
                }}
              >
                <ArrowRight color={Colors.textMuted} size={16} />
                <Text style={styles.backBtnText}>رجوع</Text>
              </TouchableOpacity>

              <View style={[styles.header, { alignItems: 'center' }]}>
                <View style={styles.shieldIconBox}>
                  <Shield color={Colors.primary} size={32} />
                </View>
                <Text style={[styles.heading, { textAlign: 'center' }]}>أدخل رمز التحقق</Text>
                <Text style={[styles.subheading, { textAlign: 'center' }]}>
                  أرسلنا رمز التحقق إلى رقم{'\n'}
                  <Text style={{ color: Colors.text, fontWeight: 'bold' }}>{`\u202A+963 ${phone}\u202C`}</Text>
                </Text>
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <View style={styles.otpContainer}>
                {/* Visual Boxes */}
                {Array(6).fill(0).map((_, i) => {
                  const digit = otp[i] || '';
                  return (
                    <View key={i} style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}>
                      <Text style={styles.otpBoxText}>{digit}</Text>
                    </View>
                  );
                })}
                {/* Hidden Input overlaid on top */}
                <TextInput
                  style={styles.hiddenOtpInput}
                  maxLength={6}
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={handleOtpChange}
                  autoFocus
                  textContentType="oneTimeCode"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={() => handleVerifyOTP()}
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>تحقق وسجل الدخول</Text>
                    <ChevronLeft color="#fff" size={20} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                {countdown > 0 ? (
                  <Text style={styles.resendCountdown}>
                    إعادة الإرسال بعد <Text style={{ color: Colors.text, fontWeight: 'bold' }}>{countdown}</Text> ثانية
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={styles.resendLink}>لم يصلك الرمز؟ إعادة الإرسال</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'left',
  },
  subheading: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'left',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    fontSize: 13,
  },
  buttonsGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: Colors.surface,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestButton: {
    backgroundColor: 'transparent',
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  guestButtonText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    marginRight: 4,
    textAlign: 'left',
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
  },
  phoneRow: {
    flexDirection: 'row-reverse', 
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  dialCodeBox: {
    backgroundColor: 'transparent',
    paddingRight: 16,
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialCodeText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
  },
  shieldIconBox: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
    position: 'relative',
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
  },
  otpBoxText: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendCountdown: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
