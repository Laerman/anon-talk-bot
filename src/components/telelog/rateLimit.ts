const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createRateLimiter(rps: number) {
  const stamps: number[] = [];
  let chain: Promise<void> = Promise.resolve();

  const acquire = async () => {
    const now = Date.now();
    while (stamps.length && now - stamps[0] >= 1000) stamps.shift();
    if (stamps.length >= rps) {
      await sleep(1000 - (now - stamps[0]) + 5);
      return acquire();
    }
    stamps.push(Date.now());
  };

  return () => {
    const next = chain.then(acquire);
    chain = next.catch(() => undefined);
    return next;
  };
}

export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runner = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));
  return results;
}

export { sleep };
