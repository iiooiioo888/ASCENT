import { useEffect, useState } from "react";

/** Drives client-side progress interpolation between state polls. */
export function useProgressTick(active: boolean, intervalMs = 200): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return nowMs;
}
