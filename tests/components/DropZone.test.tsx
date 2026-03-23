import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DropZone } from '../../src/components/DropZone';

describe('DropZone', () => {
  it('should render drop prompt when no images loaded', () => {
    render(<DropZone hasImages={false} onFilesSelected={vi.fn()} />);
    expect(screen.getByText(/ドラッグ&ドロップ/)).toBeInTheDocument();
  });
  it('should not render overlay when images are loaded', () => {
    render(<DropZone hasImages={true} onFilesSelected={vi.fn()} />);
    expect(screen.queryByText(/ドラッグ&ドロップ/)).not.toBeInTheDocument();
  });
});
