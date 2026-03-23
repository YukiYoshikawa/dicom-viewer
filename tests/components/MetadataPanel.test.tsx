import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel';
import type { DicomMetadata } from '../../src/types/dicom';

const mockMetadata: DicomMetadata = {
  patient: { name: 'YAMADA^TARO', id: 'P001', birthDate: '19900101', sex: 'M' },
  study: { date: '20260101', description: 'CT CHEST', accessionNumber: 'A001' },
  series: { modality: 'CT', description: 'Axial 5mm', number: '1' },
  image: {
    rows: 512, columns: 512, bitsAllocated: 16, bitsStored: 12,
    windowCenter: 40, windowWidth: 400,
    transferSyntax: '1.2.840.10008.1.2.1',
    photometricInterpretation: 'MONOCHROME2',
    sopInstanceUid: '1.2.3.4.5',
  },
};

describe('MetadataPanel', () => {
  it('should display patient name', () => {
    render(<MetadataPanel metadata={mockMetadata} />);
    expect(screen.getByText('YAMADA^TARO')).toBeInTheDocument();
  });
  it('should display modality', () => {
    render(<MetadataPanel metadata={mockMetadata} />);
    expect(screen.getByText('CT')).toBeInTheDocument();
  });
  it('should show placeholder when no metadata', () => {
    render(<MetadataPanel metadata={null} />);
    expect(screen.getByText(/ファイルを読み込む/)).toBeInTheDocument();
  });
});
