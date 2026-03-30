export class TypedEventEmitter<EventMap extends Record<string, unknown>> {
  private listeners: Map<keyof EventMap, Set<(data: unknown) => void>> = new Map();

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (data: unknown) => void);

    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler as (data: unknown) => void);
        if (handlers.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  once<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    const wrappedHandler = (data: EventMap[K]) => {
      handler(data);
      unsubscribe();
    };

    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${String(event)}":`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
