/** Resolves to `fallback` and logs once `ms` passes, so a slow deferred query never holds the response stream open. */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.error(`${label} timed out after ${ms} ms`);
      resolve(fallback);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
