import { describe, it, expect } from 'vitest';
import { groupFilesBySeriesFromMetadata } from '../../src/core/seriesManager';

describe('seriesManager', () => {
  it('should group images by series instance UID', () => {
    const entries = [
      { imageId: 'dicomfile:0', seriesInstanceUid: 'S1', instanceNumber: 1, sliceLocation: 0, seriesNumber: '1', seriesDescription: 'Axial', modality: 'CT', sopInstanceUid: 'A' },
      { imageId: 'dicomfile:1', seriesInstanceUid: 'S1', instanceNumber: 2, sliceLocation: 1, seriesNumber: '1', seriesDescription: 'Axial', modality: 'CT', sopInstanceUid: 'B' },
      { imageId: 'dicomfile:2', seriesInstanceUid: 'S2', instanceNumber: 1, sliceLocation: 0, seriesNumber: '2', seriesDescription: 'Sagittal', modality: 'CT', sopInstanceUid: 'C' },
    ];
    const series = groupFilesBySeriesFromMetadata(entries);
    expect(series).toHaveLength(2);
    expect(series[0].imageIds).toEqual(['dicomfile:0', 'dicomfile:1']);
    expect(series[1].imageIds).toEqual(['dicomfile:2']);
  });

  it('should sort by instance number within series', () => {
    const entries = [
      { imageId: 'dicomfile:0', seriesInstanceUid: 'S1', instanceNumber: 3, sliceLocation: 0, seriesNumber: '1', seriesDescription: '', modality: 'CT', sopInstanceUid: 'A' },
      { imageId: 'dicomfile:1', seriesInstanceUid: 'S1', instanceNumber: 1, sliceLocation: 0, seriesNumber: '1', seriesDescription: '', modality: 'CT', sopInstanceUid: 'B' },
      { imageId: 'dicomfile:2', seriesInstanceUid: 'S1', instanceNumber: 2, sliceLocation: 0, seriesNumber: '1', seriesDescription: '', modality: 'CT', sopInstanceUid: 'C' },
    ];
    const series = groupFilesBySeriesFromMetadata(entries);
    expect(series[0].imageIds).toEqual(['dicomfile:1', 'dicomfile:2', 'dicomfile:0']);
  });

  it('should handle single image as single series', () => {
    const entries = [
      { imageId: 'dicomfile:0', seriesInstanceUid: 'S1', instanceNumber: 1, sliceLocation: 0, seriesNumber: '1', seriesDescription: 'Scout', modality: 'CR', sopInstanceUid: 'A' },
    ];
    const series = groupFilesBySeriesFromMetadata(entries);
    expect(series).toHaveLength(1);
    expect(series[0].imageCount).toBe(1);
    expect(series[0].modality).toBe('CR');
  });
});
