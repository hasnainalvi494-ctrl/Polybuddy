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
