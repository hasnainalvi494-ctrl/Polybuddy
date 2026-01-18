"use client";

import { ErrorBoundary } from "./ErrorBoundary";
import { ErrorState } from "./ErrorState";

interface SafeSectionProps {
  children: React.ReactNode;
  title?: string;
}

export function SafeSection({ children, title }: SafeSectionProps) {
  return (
    <ErrorBoundary
      fallback={
        <ErrorState
          title={`Failed to load ${title || "section"}`}
          message="This section encountered an error. Please refresh the page to try again."
          onRetry={() => window.location.reload()}
          compact
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}


