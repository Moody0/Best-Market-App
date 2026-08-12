import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Star, Crown, Medal, CheckCircle2, Clock, CreditCard, AlertCircle } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import api from '@/lib/api';

export default function LoyaltyScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [cardNumberInput, setCardNumberInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [loyaltyRes, cardRes] = await Promise.all([
        api.get('/user/loyalty').catch(() => ({ data: null })),
        api.get('/user/card').catch(() => ({ data: null }))
      ]);
      if (loyaltyRes.data) setLoyaltyData(loyaltyRes.data);
      if (cardRes.data) setCardData(cardRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    setError('');
    const padded = cardNumberInput.padStart(6, '0');
    
    if (!/^\d{1,6}$/.test(cardNumberInput)) {
      setError('الرجاء إدخال رقم بطاقة صحيح (أرقام فقط)');
      return;
    }

    setIsLinking(true);
    try {
      await api.post('/user/card/link', { card_number: padded });
      await fetchData(); // refresh
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('حدث خطأ أثناء إرسال الطلب.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const points = loyaltyData?.points ?? 0;
  const lifetimePoints = loyaltyData?.lifetime_points ?? 0;
  const tier = loyaltyData?.loyalty_tier || 'bronze'; // 'bronze', 'silver', 'gold'
  const isGold = tier === 'gold';
  const targetPoints = tier === 'bronze' ? 5000 : 15000;
  const remainingPoints = Math.max(0, targetPoints - lifetimePoints);
  const progressPercent = Math.min(100, Math.round((lifetimePoints / targetPoints) * 100));

  const getTierDisplay = () => {
    if (tier === 'gold') return 'BEST GOLD';
    if (tier === 'silver') return 'BEST SILVER';
    return 'BEST BRONZE';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>بطاقتي ومكافآتي (⭐ خليك BEST)</Text>
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
          {/* Black Card Section */}
          <View style={styles.blackCard}>
            <View style={styles.cardTopRow}>
              {/* Medal Icon */}
              <View style={styles.medalCircle}>
                <Medal color="#EA580C" size={24} />
              </View>
              
              {/* Current Balance */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.currentBalanceLabel}>الرصيد الحالي</Text>
                <View style={styles.pointsRow}>
                  <Text style={styles.ptsText}>PTS</Text>
                  <Text style={styles.hugePoints}>{points}</Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1 }} />

            <View style={styles.cardBottomRow}>
              {/* Lifetime */}
              <View>
                <Text style={styles.lifetimeLabel}>LIFETIME</Text>
                <Text style={styles.lifetimeValue}>PTS {lifetimePoints}</Text>
              </View>
              
              {/* Tier */}
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.tierLabel}>MEMBER TIER</Text>
                <Text style={styles.tierValue}>{getTierDisplay()}</Text>
              </View>
            </View>
          </View>

          {/* Upgrade Journey Section */}
          <View style={styles.journeyCard}>
            <View style={styles.journeyHeader}>
              <View style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>الهدف: {targetPoints.toLocaleString()} نقطة</Text>
              </View>
              <View style={styles.journeyTitleRow}>
                <Text style={styles.journeyTitle}>رحلة الترقية</Text>
                <Star color="#EA580C" size={18} />
              </View>
            </View>

            {!isGold && (
              <View style={styles.journeyStatsRow}>
                <Text style={styles.remainingText}>بقي {remainingPoints} نقطة للمستوى التالي</Text>
                <Text style={styles.currentPointsText}>النقاط الحالية: {lifetimePoints}</Text>
              </View>
            )}

            {!isGold && (
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            )}

            {isGold && (
              <Text style={[styles.remainingText, { textAlign: 'center', marginTop: 12 }]}>أنت في أعلى مستوى!</Text>
            )}
          </View>

          {/* Physical Card Section */}
          <View style={styles.physicalCardSection}>
            <Text style={styles.sectionHeader}>ربط البطاقة البلاستيكية</Text>
            
            <View style={styles.physicalCardBox}>
              {cardData?.has_card ? (
                /* Success State */
                <View>
                  <View style={styles.successRow}>
                    <Text style={styles.successTitle}>البطاقة البلاستيكية مرتبطة بحسابك</Text>
                    <CheckCircle2 color="#22C55E" size={20} />
                  </View>
                  
                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardInfoValue}>{cardData.card.card_number}</Text>
                    <Text style={styles.cardInfoLabel}>رقم البطاقة</Text>
                  </View>
                  
                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardInfoValue}>{new Date(cardData.card.linked_at).toLocaleDateString('ar-EG')}</Text>
                    <Text style={styles.cardInfoLabel}>تاريخ الربط</Text>
                  </View>
                </View>
              ) : cardData?.pending_request ? (
                /* Pending State */
                <View style={styles.pendingBox}>
                  <Clock color={Colors.primary} size={36} />
                  <Text style={styles.pendingTitle}>طلبك قيد المراجعة</Text>
                  <Text style={styles.pendingDesc}>
                    لقد قمت بطلب ربط البطاقة رقم <Text style={{ fontWeight: 'bold' }}>{cardData.pending_request.card_number}</Text>
                  </Text>
                </View>
              ) : (
                /* Empty / Form State */
                <View style={styles.formContainer}>
                  <Text style={styles.formDesc}>قم بإدخال رقم بطاقتك المطبوعة إذا كنت تملك واحدة.</Text>
                  
                  {error ? (
                    <View style={styles.errorBox}>
                      <AlertCircle color={Colors.danger} size={16} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>رقم البطاقة (6 أرقام)</Text>
                    <TextInput
                      style={styles.input}
                      textAlign="center"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={cardNumberInput}
                      onChangeText={(t) => setCardNumberInput(t.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, (!cardNumberInput || isLinking) && styles.disabledBtn]}
                    onPress={handleLink}
                    disabled={!cardNumberInput || isLinking}
                  >
                    {isLinking ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>إرسال طلب الربط</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          <View style={{ height: 40 }} />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
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
  /* Black Card */
  blackCard: {
    backgroundColor: '#151515',
    borderRadius: 16,
    padding: 24,
    minHeight: 220,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medalCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentBalanceLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  ptsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  hugePoints: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    includeFontPadding: false,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lifetimeLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  lifetimeValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tierLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tierValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  /* Upgrade Journey */
  journeyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  targetBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  targetBadgeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  journeyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journeyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  journeyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  remainingText: {
    color: '#EA580C',
    fontSize: 13,
    fontWeight: '600',
  },
  currentPointsText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.input,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 3,
  },
  /* Physical Card Section */
  physicalCardSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'right',
    marginBottom: 16,
  },
  physicalCardBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  successTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '700',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardInfoLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardInfoValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  pendingBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  pendingDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    alignItems: 'center',
  },
  formDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
