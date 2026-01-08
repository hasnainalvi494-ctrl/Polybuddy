"use client";

import { useState, useEffect } from "react";

interface LastUpdatedProps {
  timestamp: Date | string | number;
  prefix?: string;
}

export function LastUpdated({ timestamp, prefix = "Last updated" }: LastUpdatedProps) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = Date.now();
      const then = new Date(timestamp).getTime();
      const diffSeconds = Math.floor((now - then) / 1000);

      if (diffSeconds < 5) {
        setTimeAgo("just now");
      } else if (diffSeconds < 60) {
        setTimeAgo(`${diffSeconds}s ago`);
      } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60);
        setTimeAgo(`${minutes}m ago`);
      } else if (diffSeconds < 86400) {
        const hours = Math.floor(diffSeconds / 3600);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(diffSeconds / 86400);
        setTimeAgo(`${days}d ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>
        {prefix}: <span className="font-medium">{timeAgo}</span>
      </span>
    </div>
  );
}

