interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export function EmptyState({
  icon = "📭",
  title,
  message,
  action,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 text-center">
        <span className="text-3xl mb-2 block">{icon}</span>
        <p className="text-sm font-medium text-gray-300 mb-1">{title}</p>
        <p className="text-xs text-gray-500">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-12 text-center">
      <span className="text-7xl mb-6 block">{icon}</span>
      <h3 className="text-2xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-8 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

