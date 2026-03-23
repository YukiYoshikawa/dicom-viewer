import { describe, it, expect } from 'vitest';
import { isDicomFile } from '../../src/core/imageLoader';

describe('imageLoader', () => {
  it('should detect valid DICOM files by DICM magic bytes', () => {
    const buffer = new ArrayBuffer(132);
    const view = new Uint8Array(buffer);
    view[128] = 0x44; view[129] = 0x49; view[130] = 0x43; view[131] = 0x4d;
    expect(isDicomFile(buffer)).toBe(true);
  });

  it('should reject non-DICOM files', () => {
    const buffer = new ArrayBuffer(132);
    expect(isDicomFile(buffer)).toBe(false);
  });

  it('should reject files too small to be DICOM', () => {
    const buffer = new ArrayBuffer(10);
    expect(isDicomFile(buffer)).toBe(false);
  });
});
