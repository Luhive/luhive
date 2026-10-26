import { useEffect, useState } from "react";

const formatCount = (count: number) => count.toLocaleString("en-US");
const ROLL_MS = 400; // M7: 150 ms delay + 250 ms roll

/**
 * "N people subscribed". Static on load (no count-up); when the number changes
 * after the visitor's own signup, the old value rolls up and out (motion M7).
 */
export function SubscribedCounter({ count }: { count: number }) {
  const [shown, setShown] = useState(count);
  const [outgoing, setOutgoing] = useState<number | null>(null);

  // Derived during render, so the old number keeps its DOM node and can transition out.
  if (count !== shown) {
    setOutgoing(shown);
    setShown(count);
  }

  useEffect(() => {
    if (outgoing === null) return;
    const timer = setTimeout(() => setOutgoing(null), ROLL_MS);
    return () => clearTimeout(timer);
  }, [outgoing]);

  return (
    <p className="text-base text-muted-foreground">
      <span className="waitlist-count font-semibold tracking-tight text-foreground">
        {outgoing !== null && (
          <span key={outgoing} data-out aria-hidden>
            {formatCount(outgoing)}
          </span>
        )}
        <span key={shown} data-in={outgoing !== null ? "" : undefined}>
          {formatCount(shown)}
        </span>
      </span>{" "}
      people subscribed
    </p>
  );
}
