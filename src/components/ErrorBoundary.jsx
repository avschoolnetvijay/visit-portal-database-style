import React, { Component } from 'react';
import { clearIDB } from '../supabaseClient';
import { Icons } from './Icons';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleClearAndReload = async () => {
    try {
      await clearIDB();
    } catch (e) {
      console.error(e);
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-slate-900 via-teal-950 to-slate-900 p-4">
          <div className="w-full max-w-xl p-8 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl flex flex-col items-center text-left text-white">
            <div className="bg-red-500/20 text-red-300 p-4 rounded-full shadow-inner border border-red-500/30 mb-4 animate-pulse">
              <Icons.Alert className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-extrabold text-white text-center tracking-tight mb-2">Something went wrong</h2>
            <p className="text-teal-200/70 text-xs text-center mb-6 uppercase tracking-wider font-semibold">School Visit Tracking Portal</p>
            
            <div className="w-full bg-slate-950/60 rounded-xl p-4 border border-white/10 mb-6 font-mono text-xs max-h-48 overflow-y-auto">
              <p className="text-red-400 font-bold mb-1">Error: {this.state.error?.toString()}</p>
              {this.state.errorInfo && (
                <pre className="text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs uppercase tracking-widest font-extrabold py-3 rounded-xl shadow-lg transition-all duration-150"
              >
                Reload Page
              </button>
              
              <button
                onClick={this.handleClearAndReload}
                className="w-full bg-slate-800 hover:bg-slate-700 text-teal-200 text-xs uppercase tracking-widest font-extrabold py-3 rounded-xl border border-white/5 transition-all duration-150"
              >
                Reset App Data & Reload
              </button>
            </div>
            
            <div className="mt-8 text-[10px] text-teal-200/30 text-center font-medium">
              If resetting does not work, please contact support with the error log above.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
