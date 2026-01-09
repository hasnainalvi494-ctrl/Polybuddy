"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarkets } from "@/lib/api";
import Link from "next/link";

interface CalendarDay {
  date: Date;
  markets: Array<{
    id: string;
    question: string;
    category: string | null;
    endDate: string;
  }>;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: marketsData } = useQuery({
    queryKey: ["markets", "calendar"],
    queryFn: () => getMarkets({ limit: 1000 }),
  });

  // Generate calendar days
  const generateCalendar = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Adjust for Monday start (0 = Sunday, we want 0 = Monday)
    const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = adjustedStart - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        markets: getMarketsForDate(date),
        isCurrentMonth: false,
        isToday: false,
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.getTime() === today.getTime();
      days.push({
        date,
        markets: getMarketsForDate(date),
        isCurrentMonth: true,
        isToday,
      });
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        markets: getMarketsForDate(date),
        isCurrentMonth: false,
        isToday: false,
      });
    }
    
    return days;
  };

  const getMarketsForDate = (date: Date): CalendarDay["markets"] => {
    if (!marketsData?.data) return [];
    
    return marketsData.data.filter((market: any) => {
      if (!market.endDate) return false;
      const marketDate = new Date(market.endDate);
      marketDate.setHours(0, 0, 0, 0);
      return marketDate.getTime() === date.getTime();
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const calendarDays = generateCalendar();

  // Get event emoji based on category
  const getEventEmoji = (category: string | null): string => {
    if (!category) return "📊";
    const cat = category.toLowerCase();
    if (cat.includes("politics") || cat.includes("election")) return "🗳️";
    if (cat.includes("economics") || cat.includes("fed")) return "🔴";
    if (cat.includes("crypto")) return "₿";
    if (cat.includes("sports")) return "🏆";
    if (cat.includes("tech")) return "💻";
    return "📊";
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Market Calendar</h1>
          <p className="text-gray-400">Track when markets resolve and plan your trades</p>
        </div>

        {/* Calendar Controls */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 rounded-lg transition-colors text-sm font-medium"
              >
                Today
              </button>
              <button
                onClick={goToPreviousMonth}
                className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 rounded-lg transition-colors"
                aria-label="Previous month"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 rounded-lg transition-colors"
                aria-label="Next month"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[100px] p-2 rounded-lg border transition-all ${
                  day.isToday
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : day.isCurrentMonth
                    ? "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
                    : "bg-[#0f0f0f] border-[#1a1a1a]"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      day.isToday
                        ? "text-emerald-400 font-bold"
                        : day.isCurrentMonth
                        ? "text-gray-300"
                        : "text-gray-600"
                    }`}
                  >
                    {day.date.getDate()}
                  </span>
                  {day.markets.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                      {day.markets.length}
                    </span>
                  )}
                </div>

                {/* Market indicators */}
                {day.markets.length > 0 && (
                  <div className="space-y-1">
                    {day.markets.slice(0, 3).map((market) => (
                      <Link
                        key={market.id}
                        href={`/markets/${market.id}`}
                        className="block text-[10px] text-gray-400 hover:text-emerald-400 truncate transition-colors"
                        title={market.question}
                      >
                        <span className="mr-1">{getEventEmoji(market.category)}</span>
                        {market.question.substring(0, 20)}...
                      </Link>
                    ))}
                    {day.markets.length > 3 && (
                      <div className="text-[10px] text-gray-500">
                        +{day.markets.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Event Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🗳️</span>
              <span className="text-sm text-gray-400">Politics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔴</span>
              <span className="text-sm text-gray-400">Economics/Fed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">₿</span>
              <span className="text-sm text-gray-400">Crypto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="text-sm text-gray-400">Sports</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💻</span>
              <span className="text-sm text-gray-400">Tech</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span className="text-sm text-gray-400">Other</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

