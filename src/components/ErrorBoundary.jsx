import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
            <div className="text-red-500 text-5xl mb-4">!</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Щось пішло не так
            </h2>
            <p className="text-gray-500 mb-6">
              Виникла непередбачена помилка. Спробуйте перезавантажити сторінку.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left text-red-400 bg-red-50 rounded-lg p-3 mb-6 overflow-auto max-h-32">
                {String(this.state.error)}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Перезавантажити
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
