import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemePalette } from '@/constants/Colors';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Grid } from 'lucide-react-native';
import CachedImage from '@/components/CachedImage';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';
import Reanimated, { FadeInRight } from 'react-native-reanimated';

interface Category {
  id: number;
  name: string;
  image_url?: string;
  icon?: string;
}

interface CategoryRowProps {
  categories: Category[];
  selectedCategoryId?: number | null;
  onSelectCategory?: (id: number) => void;
}

export default React.memo(function CategoryRow({ categories, selectedCategoryId, onSelectCategory }: CategoryRowProps) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const handlePress = useCallback((cat: any) => {
    if (onSelectCategory) {
      onSelectCategory(cat.id);
    } else {
      router.push(`/products?category=${cat.id}`);
    }
  }, [onSelectCategory, router]);

  const renderItem = useCallback(({ item: cat, index }: any) => {
    const imageString = cat.image || cat.image_url;
    const imageUrl = normalizeImageUrl(imageString);
    const isActive = selectedCategoryId === cat.id;
      
    return (
      <Reanimated.View entering={FadeInRight.delay(index * 50).springify()}>
        <TouchableOpacity 
          style={styles.categoryItem}
          activeOpacity={0.8}
          onPress={() => handlePress(cat)}
        >
          <View style={styles.imageWrapper}>
            {imageString ? (
              <CachedImage uri={imageUrl} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderImage}>
                <Grid color={isActive ? colors.primary : colors.textMuted} size={24} />
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      </Reanimated.View>
    );
  }, [selectedCategoryId, styles, colors, handlePress]);

  const keyExtractor = useCallback((cat: any, index: number) => cat.id?.toString() ?? `cat-${index}`, []);

  if (!categories || categories.length === 0) return null;

  return (
    <FlatList 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      data={categories}
      keyExtractor={keyExtractor}
      initialNumToRender={5}
      windowSize={5}
      maxToRenderPerBatch={5}
      removeClippedSubviews={true}
      renderItem={renderItem}
    />
  );
});

const getStyles = (colors: ThemePalette) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    gap: 12,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});
