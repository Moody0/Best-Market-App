import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function PrivacyScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سياسة الخصوصية</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle}>
          <ShieldCheck color={Colors.primary} size={32} />
        </View>

        <Text style={styles.pageTitle}>سياسة <Text style={{ color: Colors.primary }}>الخصوصية</Text></Text>
        <Text style={styles.pageSub}>
          خصوصيتك وأمان بياناتك هي أولويتنا القصوى في بيست ماركت.
        </Text>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>١. البيانات التي نجمعها</Text>
            <Text style={styles.sectionText}>
              • معلومات الحساب الأساسية: الاسم، رقم الهاتف، والبريد الإلكتروني.{'\n'}
              • بيانات التوصيل: العناوين والموقع الجغرافي المسجل لتوصيل الطلبات بدقة.{'\n'}
              • سجل الطلبات والنشاط داخل التطبيق لتحسين تجربة التسوق.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>٢. كيف نستخدم بياناتك</Text>
            <Text style={styles.sectionText}>
              • معالجة وتوصيل طلباتك بأسرع وقت ممكن.{'\n'}
              • إرسال إشعارات بحالة الطلبات والعروض الحصرية.{'\n'}
              • تحسين وتطوير خدماتنا وجودة المنتجات المعروضة.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>٣. حماية البيانات</Text>
            <Text style={styles.sectionText}>
              نحن نطبق أعلى معايير الأمان لحماية بياناتك الشخصية من الوصول غير المصرح به، ولا نقوم ببيع أو مشاركة بياناتك مع أي طرف ثالث لأغراض إعلانية.
            </Text>
          </View>
        </View>
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
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'left',
    marginBottom: 8,
  },
  pageSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 16,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'left',
  },
  sectionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'left',
  },
});
