import { useEffect, useState } from "react";

const DURATION_MS = 600;

function easeOut(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export function useCountUp(target: number, storageKey: string) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = window.sessionStorage.getItem(storageKey) === "1";
    if (reduced || seen || target === 0) {
      setValue(target);
      window.sessionStorage.setItem(storageKey, "1");
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    setValue(0);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / DURATION_MS);
      setValue(Math.round(target * easeOut(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else window.sessionStorage.setItem(storageKey, "1");
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [storageKey, target]);

  return value;
}
