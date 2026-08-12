import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Plus, Minus } from 'lucide-react-native';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import api from '@/lib/api';

export default function PointsHistoryScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/user/loyalty');
      if (res.data && Array.isArray(res.data.transactions)) {
        setHistory(res.data.transactions);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const isEarn = item.type === 'earn' || item.points > 0 || !item.type;
    const pointsAmount = Math.abs(item.points || 0);
    const title = item.title || item.description || 'عملية نقاط';
    const date = item.date || (item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric', day: 'numeric' }) : '');

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          {/* Right Icon */}
          <View style={[styles.iconWrapper, isEarn ? styles.iconEarnBg : styles.iconSpendBg]}>
            {isEarn ? (
              <Plus color="#22C55E" size={20} />
            ) : (
              <Minus color="#EF4444" size={20} />
            )}
          </View>
          
          {/* Middle Text */}
          <View style={styles.textContent}>
            <Text style={styles.itemTitle}>{title}</Text>
            <Text style={styles.itemDate}>{date}</Text>
          </View>
        </View>
        
        {/* Left Points Badge */}
        <View style={styles.pointsBadge}>
          <Text style={[styles.pointsText, isEarn ? styles.textEarn : styles.textSpend]}>
            PTS {pointsAmount}{isEarn ? '+' : '-'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>سجل العمليات والنقاط</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد عمليات سابقة</Text>
          </View>
        }
      />
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
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  backBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEarnBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)', // Light Green
  },
  iconSpendBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // Light Red
  },
  textContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'right',
  },
  itemDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pointsBadge: {
    marginLeft: 16, // since it's row-reverse, left margin separates from right content
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textEarn: {
    color: '#22C55E', // Green
  },
  textSpend: {
    color: '#EF4444', // Red
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
});
