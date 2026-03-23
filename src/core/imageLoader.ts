import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

export function isDicomFile(buffer: ArrayBuffer): boolean {
  // Check for DICM magic at offset 128 (standard DICOM with preamble)
  if (buffer.byteLength >= 132) {
    const view = new Uint8Array(buffer, 128, 4);
    if (view[0] === 0x44 && view[1] === 0x49 && view[2] === 0x43 && view[3] === 0x4d) {
      return true;
    }
  }
  // Some DICOM files lack the 128-byte preamble.
  // Check for common DICOM group tags at the start (group 0002 or 0008).
  if (buffer.byteLength >= 4) {
    const view = new Uint8Array(buffer);
    // Group 0x0002 (File Meta) little-endian: 02 00
    // Group 0x0008 (Identifying) little-endian: 08 00
    if ((view[0] === 0x02 && view[1] === 0x00) ||
        (view[0] === 0x08 && view[1] === 0x00)) {
      return true;
    }
  }
  return false;
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
    // Trust .dcm extension — skip binary validation
    const name = file.name.toLowerCase();
    if (name.endsWith('.dcm')) {
      valid.push(file);
      continue;
    }
    // For other extensions, check binary header
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
