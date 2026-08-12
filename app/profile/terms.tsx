import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, FileText } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>الشروط والأحكام</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconCircle}>
          <FileText color={Colors.primary} size={32} />
        </View>

        <Text style={styles.pageTitle}>الشروط <Text style={{ color: Colors.primary }}>والأحكام</Text></Text>
        <Text style={styles.pageSub}>
          نحرص في بيست ماركت على الشفافية التامة. هذه الصفحة توضح القواعد التي تحكم استخدامك لمنصتنا لضمان حقوق الجميع.
        </Text>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>١. مقدمة عامة</Text>
            <Text style={styles.sectionText}>
              مرحباً بك في تطبيق وموقع بيست ماركت. باستخدامك لخدماتنا، فإنك توافق على الالتزام بالشروط والأحكام الموضحة أدناه. تُطبق هذه الشروط على جميع المستخدمين والزوار في مدينة حمص، ونهدف من خلالها لتقديم بيئة تسوق آمنة وموثوقة.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>٢. حساب المستخدم</Text>
            <Text style={styles.sectionText}>
              • يجب أن تكون المعلومات المقدمة أثناء التسجيل (الاسم، رقم الهاتف، العنوان) صحيحة ودقيقة لضمان وصول الطلبات بدون تأخير.{'\n'}
              • أنت مسؤول بالكامل عن الحفاظ على سرية بيانات الدخول الخاصة بحسابك.{'\n'}
              • نحتفظ بالحق في إيقاف أي حساب في حال اكتشاف نشاط احتيالي أو تقديم معلومات وهمية بشكل متكرر.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>٣. الطلبات والتوصيل</Text>
            <Text style={styles.sectionText}>
              • تخضع جميع الطلبات لمدى توفر المنتجات في المخزون. في حال نفاد منتج بعد طلبه، سيتم التواصل معك لاستبداله أو تعديله.{'\n'}
              • قد يختلف وقت التوصيل قليلاً عن الوقت المتوقع بناءً على الظروف الجوية أو الازدحام المروري.{'\n'}
              • يجب على العميل التواجد في العنوان المحدد أو الرد على اتصال المندوب لتسهيل عملية التسليم.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>٤. الدفع والأسعار</Text>
            <Text style={styles.sectionText}>
              • جميع الأسعار المعروضة هي بالليرة السورية وتشمل الضرائب المطبقة إن وجدت.{'\n'}
              • يتم الدفع نقداً عند الاستلام أو من خلال الطرق المعتمدة داخل التطبيق.
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
