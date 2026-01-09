"use client";

interface TrendingBadgeProps {
  variant?: "hot" | "trending" | "new" | "popular";
  size?: "sm" | "md";
  pulse?: boolean;
}

export function TrendingBadge({ variant = "trending", size = "md", pulse = true }: TrendingBadgeProps) {
  const variants = {
    hot: {
      emoji: "🔥",
      label: "HOT",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
    },
    trending: {
      emoji: "📈",
      label: "TRENDING",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
    },
    new: {
      emoji: "✨",
      label: "NEW",
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
    },
    popular: {
      emoji: "⭐",
      label: "POPULAR",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
    },
  };

  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  const style = variants[variant];

  return (
    <div
      className={`inline-flex items-center gap-1 ${style.bg} border ${style.border} rounded ${sizes[size]} font-bold uppercase tracking-wide ${style.text}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.text.replace("text-", "bg-")} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.text.replace("text-", "bg-")}`}></span>
        </span>
      )}
      <span>{style.emoji}</span>
      <span>{style.label}</span>
    </div>
  );
}

// Floating badge for cards
export function FloatingTrendingBadge({ variant = "hot" }: { variant?: "hot" | "trending" | "new" | "popular" }) {
  return (
    <div className="absolute top-2 right-2 z-10">
      <TrendingBadge variant={variant} size="sm" pulse={true} />
    </div>
  );
}

