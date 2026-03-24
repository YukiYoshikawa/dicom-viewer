import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  gap: '12px',
  color: '#ff6b6b',
  background: 'rgba(10, 10, 15, 0.95)',
  padding: '24px',
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#ff6b6b',
  margin: 0,
};

const messageStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'rgba(224, 224, 232, 0.7)',
  maxWidth: '400px',
  lineHeight: 1.5,
};

const detailStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(224, 224, 232, 0.4)',
  maxWidth: '400px',
  wordBreak: 'break-all',
  fontFamily: 'monospace',
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  background: 'rgba(74, 158, 255, 0.15)',
  border: '1px solid rgba(74, 158, 255, 0.4)',
  borderRadius: '6px',
  color: '#4a9eff',
  cursor: 'pointer',
  fontSize: '13px',
  marginTop: '8px',
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={containerStyle}>
          <AlertCircle size={40} color="#ff6b6b" />
          <p style={titleStyle}>エラーが発生しました</p>
          <p style={messageStyle}>
            ビューポートでエラーが発生しました。別の画像を読み込むか、再試行してください。
          </p>
          {this.state.error && (
            <p style={detailStyle}>{this.state.error.message}</p>
          )}
          <button style={buttonStyle} onClick={this.handleRetry}>
            <RotateCcw size={14} />
            再試行
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
