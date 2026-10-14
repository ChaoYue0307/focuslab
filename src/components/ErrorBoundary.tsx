import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Last-resort fallback: never leave the user on a blank page, and always let them rescue their data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('FocusLab crashed', error, info.componentStack);
  }

  private backup = () => {
    try {
      const raw = localStorage.getItem('focuslab:v1') || '{}';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      a.download = 'focuslab-backup-rescue.json';
      a.click();
    } catch {
      /* nothing else we can do */
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const zh = document.documentElement.lang.startsWith('zh');
    return (
      <div className="onboard">
        <div className="onboard-card card pad-lg stack">
          <h1>{zh ? '出了点问题' : 'Something went wrong'}</h1>
          <p className="text-2">
            {zh ? '页面遇到了意外错误。你的数据仍然保存在浏览器中——可以先下载一份备份，再重新加载。' : 'The page hit an unexpected error. Your data is still stored in this browser — download a backup, then reload.'}
          </p>
          <pre className="small" style={{ whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: 12, borderRadius: 10, maxHeight: 160, overflow: 'auto' }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="row">
            <button className="btn" onClick={this.backup} type="button">
              {zh ? '下载数据备份' : 'Download data backup'}
            </button>
            <button
              className="btn primary"
              onClick={() => {
                location.hash = '#/';
                location.reload();
              }}
              type="button"
            >
              {zh ? '重新加载' : 'Reload'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
