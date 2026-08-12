import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  I18nManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, X, TrendingUp } from 'lucide-react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import * as Haptics from 'expo-haptics';

const POPULAR_SEARCHES = [
  'حليب', 'دجاج', 'بطاطس', 'تونه', 'رز', 'صدور دجاج', 'طماطم', 'مناديل'
];

const SEARCH_SUGGESTIONS = [
  `لحوم مجمدة`,
  `صلصة طماطم`,
  `حلويات ومكسرات`,
  `خبز ومعجنات`,
  `شوكولاتة وبسكويت`,
  `بهارات كبسة`,
  `فلفل أحمر مجروش`,
  `بهارات شاورما`,
  `صلصة حارة`
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useAppTheme();
  
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus search input when screen opens
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const popularSearches = POPULAR_SEARCHES;
  const searchSuggestions = SEARCH_SUGGESTIONS.filter(s => s.includes(query));

  const handleSearch = useCallback((text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/products?search=${encodeURIComponent(text)}`);
  }, [router]);

  const renderSuggestion = useCallback(({ item }: any) => (
    <SuggestionItem item={item} onPress={handleSearch} colors={colors} />
  ), [handleSearch, colors]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
      
      {/* Header / Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ChevronRight color={colors.text} size={28} />
        </TouchableOpacity>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.primary} size={20} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text }]}
            placeholder="تحتاج مكونات كبسة..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => query.trim() && handleSearch(query.trim())}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity 
              style={styles.clearBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setQuery('');
              }}
              activeOpacity={0.7}
            >
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {query.length === 0 ? (
          // Popular Searches
          <View style={styles.popularSection}>
            <View style={styles.popularHeader}>
              <Text style={[styles.popularTitle, { color: colors.primary }]}>الأكثر بحثا 🔥</Text>
            </View>
            <View style={styles.pillsContainer}>
              {popularSearches.map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setQuery(item);
                    handleSearch(item);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, { color: colors.textSecondary }]}>{item}</Text>
                  <TrendingUp color={colors.textMuted} size={14} style={styles.pillIcon} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          // Search Suggestions (Mocked based on query)
          <FlatList
            data={searchSuggestions.length > 0 ? searchSuggestions : [`البحث عن "${query}"`]}
            keyExtractor={(item, index) => index.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={renderSuggestion}
          />
        )}
      </View>
    </View>
  );
}

const SuggestionItem = React.memo(({ item, onPress, colors }: any) => (
  <TouchableOpacity 
    style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(item);
    }}
    activeOpacity={0.7}
  >
    <Search color={colors.textMuted} size={18} style={styles.suggestionIcon} />
    <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{item}</Text>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 15,
  },
  clearBtn: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  popularSection: {
    paddingHorizontal: 16,
  },
  popularHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  popularTitle: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pillText: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 14,
  },
  pillIcon: {
    marginLeft: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 16,
  },
  suggestionIcon: {
    marginRight: 4,
  },
  suggestionText: {
    fontFamily: 'Cairo_600SemiBold',
    fontSize: 15,
  },
});
