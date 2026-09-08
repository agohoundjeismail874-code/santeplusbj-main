export interface RealtimeEvent {
  type: string;
  entity: string;
  entityId?: string;
  timestamp: string;
}

export function subscribeRealtime(onEvent: (event: RealtimeEvent) => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const websocketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (typeof WebSocket !== 'undefined') {
    const socket = new WebSocket(`${websocketProtocol}//${window.location.host}/api/ws`);
    socket.onmessage = (message) => {
      try { onEvent(JSON.parse(message.data) as RealtimeEvent); } catch { /* ignore malformed events */ }
    };
    socket.onerror = () => socket.close();
    return () => socket.close();
  }

  if (typeof EventSource === 'undefined') return () => undefined;
  const source = new EventSource('/api/events');
  const handleMessage = (message: MessageEvent<string>) => {
    try {
      onEvent(JSON.parse(message.data) as RealtimeEvent);
    } catch {
      // Ignore malformed events and keep the stream alive.
    }
  };

  source.addEventListener('message', handleMessage);
  return () => {
    source.removeEventListener('message', handleMessage);
    source.close();
  };
}