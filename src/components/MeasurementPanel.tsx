import { useState, useEffect, useCallback } from 'react';
import { annotation, Enums as csToolsEnums } from '@cornerstonejs/tools';
import { Trash2, Undo2, Redo2, X, Download, FileX } from 'lucide-react';
import { canUndo, canRedo, undo, redo, clearHistory } from '../core/annotationHistory';
import styles from './MeasurementPanel.module.css';

interface AnnotationItem {
  uid: string;
  toolName: string;
  label: string;
  value: string;
}

function getToolLabel(toolName: string): string {
  const map: Record<string, string> = {
    Length: '長さ',
    Angle: '角度',
    ArrowAnnotate: '矢印注釈',
    CircleROI: '円ROI',
    EllipticalROI: '楕円ROI',
    RectangleROI: '矩形ROI',
    PlanarFreehandROI: 'フリーハンドROI',
    Probe: 'プローブ',
    Bidirectional: '双方向',
  };
  return map[toolName] ?? toolName;
}

function formatAnnotationValue(ann: Record<string, unknown>): string {
  const data = (ann.data ?? {}) as Record<string, unknown>;
  const stats = (data.cachedStats ?? {}) as Record<string, Record<string, unknown>>;

  // Try to extract useful stats from cachedStats (keyed by imageId or volumeId)
  for (const key of Object.keys(stats)) {
    const s = stats[key];
    if (!s) continue;
    const parts: string[] = [];
    if (typeof s.length === 'number') parts.push(`${s.length.toFixed(2)} mm`);
    if (typeof s.area === 'number') parts.push(`面積: ${s.area.toFixed(2)} mm²`);
    if (typeof s.angle === 'number') parts.push(`${s.angle.toFixed(2)}°`);
    if (typeof s.mean === 'number') parts.push(`平均HU: ${s.mean.toFixed(1)}`);
    if (typeof s.stdDev === 'number') parts.push(`SD: ${s.stdDev.toFixed(1)}`);
    if (typeof s.max === 'number') parts.push(`最大: ${s.max.toFixed(1)}`);
    if (typeof s.min === 'number') parts.push(`最小: ${s.min.toFixed(1)}`);
    if (parts.length > 0) return parts.join(' / ');
  }

  // Fallback: check label in data
  if (typeof data.label === 'string' && data.label) {
    return data.label;
  }

  return '計測中...';
}

function buildAnnotationItems(): AnnotationItem[] {
  const allAnnotations = annotation.state.getAllAnnotations();
  return allAnnotations.map((ann) => {
    const a = ann as Record<string, unknown>;
    const uid = (a.annotationUID as string) ?? '';
    const toolName = ((a.metadata as Record<string, unknown>)?.toolName as string) ?? '';
    return {
      uid,
      toolName,
      label: getToolLabel(toolName),
      value: formatAnnotationValue(a),
    };
  });
}

function exportCsv(items: AnnotationItem[]): void {
  const BOM = '\uFEFF';
  const header = 'UID,ツール,値\n';
  const rows = items
    .map((item) => `"${item.uid}","${item.label}","${item.value}"`)
    .join('\n');
  const csv = BOM + header + rows;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'measurements.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function MeasurementPanel() {
  const [items, setItems] = useState<AnnotationItem[]>([]);
  const [, forceUpdate] = useState(0);

  const refresh = useCallback(() => {
    setItems(buildAnnotationItems());
    forceUpdate((n) => n + 1); // also re-render for undo/redo button states
  }, []);

  useEffect(() => {
    const events = [
      csToolsEnums.Events.ANNOTATION_ADDED,
      csToolsEnums.Events.ANNOTATION_COMPLETED,
      csToolsEnums.Events.ANNOTATION_MODIFIED,
      csToolsEnums.Events.ANNOTATION_REMOVED,
    ];

    for (const evt of events) {
      document.addEventListener(evt, refresh);
    }
    // Initial load
    refresh();

    return () => {
      for (const evt of events) {
        document.removeEventListener(evt, refresh);
      }
    };
  }, [refresh]);

  const handleDelete = useCallback((uid: string) => {
    try {
      annotation.state.removeAnnotation(uid);
    } catch {
      // ignore
    }
    refresh();
  }, [refresh]);

  const handleUndo = useCallback(() => {
    undo();
    refresh();
  }, [refresh]);

  const handleRedo = useCallback(() => {
    redo();
    refresh();
  }, [refresh]);

  const handleClearAll = useCallback(() => {
    try {
      annotation.state.removeAllAnnotations();
    } catch {
      // ignore
    }
    clearHistory();
    refresh();
  }, [refresh]);

  const handleExport = useCallback(() => {
    exportCsv(items);
  }, [items]);

  const undoEnabled = canUndo();
  const redoEnabled = canRedo();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>計測一覧</span>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={handleUndo}
            disabled={!undoEnabled}
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            className={styles.iconButton}
            onClick={handleRedo}
            disabled={!redoEnabled}
            title="やり直す (Ctrl+Y)"
          >
            <Redo2 size={13} />
          </button>
          <button
            className={styles.iconButton}
            onClick={handleExport}
            disabled={items.length === 0}
            title="CSVエクスポート"
          >
            <Download size={13} />
          </button>
          <button
            className={`${styles.iconButton} ${styles.danger}`}
            onClick={handleClearAll}
            disabled={items.length === 0}
            title="全て削除"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <FileX size={24} className={styles.emptyIcon} />
          <span>計測データがありません</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.uid} className={styles.item}>
              <div className={styles.itemInfo}>
                <span className={styles.itemTool}>{item.label}</span>
                <span className={styles.itemValue}>{item.value}</span>
              </div>
              <button
                className={`${styles.iconButton} ${styles.deleteBtn}`}
                onClick={() => handleDelete(item.uid)}
                title="削除"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
