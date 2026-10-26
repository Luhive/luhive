import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Sticker-style icons scattered around the /app hero, anchored to the content block
 * (not the viewport) so they stay centred at any width. Each one is a small inline SVG;
 * the white die-cut outline, shadow and tilt come from CSS (`.hero-sticker*` in app.css).
 * Motion M12 in docs/mobile-app-waitlist.md: a flight out from the hero's centre once the
 * hero has loaded, an idle float, and a pointer drift on desktop. Swap the SVGs for Ali's designs without touching the layout.
 */

function BellSticker() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <path d="M32 6c2.2 0 4 1.8 4 4v1.6c8.1 1.8 14 9 14 17.6v9.6l4.6 6.9c1.3 2-.1 4.3-2.4 4.3H11.8c-2.3 0-3.7-2.3-2.4-4.3L14 38.8v-9.6c0-8.6 5.9-15.8 14-17.6V10c0-2.2 1.8-4 4-4Z" fill="#FF6D23" />
      <path d="M24.5 52h15a7.5 7.5 0 0 1-15 0Z" fill="#C2410C" />
      <path d="M22 26.5c.8-4.4 3.8-7.8 7.8-9" stroke="#FFD3BC" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <circle cx="48" cy="13" r="7" fill="#FACC15" />
    </svg>
  );
}

function TicketSticker() {
  return (
    <svg viewBox="0 0 72 48" aria-hidden>
      <path d="M6 4h60a4 4 0 0 1 4 4v9a7 7 0 0 0 0 14v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-9a7 7 0 0 0 0-14V8a4 4 0 0 1 4-4Z" fill="#FF8A4C" />
      <path d="M6 4h14v40H6a4 4 0 0 1-4-4v-9a7 7 0 0 0 0-14V8a4 4 0 0 1 4-4Z" fill="#F25F5C" />
      <g fill="#fff">
        <rect x="31" y="13" width="7" height="7" rx="1.2" />
        <rect x="31" y="28" width="7" height="7" rx="1.2" />
        <rect x="46" y="13" width="7" height="7" rx="1.2" />
        <rect x="41" y="23" width="4" height="4" rx="0.8" />
        <rect x="48" y="28" width="5" height="3.5" rx="0.8" />
        <rect x="46" y="32" width="3.5" height="3" rx="0.8" />
      </g>
    </svg>
  );
}

function PinSticker() {
  return (
    <svg viewBox="0 0 56 64" aria-hidden>
      <path d="M28 4C16.4 4 7 13.2 7 24.6 7 39.4 24.3 56.6 26.4 58.6a2.3 2.3 0 0 0 3.2 0C31.7 56.6 49 39.4 49 24.6 49 13.2 39.6 4 28 4Z" fill="#3B82F6" />
      <circle cx="28" cy="24.5" r="8.5" fill="#fff" />
      <path d="M15.5 19c1.4-4.3 4.7-7.6 9-8.9" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function PhoneSticker() {
  return (
    <svg viewBox="0 0 48 72" aria-hidden>
      <rect x="4" y="2" width="40" height="68" rx="9" fill="#1F1F1F" />
      <rect x="8" y="9" width="32" height="54" rx="4.5" fill="#fff" />
      <rect x="18" y="5" width="12" height="2.2" rx="1.1" fill="#4B4B4B" />
      <rect x="12" y="14" width="10" height="10" rx="2.6" fill="#FF6D23" />
      <rect x="26" y="14" width="10" height="10" rx="2.6" fill="#FACC15" />
      <rect x="12" y="28" width="10" height="10" rx="2.6" fill="#22C55E" />
      <rect x="26" y="28" width="10" height="10" rx="2.6" fill="#A78BFA" />
      <rect x="12" y="42" width="10" height="10" rx="2.6" fill="#38BDF8" />
      <rect x="26" y="42" width="10" height="10" rx="2.6" fill="#F472B6" />
    </svg>
  );
}

type StickerSpec = {
  key: string;
  node: ReactNode;
  /** Position inside the 780 px sticker frame, as CSS lengths. */
  style: CSSProperties;
  tilt: number;
  /** Pointer drift strength: further-out stickers move more. */
  depth: number;
  /** Shown on phones too; the rest are md+ only. */
  mobile?: boolean;
  width: string;
};

const STICKERS: StickerSpec[] = [
  { key: "bell", node: <BellSticker />, style: { top: "4%", left: "2%" }, tilt: -12, depth: 14, mobile: true, width: "clamp(2.75rem, 7vw, 4.25rem)" },
  { key: "ticket", node: <TicketSticker />, style: { top: "8%", right: "0%" }, tilt: 9, depth: 10, mobile: true, width: "clamp(3.5rem, 9vw, 5.5rem)" },
  { key: "pin", node: <PinSticker />, style: { bottom: "22%", left: "4%" }, tilt: 8, depth: 8, width: "3.5rem" },
  { key: "phone", node: <PhoneSticker />, style: { bottom: "18%", right: "5%" }, tilt: -9, depth: 12, width: "3.25rem" },
];

/** When the last hero piece (step 6: 360 ms delay + 300 ms) has finished. */
const HERO_LANDED_MS = 660;

export function HeroStickers() {
  const frameRef = useRef<HTMLDivElement>(null);

  // Launch (M12): once the hero stagger (M13) has landed, each sticker flies out from the
  // centre of the hero to its place. Its offset to the centre is measured here, since it
  // depends on the layout; the frame then gets data-launch and CSS runs the flight.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const box = frame.getBoundingClientRect();
    const centreX = box.left + box.width / 2;
    const centreY = box.top + box.height / 2;
    for (const item of frame.querySelectorAll<HTMLElement>(".hero-sticker-pop")) {
      const r = item.getBoundingClientRect();
      item.style.setProperty("--from-x", `${(centreX - (r.left + r.width / 2)).toFixed(1)}px`);
      item.style.setProperty("--from-y", `${(centreY - (r.top + r.height / 2)).toFixed(1)}px`);
    }
    // The hero's last piece lands at ~660 ms after load; start then, or now if hydration was slower.
    const wait = Math.max(0, HERO_LANDED_MS - performance.now());
    frame.style.setProperty("--launch-wait", `${Math.round(wait)}ms`);
    frame.dataset.launch = "";
  }, []);

  // Pointer drift, desktop only: each sticker eases towards the pointer offset scaled by its
  // depth. A critically damped follow written by hand, so no motion library on the main thread
  // beyond one rAF loop that sleeps when everything has settled.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reduce.matches) return;

    const items = Array.from(frame.querySelectorAll<HTMLElement>("[data-depth]"));
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      for (const item of items) {
        const depth = Number(item.dataset.depth);
        item.style.transform = `translate3d(${(current.x * depth).toFixed(2)}px, ${(current.y * depth).toFixed(2)}px, 0)`;
      }
      const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      // -1..1 from the viewport centre.
      target.x = (event.clientX / window.innerWidth - 0.5) * 2;
      target.y = (event.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      aria-hidden
      className="hero-sticker-frame pointer-events-none absolute inset-y-0 left-1/2 w-full max-w-[780px] -translate-x-1/2"
    >
      {/* Without JS nothing measures the flight, so just show the stickers. */}
      <noscript>
        <style>{".hero-sticker-pop{opacity:1!important}"}</style>
      </noscript>
      {STICKERS.map((sticker, index) => (
        <div
          key={sticker.key}
          className={`absolute ${sticker.mobile ? "" : "max-md:hidden"}`}
          style={{ ...sticker.style, width: sticker.width }}
        >
          <div data-depth={sticker.depth}>
            <div
              className="hero-sticker-pop"
              style={{ "--i": index } as CSSProperties}
            >
              <div
                className="hero-sticker-float"
                style={{ "--float-delay": `${-index * 1.3}s`, "--float-dur": `${4.6 + index * 0.5}s` } as CSSProperties}
              >
                <div
                  className="hero-sticker md:pointer-events-auto"
                  style={{ "--tilt": `${sticker.tilt}deg` } as CSSProperties}
                >
                  {sticker.node}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
