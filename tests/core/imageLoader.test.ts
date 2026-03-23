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
    const buffer = new ArrayBuffer(2);
    expect(isDicomFile(buffer)).toBe(false);
  });

  it('should detect DICOM without preamble (group 0x0008)', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 0x08; view[1] = 0x00;
    expect(isDicomFile(buffer)).toBe(true);
  });

  it('should detect DICOM without preamble (group 0x0002)', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 0x02; view[1] = 0x00;
    expect(isDicomFile(buffer)).toBe(true);
  });
});
