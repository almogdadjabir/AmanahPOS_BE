'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  fallback:  ReactNode;
  children:  ReactNode;
}

interface State {
  hasError: boolean;
}

// Class component required — hooks cannot implement getDerivedStateFromError.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
