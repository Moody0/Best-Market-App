import React, { useState, useMemo } from 'react';
import { View, ImageProps, ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  /** The remote URI to display */
  uri: string;
  /** Fallback URI if the primary fails to load */
  fallbackUri?: string;
  /** Style applied to both the placeholder View and the Image */
  style?: StyleProp<ImageStyle>;
  /** Optional style override for the placeholder only */
  placeholderStyle?: StyleProp<ViewStyle>;
  /** Resize mode */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const DEFAULT_FALLBACK = 'https://placehold.co/400x400/F97316/FFFFFF.png?text=BM';

/**
 * CachedImage
 *
 * Uses expo-image for robust caching and support for modern formats like AVIF.
 */
export default function CachedImage({
  uri,
  fallbackUri = DEFAULT_FALLBACK,
  style,
  placeholderStyle,
  resizeMode = 'cover',
  ...imageProps
}: CachedImageProps) {
  const [error, setError] = useState(false);

  const imageSource = useMemo(() => (
    error || !uri 
      ? require('@/assets/images/grocery_placeholder.jpg') 
      : { uri }
  ), [error, uri]);

  return (
    <ExpoImage
      source={imageSource}
      style={style as any}
      contentFit={resizeMode === 'contain' ? 'contain' : (resizeMode === 'cover' ? 'cover' : 'fill')}
      transition={200}
      onError={() => setError(true)}
      cachePolicy="memory-disk"
      {...imageProps as any}
    />
  );
}
