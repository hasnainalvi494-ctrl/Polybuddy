export function ChartSkeleton() {
  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 animate-pulse">
      {/* Title */}
      <div className="h-6 bg-[#1f1f1f] rounded w-48 mb-6"></div>

      {/* Chart area */}
      <div className="h-64 bg-[#1f1f1f] rounded mb-4 relative overflow-hidden">
        {/* Animated shimmer effect */}
        <div className="absolute inset-0 shimmer"></div>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <div className="h-4 bg-[#1f1f1f] rounded w-20"></div>
        <div className="h-4 bg-[#1f1f1f] rounded w-20"></div>
        <div className="h-4 bg-[#1f1f1f] rounded w-20"></div>
      </div>
    </div>
  );
}


