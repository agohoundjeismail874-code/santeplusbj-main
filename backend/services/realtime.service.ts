export type RealtimeEvent = {
  type: string;
  entity: string;
  entityId?: string;
  patientIdentityUuid?: string;
  audienceUserIds?: number[];
  timestamp: string;
};

type RealtimeClient = (event: RealtimeEvent) => void;

const clients = new Set<RealtimeClient>();

export function subscribeRealtime(client: RealtimeClient): () => void {
  clients.add(client);
  return () => clients.delete(client);
}

export function publishRealtimeEvent(event: Omit<RealtimeEvent, 'timestamp'>): void {
  const protectedEntities = new Set([
    'patient', 'consultation', 'prescription', 'medical-document', 'invoice', 'payment', 'appointment',
  ]);
  if (protectedEntities.has(event.entity) && (!event.audienceUserIds || event.audienceUserIds.length === 0)) {
    console.warn(`[Realtime] Event ${event.entity} ignored because no audience was provided`);
    return;
  }

  const completeEvent: RealtimeEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  for (const client of clients) {
    try {
      client(completeEvent);
    } catch {
      clients.delete(client);
    }
  }
}