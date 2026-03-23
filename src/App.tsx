import { useState, useCallback } from 'react';
import { useCornerstone } from './hooks/useCornerstone';
import { Header } from './components/Header';
import './styles/globals.css';

const appStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  background: 'var(--bg-deepest)',
  overflow: 'hidden',
};

const bodyStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
};

const leftPanelStyle: React.CSSProperties = {
  width: 'var(--panel-left-width)',
  background: 'var(--bg-panel)',
  borderRight: '1px solid var(--border-subtle)',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const centerPanelStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  background: 'var(--bg-deepest)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const rightPanelStyle: React.CSSProperties = {
  width: 'var(--panel-right-width)',
  background: 'var(--bg-panel)',
  borderLeft: '1px solid var(--border-subtle)',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-deepest)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-md)',
  zIndex: 100,
};

const errorStyle: React.CSSProperties = {
  ...overlayStyle,
  color: 'var(--accent-error)',
};

function App() {
  const { ready, error } = useCornerstone();
  const [filename, setFilename] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  if (error) {
    return (
      <div style={errorStyle}>
        初期化エラー: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={overlayStyle}>
        初期化中...
      </div>
    );
  }

  return (
    <div style={appStyle}>
      <Header
        filename={filename}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />
      <div style={bodyStyle}>
        <aside style={leftPanelStyle}>
          {/* Thumbnail panel - future task */}
        </aside>
        <main style={centerPanelStyle}>
          {/* Viewport and DropZone - integrated in Task 8 */}
        </main>
        <aside style={rightPanelStyle}>
          {/* Metadata / controls panel - future task */}
        </aside>
      </div>
    </div>
  );
}

export default App;
