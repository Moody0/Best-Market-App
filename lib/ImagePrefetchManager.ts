import { Image } from 'react-native';

/**
 * ImagePrefetchManager
 *
 * Deduplicates concurrent Image.prefetch() calls so that only ONE network
 * request is dispatched per unique URI. This prevents the Android Fresco
 * pipeline race condition where multiple <Image> components mounting with
 * the same URI cause some requests to be silently dropped (blank white boxes).
 *
 * Once a prefetch resolves, the image sits in Fresco's disk/memory cache.
 * Any subsequent <Image source={{ uri }}> reads from cache — no network
 * request, no race.
 */

const inflight = new Map<string, Promise<boolean>>();

// Fresco often drops requests if too many Image.prefetch() calls are fired simultaneously.
// Since ScrollViews render all children at once, this limits concurrent native fetches to 3.
const prefetchQueue: Array<() => void> = [];
let activePrefetches = 0;
const MAX_CONCURRENT_PREFETCHES = 3;

function processPrefetchQueue() {
  if (activePrefetches >= MAX_CONCURRENT_PREFETCHES || prefetchQueue.length === 0) return;
  activePrefetches++;
  const task = prefetchQueue.shift();
  if (task) task();
}

/**
 * Prefetch a single image URL with concurrency limiting.
 */
export function prefetch(uri: string): Promise<boolean> {
  if (!uri) return Promise.resolve(false);

  // Deduplicate: if this URI is already being fetched, piggyback on it
  const existing = inflight.get(uri);
  if (existing) return existing;

  const promise = new Promise<boolean>((resolve) => {
    prefetchQueue.push(() => {
      // Race the prefetch against a 5-second timeout to prevent silent hangs in Fresco
      const fetchPromise = Image.prefetch(uri).then(() => true).catch(() => false);
      const timeoutPromise = new Promise<boolean>((r) => setTimeout(() => r(false), 5000));

      Promise.race([fetchPromise, timeoutPromise])
        .then((result) => resolve(result))
        .finally(() => {
          activePrefetches--;
          processPrefetchQueue();
        });
    });
    processPrefetchQueue();
  }).finally(() => {
    inflight.delete(uri);
  });

  inflight.set(uri, promise);
  return promise;
}

/**
 * Batch-prefetch an array of URLs. Deduplicates internally, so passing
 * the same URL multiple times is safe and costs only one fetch.
 */
export function prefetchAll(uris: string[]): Promise<boolean[]> {
  const unique = [...new Set(uris.filter(Boolean))];
  return Promise.all(unique.map(prefetch));
}

/**
 * Normalise a raw image field from the API into a clean, prefetch-safe HTTPS URL.
 *
 * Handles:
 *  - JSON-encoded arrays: '["path/to/img.webp"]' → 'path/to/img.webp'
 *  - Plain arrays: ['path/to/img.webp'] → 'path/to/img.webp'
 *  - Relative paths → full https://bestmarketsy.com/storage/... URL
 *  - http:// → https://
 *  - URI encoding for non-ASCII characters
 */
export function normalizeImageUrl(raw: any): string {
  // We return an empty string so CachedImage can handle local fallbacks

  let imageString = raw;

  if (typeof imageString === 'string') {
    imageString = imageString.trim();
    if (imageString.startsWith('[')) {
      try {
        const parsed = JSON.parse(imageString);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imageString = parsed[0];
        }
      } catch {
        // not valid JSON, use as-is
      }
    }
  } else if (Array.isArray(imageString) && imageString.length > 0) {
    imageString = imageString[0];
  }

  if (typeof imageString !== 'string' || imageString.trim() === '' || imageString === '[]') {
    return '';
  }

  const fullUrl = imageString.startsWith('http')
    ? imageString
    : `https://bestmarketsy.com/storage/${imageString}`;

  // Force HTTPS
  const secureUrl = fullUrl.replace(/^http:\/\//i, 'https://');

  return encodeURI(secureUrl);
}
