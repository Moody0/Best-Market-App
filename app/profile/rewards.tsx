import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Gift, Receipt, Star, Crown, Medal } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function RewardsScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const rewards = [
    {
      points: '5,000 نقطة',
      title: 'سحب شهري',
      desc: 'دخول تلقائي في السحب الشهري على جوائز قيمة',
      icon: Gift,
      color: '#3B82F6', // Blue
    },
    {
      points: '10,000 نقطة',
      title: 'قسيمة شراء',
      desc: 'قسيمة شراء مجانية صالحة في جميع الفروع والموقع',
      icon: Receipt,
      color: '#22C55E', // Green
    },
    {
      points: '15,000 نقطة',
      title: 'هدية مجانية',
      desc: 'اختر هديتك المجانية من قسم هدايا الأعضاء',
      icon: Star,
      color: '#A855F7', // Purple
    },
    {
      points: '25,000 نقطة',
      title: 'خصم خاص',
      desc: 'خصم استثنائي على إجمالي سلتك القادمة',
      icon: Crown,
      color: '#EA580C', // Orange
    },
  ];

  const tiers = [
    {
      range: 'PTS 5,000 - 0',
      title: 'BEST Bronze',
      desc: 'الخطوة الأولى في رحلتك. احصل على نقاط مضاعفة في أعياد ميلادك.',
      icon: Medal,
      color: '#B45309', // Bronze
    },
    {
      range: 'PTS 15,000 - 5,000',
      title: 'BEST Silver',
      desc: 'عروض حصرية مخصصة لك، وأولوية في سحوبات نهاية الشهر.',
      icon: Medal,
      color: '#9CA3AF', // Silver
    },
    {
      range: 'PTS +15,000',
      title: 'BEST Gold',
      desc: 'معاملة الـ VIP. هدايا خاصة، شحن مجاني دائم، وخدمة عملاء ذات أولوية.',
      icon: Crown,
      color: '#EAB308', // Gold
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>دليل المكافآت والمستويات</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Rewards List */}
        <Text style={styles.sectionTitle}>قائمة المكافآت</Text>
        
        {rewards.map((item, index) => (
          <View key={index} style={styles.rewardCard}>
            <View style={styles.rewardCardContent}>
              <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                <item.icon color={item.color} size={24} />
              </View>
              
              <View style={styles.textContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
            </View>
            
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsBadgeText}>{item.points}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 16 }} />

        {/* Section 2: Tiers Benefits */}
        <Text style={styles.sectionTitle}>مزايا المستويات</Text>
        
        {tiers.map((item, index) => (
          <View key={index} style={[styles.tierCard, { borderLeftColor: item.color }]}>
            <View style={styles.tierCardContent}>
              <View style={styles.tierIconWrapper}>
                <item.icon color={item.color} size={28} />
              </View>
              
              <View style={styles.tierTextContent}>
                <Text style={styles.tierTitle}>{item.title}</Text>
                <Text style={styles.tierDesc}>{item.desc}</Text>
              </View>
            </View>
            
            <View style={styles.tierRangeBadge}>
              <Text style={styles.tierRangeText}>{item.range}</Text>
            </View>
          </View>
        ))}
        
      </ScrollView>
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 12,
    marginTop: 8,
  },
  /* Rewards Cards */
  rewardCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  rewardCardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    marginTop: 12, // Space for the top-left badge
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  pointsBadge: {
    position: 'absolute',
    top: 12,
    left: 16,
  },
  pointsBadgeText: {
    color: '#EA580C', // Orange
    fontSize: 12,
    fontWeight: '700',
  },
  /* Tiers Cards */
  tierCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4, // Colored border on the left
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  tierCardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 4, // Space for the left pill badge if they wrap, but here they are side by side on desktop, we'll put the pill on the left
  },
  tierIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tierTextContent: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 90, // Leave space for the range badge on the left
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  tierDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  tierRangeBadge: {
    position: 'absolute',
    left: 16,
    top: 16,
    backgroundColor: Colors.input,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tierRangeText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
