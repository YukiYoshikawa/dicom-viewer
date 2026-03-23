import type { DicomMetadata } from '../types/dicom';

const metadataStore = new Map<string, DicomMetadata>();

export function storeMetadata(imageId: string, metadata: DicomMetadata): void {
  metadataStore.set(imageId, metadata);
}

export function extractMetadata(imageId: string): DicomMetadata | null {
  return metadataStore.get(imageId) ?? null;
}

export function clearMetadata(): void {
  metadataStore.clear();
}
