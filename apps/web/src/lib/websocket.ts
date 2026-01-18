/**
 * WebSocket connection manager for real-time updates
 * Provides automatic reconnection and connection pooling
 */

type MessageHandler = (data: any) => void;
type ErrorHandler = (error: Event) => void;

interface WebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;
  
  private options: Required<WebSocketOptions> = {
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  };

  constructor(url: string, options?: WebSocketOptions) {
    this.url = url;
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug('[WebSocket] Connected');
        }
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach((handler) => handler(data));
        } catch {
          // Silently ignore parse errors in production
        }
      };

      this.ws.onerror = (error) => {
        this.errorHandlers.forEach((handler) => handler(error));
      };

      this.ws.onclose = () => {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug('[WebSocket] Disconnected');
        }
        this.stopHeartbeat();
        
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
    // Silently ignore if not connected
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return; // Stop trying after max attempts
    }

    const delay = this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance for market updates
let marketUpdatesWS: WebSocketManager | null = null;

export function getMarketUpdatesWebSocket(): WebSocketManager {
  if (!marketUpdatesWS) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
    marketUpdatesWS = new WebSocketManager(wsUrl);
  }
  return marketUpdatesWS;
}

// React hook for WebSocket connection
export function useWebSocket(url: string, onMessage: MessageHandler) {
  if (typeof window === 'undefined') return;

  const ws = new WebSocketManager(url);
  
  ws.connect();
  const unsubscribe = ws.onMessage(onMessage);

  return () => {
    unsubscribe();
    ws.disconnect();
  };
}


