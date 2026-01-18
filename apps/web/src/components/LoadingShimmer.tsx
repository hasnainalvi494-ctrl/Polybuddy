"use client";

interface LoadingShimmerProps {
  className?: string;
  lines?: number;
  height?: "sm" | "md" | "lg";
}

export function LoadingShimmer({ className = "", lines = 3, height = "md" }: LoadingShimmerProps) {
  const heightClasses = {
    sm: "h-3",
    md: "h-4",
    lg: "h-6",
  };

  const widths = ["w-full", "w-5/6", "w-4/5", "w-full", "w-3/4"];

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`${heightClasses[height]} ${widths[index % widths.length]} bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-shimmer bg-[length:200%_100%]`}
        ></div>
      ))}
    </div>
  );
}

// Card shimmer for structured content
export function CardShimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 border border-gray-700 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-3">
          <div className="h-6 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-3/4 animate-shimmer bg-[length:200%_100%]"></div>
          <div className="h-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-1/2 animate-shimmer bg-[length:200%_100%]"></div>
        </div>
        <div className="w-16 h-16 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg animate-shimmer bg-[length:200%_100%]"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-full animate-shimmer bg-[length:200%_100%]"></div>
        <div className="h-3 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-5/6 animate-shimmer bg-[length:200%_100%]"></div>
        <div className="h-3 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-4/5 animate-shimmer bg-[length:200%_100%]"></div>
      </div>
    </div>
  );
}

// Table row shimmer
export function TableRowShimmer() {
  return (
    <tr className="border-b dark:border-gray-800">
      <td className="py-3 px-4">
        <div className="h-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-full animate-shimmer bg-[length:200%_100%]"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-20 animate-shimmer bg-[length:200%_100%]"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-24 animate-shimmer bg-[length:200%_100%]"></div>
      </td>
      <td className="py-3 px-4">
        <div className="h-4 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded w-16 animate-shimmer bg-[length:200%_100%]"></div>
      </td>
    </tr>
  );
}


