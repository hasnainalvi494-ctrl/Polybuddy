export function MarketCardSkeleton() {
  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-4 bg-[#1f1f1f] rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-[#1f1f1f] rounded w-1/2"></div>
        </div>
        <div className="h-8 w-16 bg-[#1f1f1f] rounded"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="h-3 bg-[#1f1f1f] rounded w-16 mb-1"></div>
          <div className="h-4 bg-[#1f1f1f] rounded w-20"></div>
        </div>
        <div>
          <div className="h-3 bg-[#1f1f1f] rounded w-16 mb-1"></div>
          <div className="h-4 bg-[#1f1f1f] rounded w-20"></div>
        </div>
        <div>
          <div className="h-3 bg-[#1f1f1f] rounded w-16 mb-1"></div>
          <div className="h-4 bg-[#1f1f1f] rounded w-20"></div>
        </div>
      </div>

      {/* Button */}
      <div className="h-10 bg-[#1f1f1f] rounded"></div>
    </div>
  );
}

