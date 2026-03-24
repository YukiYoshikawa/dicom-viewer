import { annotation } from '@cornerstonejs/tools';

type AnnotationData = Record<string, unknown>;

type HistoryRecord =
  | { action: 'add'; uid: string; data: AnnotationData }
  | { action: 'remove'; uid: string; data: AnnotationData };

const MAX_HISTORY = 50;

let undoStack: HistoryRecord[] = [];
let redoStack: HistoryRecord[] = [];

function cloneAnnotation(ann: AnnotationData): AnnotationData {
  return JSON.parse(JSON.stringify(ann));
}

function getGroupSelector(data: AnnotationData): string {
  // AnnotationGroupSelector is HTMLDivElement | string; we pass a string (frameOfReferenceUID or imageId)
  const meta = data.metadata as Record<string, unknown> | undefined;
  return (meta?.FrameOfReferenceUID as string | undefined)
    ?? (meta?.referencedImageId as string | undefined)
    ?? '';
}

export function recordAdd(uid: string): void {
  const ann = annotation.state.getAnnotation(uid);
  if (!ann) return;
  undoStack.push({ action: 'add', uid, data: cloneAnnotation(ann as unknown as AnnotationData) });
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack = [];
}

export function recordRemove(uid: string): void {
  const ann = annotation.state.getAnnotation(uid);
  if (!ann) return;
  undoStack.push({ action: 'remove', uid, data: cloneAnnotation(ann as unknown as AnnotationData) });
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack = [];
}

export function undo(): boolean {
  const record = undoStack.pop();
  if (!record) return false;

  if (record.action === 'add') {
    // Undo an add => remove the annotation
    try {
      annotation.state.removeAnnotation(record.uid);
    } catch {
      // already removed
    }
  } else {
    // Undo a remove => re-add the annotation
    try {
      const selector = getGroupSelector(record.data);
      annotation.state.addAnnotation(
        record.data as Parameters<typeof annotation.state.addAnnotation>[0],
        selector,
      );
    } catch {
      // ignore
    }
  }
  redoStack.push(record);
  return true;
}

export function redo(): boolean {
  const record = redoStack.pop();
  if (!record) return false;

  if (record.action === 'add') {
    // Redo an add => re-add the annotation
    try {
      const selector = getGroupSelector(record.data);
      annotation.state.addAnnotation(
        record.data as Parameters<typeof annotation.state.addAnnotation>[0],
        selector,
      );
    } catch {
      // ignore
    }
  } else {
    // Redo a remove => remove again
    try {
      annotation.state.removeAnnotation(record.uid);
    } catch {
      // already removed
    }
  }
  undoStack.push(record);
  return true;
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}

export function canRedo(): boolean {
  return redoStack.length > 0;
}

export function clearHistory(): void {
  undoStack = [];
  redoStack = [];
}
