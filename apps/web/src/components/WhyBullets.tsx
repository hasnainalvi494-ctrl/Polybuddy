"use client";

import type { WhyBullet } from "@/lib/api";

type WhyBulletsProps = {
  bullets: WhyBullet[];
  className?: string;
};

function formatValue(value: number, unit?: string): string {
  if (unit === "%") {
    return `${value.toFixed(1)}%`;
  }
  if (unit === "USD" || unit === "$") {
    return value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value.toFixed(0)}`;
  }
  if (unit === "min" || unit === "minutes") {
    return `${value.toFixed(0)} min`;
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
}

export function WhyBullets({ bullets, className = "" }: WhyBulletsProps) {
  if (!bullets || bullets.length === 0) {
    return null;
  }

  return (
    <ul className={`space-y-2 text-sm ${className}`}>
      {bullets.map((bullet, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className="text-blue-500 font-medium shrink-0">
            {formatValue(bullet.value, bullet.unit)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {bullet.text}
            {bullet.comparison && (
              <span className="text-gray-500 dark:text-gray-500 ml-1">
                ({bullet.comparison})
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
