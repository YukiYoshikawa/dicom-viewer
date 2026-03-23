import { describe, it, expect } from 'vitest';
import { extractMetadata } from '../../src/core/metadataProvider';

describe('metadataProvider', () => {
  it('should return empty metadata for unknown imageId', () => {
    const meta = extractMetadata('unknown:123');
    expect(meta).toBeNull();
  });

  it('should store and retrieve metadata', async () => {
    const { storeMetadata, extractMetadata } = await import(
      '../../src/core/metadataProvider'
    );
    const testMeta = {
      patient: { name: 'Test', id: '001', birthDate: '2000-01-01', sex: 'M' },
      study: { date: '2026-01-01', description: 'CT', accessionNumber: 'A001' },
      series: { modality: 'CT', description: 'Axial', number: '1' },
      image: {
        rows: 512, columns: 512, bitsAllocated: 16, bitsStored: 12,
        windowCenter: 40, windowWidth: 400,
        transferSyntax: '1.2.840.10008.1.2.1',
        photometricInterpretation: 'MONOCHROME2',
        sopInstanceUid: '1.2.3.4.5',
      },
    };
    storeMetadata('test:1', testMeta);
    const result = extractMetadata('test:1');
    expect(result).toEqual(testMeta);
  });
});
