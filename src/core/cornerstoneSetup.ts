import { init as coreInit, cache, Enums, eventTarget } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';

// Use window flag to survive HMR module reloads
const INIT_KEY = '__cornerstoneInitialized__';

const CACHE_HIGH_THRESHOLD = 0.9; // trigger purge at 90% usage
const CACHE_TARGET = 0.6;         // purge down to 60% of max
let purgeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCache = Record<string, any>;

function setupCacheAutoPurge(): void {
  const purge = () => {
    try {
      const cacheAny = cache as unknown as AnyCache;
      // Try different APIs depending on version
      const maxBytes: number =
        typeof cacheAny.getCacheSize === 'function' ? cacheAny.getCacheSize() :
        typeof cacheAny.getMaxCacheSize === 'function' ? cacheAny.getMaxCacheSize() :
        0;

      if (maxBytes <= 0) return;

      const usedBytes: number =
        typeof cacheAny.getImageDataSize === 'function' ? cacheAny.getImageDataSize() :
        typeof cacheAny.getCacheSizeInBytes === 'function' ? cacheAny.getCacheSizeInBytes() :
        0;

      const usage = usedBytes / maxBytes;
      if (usage > CACHE_HIGH_THRESHOLD) {
        const targetBytes = maxBytes * CACHE_TARGET;
        if (typeof cacheAny.purgeCache === 'function') {
          cacheAny.purgeCache(targetBytes);
        }
      }
    } catch {
      // Cache API may vary between versions, ignore errors
    }
  };

  const debouncedPurge = () => {
    if (purgeDebounceTimer) clearTimeout(purgeDebounceTimer);
    purgeDebounceTimer = setTimeout(purge, 500);
  };

  try {
    if (Enums.Events.IMAGE_LOADED) {
      eventTarget.addEventListener(Enums.Events.IMAGE_LOADED, debouncedPurge);
    }
  } catch {
    // Event or eventTarget may not be available in this version
  }
}

export async function initCornerstone(): Promise<void> {
  if ((window as unknown as Record<string, unknown>)[INIT_KEY]) return;

  await coreInit();
  await dicomImageLoaderInit();
  cornerstoneToolsInit();
  setupCacheAutoPurge();

  (window as unknown as Record<string, unknown>)[INIT_KEY] = true;
}
