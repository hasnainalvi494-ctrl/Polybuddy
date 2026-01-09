// API client for PolyBuddy backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface GetMarketsParams {
  search?: string;
  category?: string;
  sortBy?: "volume" | "createdAt" | "endDate";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export async function getMarkets(params: GetMarketsParams = {}) {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set("search", params.search);
  if (params.category) searchParams.set("category", params.category);
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.offset) searchParams.set("offset", params.offset.toString());

  const url = `${API_URL}/api/markets?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch markets: ${response.statusText}`);
  }

  return response.json();
}

export async function getCategories() {
  const url = `${API_URL}/api/markets/categories`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  return response.json();
}

export async function getMarketById(id: string) {
  const url = `${API_URL}/api/markets/${id}`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch market: ${response.statusText}`);
  }

  return response.json();
}

export async function getStructurallyInteresting(limit: number = 6) {
  const url = `${API_URL}/api/markets/structurally-interesting?limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch structurally interesting markets: ${response.statusText}`);
  }

  return response.json();
}

export async function getRetailSignals(marketId: string) {
  const url = `${API_URL}/api/retail-signals/${marketId}`;
  
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch retail signals: ${response.statusText}`);
  }

  return response.json();
}

export async function signup(email: string, password: string) {
  const url = `${API_URL}/api/auth/signup`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Signup failed");
  }

  return response.json();
}

export async function login(email: string, password: string) {
  const url = `${API_URL}/api/auth/login`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }

  return response.json();
}

// Auth functions
export async function getCurrentUser() {
  const url = `${API_URL}/api/auth/me`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get current user");
  }

  return response.json();
}

export async function logout() {
  const url = `${API_URL}/api/auth/logout`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }

  return response.json();
}

// Alerts functions
export async function getAlerts() {
  const url = `${API_URL}/api/alerts`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }

  return response.json();
}

export async function getNotifications() {
  const url = `${API_URL}/api/notifications`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

export async function createAlert(data: any) {
  const url = `${API_URL}/api/alerts`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to create alert");
  }

  return response.json();
}

export async function dismissAlert(id: string) {
  const url = `${API_URL}/api/alerts/${id}/dismiss`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to dismiss alert");
  }

  return response.json();
}

export async function deleteAlert(id: string) {
  const url = `${API_URL}/api/alerts/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete alert");
  }

  return response.json();
}

export async function markNotificationRead(id: string) {
  const url = `${API_URL}/api/notifications/${id}/read`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }

  return response.json();
}

export async function markAllNotificationsRead() {
  const url = `${API_URL}/api/notifications/mark-all-read`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }

  return response.json();
}

export async function processAlerts() {
  const url = `${API_URL}/api/alerts/process`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to process alerts");
  }

  return response.json();
}

// Portfolio functions
export async function getWallets() {
  const url = `${API_URL}/api/portfolio/wallets`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch wallets");
  }

  return response.json();
}

export async function getPortfolioSummary() {
  const url = `${API_URL}/api/portfolio/summary`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch portfolio summary");
  }

  return response.json();
}

export async function getPerformance() {
  const url = `${API_URL}/api/portfolio/performance`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch performance");
  }

  return response.json();
}

export async function getWalletPositions(walletId: string) {
  const url = `${API_URL}/api/portfolio/wallets/${walletId}/positions`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch wallet positions");
  }

  return response.json();
}

export async function addWallet(data: any) {
  const url = `${API_URL}/api/portfolio/wallets`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to add wallet");
  }

  return response.json();
}

export async function deleteWallet(id: string) {
  const url = `${API_URL}/api/portfolio/wallets/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete wallet");
  }

  return response.json();
}

export async function deletePosition(walletId: string, positionId: string) {
  const url = `${API_URL}/api/portfolio/wallets/${walletId}/positions/${positionId}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete position");
  }

  return response.json();
}

// Reports functions
export async function getReports() {
  const url = `${API_URL}/api/reports`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }

  return response.json();
}

export async function generateReport(data: any) {
  const url = `${API_URL}/api/reports/generate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to generate report");
  }

  return response.json();
}

// Signals functions
export async function checkSignalsAvailability() {
  const url = `${API_URL}/api/signals/availability`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to check signals availability");
  }

  return response.json();
}

export async function getSignals() {
  const url = `${API_URL}/api/signals`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch signals");
  }

  return response.json();
}

export async function checkDailySignalsAvailability() {
  const url = `${API_URL}/api/signals/daily/availability`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to check daily signals availability");
  }

  return response.json();
}

export async function getDailySignals() {
  const url = `${API_URL}/api/signals/daily`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch daily signals");
  }

  return response.json();
}

// Watchlists functions
export async function getWatchlists() {
  const url = `${API_URL}/api/watchlists`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch watchlists");
  }

  return response.json();
}

export async function createWatchlist(data: any) {
  const url = `${API_URL}/api/watchlists`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to create watchlist");
  }

  return response.json();
}

export async function getWatchlist(id: string) {
  const url = `${API_URL}/api/watchlists/${id}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch watchlist");
  }

  return response.json();
}

export async function addToWatchlist(watchlistId: string, marketId: string) {
  const url = `${API_URL}/api/watchlists/${watchlistId}/markets`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ marketId }),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to add to watchlist");
  }

  return response.json();
}

export async function removeFromWatchlist(watchlistId: string, marketId: string) {
  const url = `${API_URL}/api/watchlists/${watchlistId}/markets/${marketId}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to remove from watchlist");
  }

  return response.json();
}

export async function deleteWatchlist(id: string) {
  const url = `${API_URL}/api/watchlists/${id}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to delete watchlist");
  }

  return response.json();
}

// Hidden exposure functions
export async function getWalletExposure(walletId: string) {
  const url = `${API_URL}/api/portfolio/wallets/${walletId}/exposure`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch wallet exposure");
  }

  return response.json();
}

export async function getHiddenExposure(marketId: string) {
  const url = `${API_URL}/api/markets/${marketId}/hidden-exposure`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch hidden exposure");
  }

  return response.json();
}
