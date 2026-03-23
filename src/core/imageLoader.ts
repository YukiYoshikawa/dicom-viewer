import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

export function isDicomFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 132) return false;
  const view = new Uint8Array(buffer, 128, 4);
  return (
    view[0] === 0x44 && view[1] === 0x49 && view[2] === 0x43 && view[3] === 0x4d
  );
}

export function loadLocalFiles(files: File[]): string[] {
  return files
    .filter((f) => f.name.endsWith('.dcm') || f.name.endsWith('.DCM') || !f.name.includes('.'))
    .map((file) => cornerstoneDICOMImageLoader.wadouri.fileManager.add(file));
}

export async function validateDicomFiles(
  files: File[],
): Promise<{ valid: File[]; invalid: string[] }> {
  const valid: File[] = [];
  const invalid: string[] = [];
  for (const file of files) {
    try {
      const header = await file.slice(0, 132).arrayBuffer();
      if (isDicomFile(header)) {
        valid.push(file);
      } else {
        invalid.push(file.name);
      }
    } catch {
      invalid.push(file.name);
    }
  }
  return { valid, invalid };
}
