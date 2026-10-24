import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AWKUM ClassHub ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex flex-col items-center justify-center p-6 selection:bg-[#493222] selection:text-[#FFF9F1]">
          <div className="max-w-md w-full bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-[#FDF0ED] border border-[#F5C2C1] rounded-2xl flex items-center justify-center mx-auto text-[#C84B31]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-[#38271C]">AWKUM ClassHub Recovery</h1>
              <p className="text-xs text-[#806A56] leading-relaxed">
                An unexpected interface state occurred. The system has automatically isolated the issue to prevent data loss.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-[#F8F0E5] border border-[#E6D8C7] rounded-xl text-left text-[11px] font-mono text-[#806A56] overflow-x-auto max-h-28">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                onClick={this.handleResetCache}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#F8F0E5] hover:bg-[#EFE3D3] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
