import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// アプリ全体を包む最上位のエラーバウンダリ。
// AR初期化（WebGLコンテキストロスト等）で起きた予期せぬ例外がここまで来ると、
// バウンダリが無い場合はReactツリー全体が空になり、AR.jsが直接documentへ挿入した
// カメラ映像だけが背景に残ってしまう（UIの誘導文・ボタンが消えたように見える）。
// 最低限、リロードを促すフォールバック表示に差し替える。
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#fff',
            backgroundColor: 'rgba(20, 20, 24, 0.85)',
            zIndex: 2000,
          }}
        >
          <p>予期しないエラーが発生しました。</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: '#f0b810',
              color: '#1a1a1a',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
