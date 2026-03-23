import { init as coreInit } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';

let initialized = false;

export async function initCornerstone(): Promise<void> {
  if (initialized) return;

  await coreInit();
  await dicomImageLoaderInit();
  cornerstoneToolsInit();

  initialized = true;
}
