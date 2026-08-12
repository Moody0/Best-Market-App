import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Search, LayoutGrid, List as ListIcon, SlidersHorizontal, PackageSearch, BadgePercent, Check, X, ChevronRight, Clock, ShoppingCart, Grip } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import HorizontalProductCard from '@/components/HorizontalProductCard';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';
import CachedImage from '@/components/CachedImage';
import Skeleton from '@/components/Skeleton';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useCartStore } from '@/store/cart';
import * as Haptics from 'expo-haptics';

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'sales', label: 'الأكثر مبيعاً' },
  { value: 'price_asc', label: 'أقل سعر' },
  { value: 'price_desc', label: 'أعلى سعر' },
  { value: 'rating', label: 'الأعلى تقييماً' },
];

export default function ProductsScreen() {
  const Colors = useAppTheme().colors;
  const styles = useMemo(() => getStyles(Colors), [Colors]);

  const insets = useSafeAreaInsets();
  const { category, search, discount } = useLocalSearchParams();
  const router = useRouter();

  const items = useCartStore((state) => state.items);
  const cartItemCount = items.length;

  const [toastVisible, setToastVisible] = useState(false);
  const prevCartCount = useRef(cartItemCount);

  useEffect(() => {
    if (cartItemCount > prevCartCount.current) {
      setToastVisible(true);
      const timer = setTimeout(() => setToastVisible(false), 3000);
      prevCartCount.current = cartItemCount;
      return () => clearTimeout(timer);
    } else {
      prevCartCount.current = cartItemCount;
    }
  }, [cartItemCount]);

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // States
  const [searchQuery, setSearchQuery] = useState(search as string || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category as string || null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [hasDiscount, setHasDiscount] = useState(discount === 'true');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Search History & Suggestions
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search Categories extraction
  const searchCategories = useMemo(() => {
    if (!searchQuery) return [];
    
    // Flatten all categories to find the ones we need
    const flatCategories: any[] = [];
    categories.forEach(c => {
      flatCategories.push(c);
      if (c.children) flatCategories.push(...c.children);
    });
    
    return flatCategories;
  }, [categories, searchQuery]);

  // Fetch Categories
  useEffect(() => {
    api.get('/categories').then(res => {
      const cats = res.data.data || res.data || [];
      setCategories(cats);
    }).catch(console.error);

    AsyncStorage.getItem('search_history').then(res => {
      if (res) setSearchHistory(JSON.parse(res));
    });
  }, []);

  // Reset pagination when filters or search change, with debounce for live search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isSearchFocused) {
        if (searchQuery.trim().length > 0) {
          api.get(`/products?search=${encodeURIComponent(searchQuery.trim())}`).then(res => {
            setSuggestions(res.data.data?.slice(0, 5) || []);
          }).catch(() => {});
        } else {
          setSuggestions([]);
        }
      } else {
        setPage(1);
        setProducts([]);
        setHasMore(true);
        fetchProducts(1, searchQuery);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [selectedCategory, selectedSubcategory, hasDiscount, sortBy, searchQuery, isSearchFocused]);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const fetchProducts = useCallback(async (pageNumber = 1, currentSearch = searchQuery) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (pageNumber === 1) { setLoading(true); setError(false); }
    else setLoadingMore(true);
    
    try {
      let url = `/products?sort=${sortBy}&page=${pageNumber}`;
      if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
      
      const filterCategoryId = selectedSubcategory === 'offers' ? selectedCategory : (selectedSubcategory || selectedCategory);
      if (filterCategoryId) url += `&category_id=${filterCategoryId}`;
      if (hasDiscount || selectedSubcategory === 'offers') url += `&has_discount=true`;

      const response = await api.get(url, { signal: controller.signal });
      const newProducts = response.data.data || [];
      
      if (pageNumber === 1) {
        setProducts(newProducts);
      } else {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newProducts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      }
      
      if (response.data.current_page >= response.data.last_page || newProducts.length === 0) {
        setHasMore(false);
      }
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error("Error fetching products:", error);
      if (pageNumber === 1) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sortBy, searchQuery, selectedCategory, selectedSubcategory, hasDiscount]);

  const handleSearchSubmit = (query = searchQuery) => {
    if (query.trim()) {
      const newHistory = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 10);
      setSearchHistory(newHistory);
      AsyncStorage.setItem('search_history', JSON.stringify(newHistory));
    }
    setSearchQuery(query);
    setIsSearchFocused(false);
  };

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  }, [hasMore, loading, loadingMore, page, fetchProducts]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setHasDiscount(false);
    setSortBy('newest');
  };

  const renderCategoryImage = (cat: any) => {
    const imageUrl = normalizeImageUrl(cat.image || cat.image_url);
    return <CachedImage uri={imageUrl || ''} style={styles.catIconImg} resizeMode="cover" />;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} activeOpacity={0.7}>
          <ArrowRight color={Colors.text} size={20} />
        </TouchableOpacity>
        <SearchHeader 
          initialQuery={searchQuery}
          onSearch={setSearchQuery}
          onSubmit={handleSearchSubmit}
          onFocus={() => setIsSearchFocused(true)}
          onClear={() => { setIsSearchFocused(false); setSearchQuery(''); }}
          isSearchFocused={isSearchFocused}
          Colors={Colors}
          styles={styles}
        />
        <TouchableOpacity style={styles.cartBtn} onPress={() => useCartStore.getState().toggleCart(true)}>
          <ShoppingCart color={Colors.text} size={20} />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Live Search Overlay */}
      {isSearchFocused && (
        <View style={styles.searchOverlay}>
          {searchQuery.length === 0 && searchHistory.length > 0 && (
            <View style={styles.searchDropdownCard}>
              <View style={styles.searchDropdownHeader}>
                <Text style={styles.searchDropdownTitle}>عمليات البحث الأخيرة</Text>
                <TouchableOpacity onPress={() => {
                  setSearchHistory([]);
                  AsyncStorage.removeItem('search_history');
                }}>
                  <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: 'bold' }}>مسح</Text>
                </TouchableOpacity>
              </View>
              {searchHistory.map((h, i) => (
                <TouchableOpacity key={`hist-${i}`} style={styles.searchSuggestionRow} onPress={() => handleSearchSubmit(h)}>
                  <Clock color={Colors.textMuted} size={16} />
                  <Text style={styles.searchSuggestionText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchQuery.length > 0 && (
            <View style={styles.searchDropdownCard}>
              {suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <TouchableOpacity key={`sugg-${s.id}`} style={styles.searchSuggestionRow} onPress={() => handleSearchSubmit(s.name)}>
                    <Search color={Colors.textMuted} size={16} />
                    <Text style={[styles.searchSuggestionText, { color: Colors.text }]}>{s.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: Colors.textMuted }}>لم نجد أي منتج يطابق "{searchQuery}"</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.searchSuggestionRow, { backgroundColor: Colors.primaryLight, borderTopWidth: 1, borderColor: Colors.border }]} 
                onPress={() => handleSearchSubmit(searchQuery)}
              >
                <Search color={Colors.primary} size={16} />
                <Text style={[styles.searchSuggestionText, { color: Colors.primary, fontWeight: 'bold' }]}>عرض جميع النتائج لـ "{searchQuery}"</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Categories Section (Mobile Circular Design) */}
      <View style={styles.categoriesWrapper}>
        {searchQuery.length > 0 && products.length > 0 ? (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <TouchableOpacity
                style={styles.catCircleBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedSubcategory(null);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.catCircleOuter, !selectedSubcategory && styles.catCircleOuterActive]}>
                  <View style={[styles.catCircleInner, !selectedSubcategory && styles.catCircleInnerActive]}>
                    <Text style={[styles.catInitials, !selectedSubcategory && styles.catInitialsActive]}>الكل</Text>
                  </View>
                </View>
                <Text style={[styles.catName, !selectedSubcategory && styles.catNameActive]} numberOfLines={2}>الكل</Text>
              </TouchableOpacity>

              {searchCategories.map((cat: any) => {
                const isActive = selectedSubcategory === String(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.catCircleBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSubcategory(String(cat.id));
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catCircleOuter, isActive && styles.catCircleOuterActive]}>
                      <View style={[styles.catCircleInner, isActive && styles.catCircleInnerActive]}>
                        {renderCategoryImage(cat)}
                      </View>
                    </View>
                    <Text style={[styles.catName, isActive && styles.catNameActive]} numberOfLines={2}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : selectedCategory ? (
          <View>
            <View style={styles.catHeader}>
              <TouchableOpacity
                style={styles.catHeaderBtn}
                onPress={() => {
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                  setHasDiscount(false);
                  setSearchQuery('');
                }}
              >
                <ChevronRight color={Colors.text} size={20} />
              </TouchableOpacity>
              <Text style={styles.catHeaderTitle}>
                {categories.find((c: any) => String(c.id) === selectedCategory)?.name}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <TouchableOpacity
                style={styles.catCircleBtn}
                onPress={() => setSelectedSubcategory(null)}
              >
                <View style={[styles.catCircleOuter, !selectedSubcategory && styles.catCircleOuterActive]}>
                  <View style={[styles.catCircleInner, !selectedSubcategory && styles.catCircleInnerActive]}>
                    <Text style={[styles.catInitials, !selectedSubcategory && styles.catInitialsActive]}>الكل</Text>
                  </View>
                </View>
                <Text style={[styles.catName, !selectedSubcategory && styles.catNameActive]} numberOfLines={2}>الكل</Text>
              </TouchableOpacity>

              {categories.find((c: any) => String(c.id) === selectedCategory)?.children?.map((sub: any) => {
                const isActive = selectedSubcategory === String(sub.id);
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={styles.catCircleBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSubcategory(String(sub.id));
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catCircleOuter, isActive && styles.catCircleOuterActive]}>
                      <View style={[styles.catCircleInner, isActive && styles.catCircleInnerActive]}>
                        {renderCategoryImage(sub)}
                      </View>
                    </View>
                    <Text style={[styles.catName, isActive && styles.catNameActive]} numberOfLines={2}>{sub.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View>
            <Text style={styles.browseTitle}>تصفح الفئات</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              <TouchableOpacity
                style={styles.catCircleBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                  setHasDiscount(false);
                  setSearchQuery('');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.catCircleOuter, !selectedCategory && styles.catCircleOuterActive]}>
                  <View style={[styles.catCircleInner, !selectedCategory && styles.catCircleInnerActive]}>
                    <Text style={[styles.catInitials, !selectedCategory && styles.catInitialsActive]}>الكل</Text>
                  </View>
                </View>
                <Text style={[styles.catName, !selectedCategory && styles.catNameActive]} numberOfLines={2}>الكل</Text>
              </TouchableOpacity>

              {categories.map((cat: any) => {
                const isActive = selectedCategory === String(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.catCircleBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(String(cat.id));
                      setSelectedSubcategory(null);
                      setHasDiscount(false);
                      setSearchQuery('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catCircleOuter, isActive && styles.catCircleOuterActive]}>
                      <View style={[styles.catCircleInner, isActive && styles.catCircleInnerActive]}>
                        {renderCategoryImage(cat)}
                      </View>
                    </View>
                    <Text style={[styles.catName, isActive && styles.catNameActive]} numberOfLines={2}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity 
          style={styles.sortBtn}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <SlidersHorizontal color={Colors.textMuted} size={16} />
          <Text style={styles.sortBtnText}>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</Text>
        </TouchableOpacity>

        <View style={styles.viewToggleGroup}>
          <TouchableOpacity 
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('list');
            }}
            activeOpacity={0.7}
          >
            <ListIcon color={viewMode === 'list' ? Colors.text : Colors.textMuted} size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('grid');
            }}
            activeOpacity={0.7}
          >
            <LayoutGrid color={viewMode === 'grid' ? Colors.text : Colors.textMuted} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {error ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.danger, marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>حدث خطأ في الاتصال بالخادم</Text>
          <TouchableOpacity style={styles.clearBtn} onPress={() => fetchProducts(1, searchQuery)}>
            <Text style={styles.clearBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      ) : loading && page === 1 ? (
        <View style={{ padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton 
              key={`skel-${i}`} 
              width={viewMode === 'grid' ? "48%" : "100%"} 
              height={viewMode === 'grid' ? 240 : 120} 
              borderRadius={16} 
              style={{ marginBottom: 16 }} 
            />
          ))}
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          {(hasDiscount || selectedCategory === 'offers') ? (
            <>
              <BadgePercent color={Colors.border} size={80} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>لا توجد عروض متاحة حالياً</Text>
              <Text style={styles.emptySub}>ترقب عروضنا القادمة قريباً، أو تصفح باقي منتجاتنا.</Text>
            </>
          ) : (
            <>
              <PackageSearch color={Colors.border} size={80} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>لا توجد منتجات مطابقة</Text>
              <Text style={styles.emptySub}>حاول تغيير الفلاتر أو تصنيف البحث.</Text>
            </>
          )}
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>تصفح جميع المنتجات</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ProductsList 
          products={products}
          viewMode={viewMode}
          handleLoadMore={handleLoadMore}
          loadingMore={loadingMore}
          Colors={Colors}
          styles={styles}
        />
      )}

      {/* Sort Modal */}
      <Modal visible={isFilterModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ترتيب حسب</Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <X color={Colors.textMuted} size={24} />
              </TouchableOpacity>
            </View>
            
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity 
                key={opt.value}
                style={styles.sortOptionRow}
                onPress={() => {
                  setSortBy(opt.value);
                  setIsFilterModalOpen(false);
                }}
              >
                <Text style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.value && <Check color={Colors.primary} size={20} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastVisible && (
        <View style={styles.toastContainer}>
          <View style={styles.toastContent}>
            <Check color={Colors.primary} size={20} />
            <Text style={styles.toastText}>تمت الإضافة إلى السلة!</Text>
            <TouchableOpacity style={styles.toastBtn} onPress={() => useCartStore.getState().toggleCart(true)}>
              <Text style={styles.toastBtnText}>عرض السلة</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </View>
  );
}

const SearchHeader = React.memo(({ initialQuery, onSearch, onSubmit, onFocus, onClear, isSearchFocused, Colors, styles }: any) => {
  const [localQuery, setLocalQuery] = useState(initialQuery);

  useEffect(() => {
    if (initialQuery !== localQuery) {
      setLocalQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(localQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [localQuery]);

  return (
    <View style={styles.searchContainer}>
      <TouchableOpacity onPress={() => onSubmit(localQuery)}>
        <Search color={Colors.textMuted} size={20} />
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        placeholder="ابحث عن المنتجات..."
        placeholderTextColor={Colors.textMuted}
        value={localQuery}
        onChangeText={setLocalQuery}
        onSubmitEditing={() => onSubmit(localQuery)}
        onFocus={onFocus}
        returnKeyType="search"
      />
      {isSearchFocused && (
        <TouchableOpacity onPress={() => { onClear(); setLocalQuery(''); }}>
          <X color={Colors.textMuted} size={20} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const ProductsList = React.memo(({ products, viewMode, handleLoadMore, loadingMore, Colors, styles }: any) => {
  const renderItem = useCallback(({ item }: { item: any }) => (
    viewMode === 'list' 
      ? <View style={{ width: '100%', paddingHorizontal: 16 }}><HorizontalProductCard product={item} /></View>
      : <ProductCard product={item} numColumns={2} />
  ), [viewMode]);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  const renderFooter = useCallback(() => loadingMore ? (
    <View style={{ paddingVertical: 20 }}>
      <ActivityIndicator color={Colors.primary} size="small" />
    </View>
  ) : <View style={{ height: 20 }} />, [loadingMore, Colors]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 220,
    offset: 220 * Math.floor(index / 2),
    index,
  }), []);

  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      data={products}
      keyExtractor={keyExtractor}
      numColumns={2}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      renderItem={renderItem}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      removeClippedSubviews={true}
      windowSize={5}
      maxToRenderPerBatch={10}
      initialNumToRender={8}
      getItemLayout={getItemLayout}
    />
  );
});

const getStyles = (Colors: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    textAlign: 'right',
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontSize: 15,
    padding: 0,
    margin: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  categoriesWrapper: {
    marginBottom: 12,
  },
  catScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  catCircleBtn: {
    alignItems: 'center',
    width: 64,
  },
  catCircleOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 3,
    marginBottom: 8,
  },
  catCircleOuterActive: {
    borderColor: Colors.primary,
  },
  catCircleInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: Colors.input,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catCircleInnerActive: {
    backgroundColor: Colors.primary,
  },
  catIconImg: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  catInitials: {
    color: Colors.textMuted,
    fontWeight: 'bold',
    fontSize: 14,
  },
  catInitialsActive: {
    color: '#fff',
  },
  catName: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  catNameActive: {
    color: Colors.primary,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  catHeaderBtn: {
    padding: 8,
    backgroundColor: Colors.input,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catHeaderTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  browseTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  sortBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
  },
  viewToggleBtn: {
    padding: 6,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.border,
  },
  list: {
    paddingHorizontal: 8,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  clearBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortOptionText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: Colors.primary,
  },
  searchOverlay: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 999,
    paddingHorizontal: 16,
  },
  searchDropdownCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchDropdownTitle: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.input,
    gap: 12,
  },
  searchSuggestionText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.surface,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 12,
  },
  toastText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  toastBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toastBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
