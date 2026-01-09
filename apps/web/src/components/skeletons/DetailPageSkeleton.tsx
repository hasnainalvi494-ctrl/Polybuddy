import { ChartSkeleton } from "./ChartSkeleton";
import { TableSkeleton } from "./TableSkeleton";

export function DetailPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="animate-pulse">
        <div className="h-8 bg-[#1f1f1f] rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-[#1f1f1f] rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-[#1f1f1f] rounded w-2/3"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4">
            <div className="h-3 bg-[#1f1f1f] rounded w-20 mb-2"></div>
            <div className="h-6 bg-[#1f1f1f] rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <ChartSkeleton />

      {/* Table */}
      <TableSkeleton rows={5} columns={4} />

      {/* Additional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-[#1f1f1f] rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-[#1f1f1f] rounded"></div>
            <div className="h-4 bg-[#1f1f1f] rounded w-5/6"></div>
            <div className="h-4 bg-[#1f1f1f] rounded w-4/6"></div>
          </div>
        </div>
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-[#1f1f1f] rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-[#1f1f1f] rounded"></div>
            <div className="h-4 bg-[#1f1f1f] rounded w-5/6"></div>
            <div className="h-4 bg-[#1f1f1f] rounded w-4/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

