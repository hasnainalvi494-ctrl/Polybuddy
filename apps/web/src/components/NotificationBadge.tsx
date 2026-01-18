"use client";

interface NotificationBadgeProps {
  count: number;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  onClick?: () => void;
}

export function NotificationBadge({
  count,
  label,
  icon,
  variant = "default",
  onClick,
}: NotificationBadgeProps) {
  if (count === 0) return null;

  const variantStyles = {
    default: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    danger: "bg-red-500/10 border-red-500/30 text-red-400",
  };

  const countBadgeStyles = {
    default: "bg-blue-500 text-white",
    success: "bg-green-500 text-white",
    warning: "bg-yellow-500 text-white",
    danger: "bg-red-500 text-white",
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:scale-105 ${variantStyles[variant]} ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      <span
        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${countBadgeStyles[variant]}`}
      >
        {count > 99 ? "99+" : count}
      </span>
    </button>
  );
}

// Pulse notification badge (for new items)
export function PulseNotificationBadge({
  count,
  label,
  icon,
}: {
  count: number;
  label: string;
  icon?: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm font-medium">
      <span className="relative flex">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500"></span>
      </span>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-green-500 text-white">
        {count > 99 ? "99+" : count}
      </span>
    </div>
  );
}

// Simple count badge (for navigation items, etc.)
export function CountBadge({ count, variant = "default" }: { count: number; variant?: "default" | "danger" }) {
  if (count === 0) return null;

  const variantStyles = {
    default: "bg-blue-500",
    danger: "bg-red-500",
  };

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white ${variantStyles[variant]}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}


