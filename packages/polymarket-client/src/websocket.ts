/**
 * Polymarket WebSocket Client
 * 
 * Provides real-time streaming data from Polymarket's official WebSocket APIs:
 * - CLOB WebSocket for orderbook and trade updates (~100ms latency)
 * - RTDS WebSocket for crypto prices and comments
 * - Sports WebSocket for live sports updates
 */

import { EventEmitter } from "events";

// ============================================================================
// TYPES
// ============================================================================

export interface MarketUpdate {
  event_type: "book" | "price_change" | "last_trade_price" | "tick_size_change";
  asset_id: string;
  market?: string;
  hash?: string;
  timestamp?: number;
  price?: string;
  side?: string;
  size?: string;
  changes?: Array<{ price: string; size: string; side: string }>;
}

export interface TradeUpdate {
  id: string;
  market: string;
  asset_id: string;
  price: string;
  size: string;
  side: "BUY" | "SELL";
  timestamp: number;
  maker_address?: string;
  taker_address?: string;
}

export interface OrderBookSnapshot {
  asset_id: string;
  market: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
}

export interface WebSocketMessage {
  type?: string;
  event_type?: string;
  channel?: string;
  data?: unknown;
  [key: string]: unknown;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface PolymarketWSOptions {
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  debug?: boolean;
}

// ============================================================================
// CLOB WEBSOCKET CLIENT (Real-time orderbook & trades)
// ============================================================================

export class PolymarketCLOBWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Set<string> = new Set();
  private state: ConnectionState = "disconnected";

  private readonly WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
  private readonly options: Required<PolymarketWSOptions>;

  constructor(options: PolymarketWSOptions = {}) {
    super();
    this.options = {
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      reconnectDelay: options.reconnectDelay ?? 1000,
      pingInterval: options.pingInterval ?? 30000,
      debug: options.debug ?? false,
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Connect to Polymarket CLOB WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === "connected") {
        resolve();
        return;
      }

      this.state = "connecting";
      this.log("Connecting to CLOB WebSocket...");

      try {
        this.ws = new WebSocket(this.WS_URL);

        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
          this.ws?.close();
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.state = "connected";
          this.reconnectAttempts = 0;
          this.log("✅ Connected to CLOB WebSocket");
          this.startPing();
          this.resubscribeAll();
          this.emit("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          this.log(`Connection closed: ${event.code} ${event.reason}`);
          this.cleanup();
          this.emit("disconnected", { code: event.code, reason: event.reason });
          
          if (this.options.reconnect && this.state !== "disconnected") {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.log("WebSocket error:", error);
          this.emit("error", error);
          if (this.state === "connecting") {
            clearTimeout(timeout);
            reject(error);
          }
        };
      } catch (error) {
        this.state = "disconnected";
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.state = "disconnected";
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.log("Disconnected from CLOB WebSocket");
  }

  /**
   * Subscribe to market updates for specific asset IDs
   */
  subscribe(assetIds: string | string[]): void {
    const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
    
    for (const id of ids) {
      this.subscriptions.add(id);
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscription(ids);
    }
  }

  /**
   * Unsubscribe from market updates
   */
  unsubscribe(assetIds: string | string[]): void {
    const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
    
    for (const id of ids) {
      this.subscriptions.delete(id);
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: "unsubscribe",
        channel: "market",
        assets_ids: ids,
      });
    }
  }

  /**
   * Get all current subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  private sendSubscription(assetIds: string[]): void {
    if (assetIds.length === 0) return;
    
    this.send({
      type: "market",
      assets_ids: assetIds,
    });
    this.log(`Subscribed to ${assetIds.length} assets`);
  }

  private resubscribeAll(): void {
    const ids = Array.from(this.subscriptions);
    if (ids.length > 0) {
      this.sendSubscription(ids);
    }
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(rawData: string | Buffer): void {
    try {
      const data = JSON.parse(rawData.toString()) as WebSocketMessage;
      
      // Handle different message types
      if (data.event_type) {
        const update = data as unknown as MarketUpdate;
        
        switch (update.event_type) {
          case "book":
            this.emit("book", update);
            break;
          case "price_change":
            this.emit("price", update);
            break;
          case "last_trade_price":
            this.emit("trade", update);
            break;
          case "tick_size_change":
            this.emit("tick_size", update);
            break;
          default:
            this.emit("message", data);
        }
      } else {
        this.emit("message", data);
      }
    } catch (error) {
      this.log("Failed to parse message:", error);
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send a ping frame
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          // Ignore ping errors
        }
      }
    }, this.options.pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private cleanup(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log("Max reconnect attempts reached");
      this.state = "disconnected";
      this.emit("max_reconnect_attempts");
      return;
    }

    this.state = "reconnecting";
    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.log("Reconnect failed:", error);
      });
    }, delay);
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log("[CLOB-WS]", ...args);
    }
  }
}

// ============================================================================
// RTDS WEBSOCKET CLIENT (Real-time crypto prices & comments)
// ============================================================================

export class PolymarketRTDSWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private state: ConnectionState = "disconnected";
  private topics: Set<string> = new Set();

  private readonly WS_URL = "wss://ws-live-data.polymarket.com";
  private readonly options: Required<PolymarketWSOptions>;

  constructor(options: PolymarketWSOptions = {}) {
    super();
    this.options = {
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      reconnectDelay: options.reconnectDelay ?? 1000,
      pingInterval: options.pingInterval ?? 30000,
      debug: options.debug ?? false,
    };
  }

  /**
   * Connect to RTDS WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === "connected") {
        resolve();
        return;
      }

      this.state = "connecting";
      this.log("Connecting to RTDS WebSocket...");

      try {
        this.ws = new WebSocket(this.WS_URL);

        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
          this.ws?.close();
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.state = "connected";
          this.reconnectAttempts = 0;
          this.log("✅ Connected to RTDS WebSocket");
          this.startPing();
          this.resubscribeAll();
          this.emit("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          this.cleanup();
          this.emit("disconnected");
          
          if (this.options.reconnect && this.state !== "disconnected") {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.emit("error", error);
          if (this.state === "connecting") {
            clearTimeout(timeout);
            reject(error);
          }
        };
      } catch (error) {
        this.state = "disconnected";
        reject(error);
      }
    });
  }

  /**
   * Disconnect from RTDS
   */
  disconnect(): void {
    this.state = "disconnected";
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }

  /**
   * Subscribe to a topic (e.g., "crypto_prices", "comments")
   */
  subscribeTopic(topic: string, filters?: Record<string, unknown>): void {
    this.topics.add(topic);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        action: "subscribe",
        topic,
        filters,
      });
    }
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribeTopic(topic: string): void {
    this.topics.delete(topic);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        action: "unsubscribe",
        topic,
      });
    }
  }

  private resubscribeAll(): void {
    for (const topic of this.topics) {
      this.send({
        action: "subscribe",
        topic,
      });
    }
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(rawData: string | Buffer): void {
    try {
      const data = JSON.parse(rawData.toString());
      
      if (data.topic) {
        this.emit(data.topic, data);
      }
      this.emit("message", data);
    } catch (error) {
      this.log("Failed to parse message:", error);
    }
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: "ping" }));
      }
    }, this.options.pingInterval);
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.state = "disconnected";
      this.emit("max_reconnect_attempts");
      return;
    }

    this.state = "reconnecting";
    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log("[RTDS-WS]", ...args);
    }
  }
}

// ============================================================================
// SPORTS WEBSOCKET CLIENT (Live sports updates)
// ============================================================================

export class PolymarketSportsWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";

  private readonly WS_URL = "wss://sports-api.polymarket.com/ws";

  /**
   * Connect to Sports WebSocket (public broadcast, no subscription needed)
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === "connected") {
        resolve();
        return;
      }

      this.state = "connecting";

      try {
        this.ws = new WebSocket(this.WS_URL);

        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
          this.ws?.close();
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.state = "connected";
          this.emit("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            this.emit("update", data);
            this.emit("message", data);
          } catch {
            // Ignore parse errors
          }
        };

        this.ws.onclose = () => {
          this.state = "disconnected";
          this.emit("disconnected");
        };

        this.ws.onerror = (error) => {
          this.emit("error", error);
          if (this.state === "connecting") {
            clearTimeout(timeout);
            reject(error);
          }
        };
      } catch (error) {
        this.state = "disconnected";
        reject(error);
      }
    });
  }

  /**
   * Disconnect from Sports WebSocket
   */
  disconnect(): void {
    this.state = "disconnected";
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Default instances for easy use
export const clobWebSocket = new PolymarketCLOBWebSocket();
export const rtdsWebSocket = new PolymarketRTDSWebSocket();
export const sportsWebSocket = new PolymarketSportsWebSocket();
