import * as dicomParser from 'dicom-parser';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import type { SeriesInfo } from '../types/dicom';

export interface DicomFileEntry {
  imageId: string;
  seriesInstanceUid: string;
  instanceNumber: number;
  sliceLocation: number;
  seriesNumber: string;
  seriesDescription: string;
  modality: string;
  sopInstanceUid: string;
}

export async function parseDicomHeader(
  file: File,
  imageId: string,
): Promise<DicomFileEntry | null> {
  try {
    const headerSize = Math.min(file.size, 65536);
    const buffer = await file.slice(0, headerSize).arrayBuffer();
    const byteArray = new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(byteArray, { untilTag: 'x7FE00010' });

    return {
      imageId,
      seriesInstanceUid: dataSet.string('x0020000e') ?? 'unknown',
      instanceNumber: dataSet.intString('x00200013') ?? 0,
      sliceLocation: dataSet.floatString('x00201041') ?? 0,
      seriesNumber: dataSet.string('x00200011') ?? '',
      seriesDescription: dataSet.string('x0008103e') ?? '',
      modality: dataSet.string('x00080060') ?? '',
      sopInstanceUid: dataSet.string('x00080018') ?? '',
    };
  } catch {
    return null;
  }
}

export function groupFilesBySeriesFromMetadata(
  entries: DicomFileEntry[],
): SeriesInfo[] {
  const groups = new Map<string, DicomFileEntry[]>();

  for (const entry of entries) {
    const key = entry.seriesInstanceUid;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const seriesList: SeriesInfo[] = [];

  for (const [uid, items] of groups) {
    items.sort((a, b) => {
      if (a.instanceNumber !== b.instanceNumber) return a.instanceNumber - b.instanceNumber;
      if (a.sliceLocation !== b.sliceLocation) return a.sliceLocation - b.sliceLocation;
      return a.sopInstanceUid.localeCompare(b.sopInstanceUid);
    });

    const first = items[0];
    seriesList.push({
      seriesInstanceUid: uid,
      seriesNumber: first.seriesNumber,
      seriesDescription: first.seriesDescription,
      modality: first.modality,
      imageIds: items.map((i) => i.imageId),
      imageCount: items.length,
    });
  }

  seriesList.sort((a, b) => {
    const na = parseInt(a.seriesNumber) || 0;
    const nb = parseInt(b.seriesNumber) || 0;
    return na - nb;
  });

  return seriesList;
}

export async function loadAndGroupFiles(
  files: File[],
): Promise<{ seriesList: SeriesInfo[]; skipped: string[] }> {
  const skipped: string[] = [];
  const entries: DicomFileEntry[] = [];

  for (const file of files) {
    const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
    const entry = await parseDicomHeader(file, imageId);
    if (entry) {
      entries.push(entry);
    } else {
      skipped.push(file.name);
    }
  }

  const seriesList = groupFilesBySeriesFromMetadata(entries);
  return { seriesList, skipped };
}
