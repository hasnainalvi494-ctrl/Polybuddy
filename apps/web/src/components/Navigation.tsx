"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { SoundToggle } from "./SoundToggle";

const navItems = [
  { href: "/home", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/best-bets", label: "Best Bets", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/elite-traders", label: "Elite Traders", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
  { href: "/markets", label: "Markets", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/"); // Go to launch page after logout
  };

  return (
    <nav className="bg-[#111820]/95 border-b border-[#243040] sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:shadow-glow-md">
              <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-lg text-gray-100 tracking-tight hidden sm:block">PolyBuddy</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-teal-500/15 text-teal-400 shadow-glow-sm"
                      : "text-gray-400 hover:bg-[#1a2332] hover:text-gray-200"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  <span className="hidden md:block text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Theme Toggle & Auth Section */}
          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <SoundToggle />
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:bg-[#1a2332] hover:text-gray-200 transition-all duration-200 hover:shadow-glow-sm"
              title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            >
              {resolvedTheme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {isLoading ? (
              <div className="w-20 h-8 bg-[#1a2332] animate-pulse rounded" />
            ) : isAuthenticated ? (
              <>
                <span className="text-sm text-gray-400 hidden sm:block">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2 rounded-lg hover:bg-[#1a2332] transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:shadow-glow-md transition-all duration-200 font-medium hover:-translate-y-0.5"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
