"use client";

interface LiveBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function LiveBadge({ size = "md", showText = true }: LiveBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg font-semibold text-red-500 ${sizeClasses[size]}`}
    >
      <span className="relative flex">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75`}
        ></span>
        <span
          className={`relative inline-flex rounded-full ${dotSizes[size]} bg-red-500`}
        ></span>
      </span>
      {showText && <span>LIVE</span>}
    </div>
  );
}

