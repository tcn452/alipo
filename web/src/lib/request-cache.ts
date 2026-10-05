// Per-tab cache for public data. Failed loads are retried; concurrent loads share a request.
export function createRequestCache(now: () => number = Date.now) {
  const values = new Map<string, { value: unknown; expiresAt: number }>();
  const pending = new Map<string, Promise<unknown>>();

  return {
    get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
      const cached = values.get(key);
      if (cached && now() < cached.expiresAt) return Promise.resolve(cached.value as T);
      const existing = pending.get(key);
      if (existing) return existing as Promise<T>;

      const request = Promise.resolve().then(load).then((value) => {
        if (ttlMs > 0) values.set(key, { value, expiresAt: now() + ttlMs });
        return value;
      }).finally(() => pending.delete(key));
      pending.set(key, request);
      return request;
    },
  };
}
