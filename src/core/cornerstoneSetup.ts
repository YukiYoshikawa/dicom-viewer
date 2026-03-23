import { init as coreInit } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';

// Use window flag to survive HMR module reloads
const INIT_KEY = '__cornerstoneInitialized__';

export async function initCornerstone(): Promise<void> {
  if ((window as Record<string, unknown>)[INIT_KEY]) return;

  await coreInit();
  await dicomImageLoaderInit();
  cornerstoneToolsInit();

  (window as Record<string, unknown>)[INIT_KEY] = true;
}
