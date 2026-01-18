"use client";

import Link from "next/link";

interface MobileStickyCTAProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function MobileStickyCTA({ href, label, icon, variant = "primary" }: MobileStickyCTAProps) {
  const variantStyles = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-gray-950",
    secondary: "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700",
  };

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pointer-events-none z-40">
      <Link
        href={href}
        className={`flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-center transition-colors pointer-events-auto shadow-lg min-h-[56px] ${variantStyles[variant]}`}
      >
        {icon}
        <span>{label}</span>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}


