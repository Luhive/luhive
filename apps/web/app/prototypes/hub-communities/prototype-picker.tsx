import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./prototype-picker.css";

type PrototypePickerProps = {
  names: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onReplay: () => void;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable;
}

export function PrototypePicker({ names, activeIndex, onSelect, onReplay }: PrototypePickerProps) {
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isReady, setIsReady] = useState(false);

  useIsomorphicLayoutEffect(() => {
    function moveHighlight() {
      const item = itemRefs.current[activeIndex];
      const highlight = highlightRef.current;
      if (!item || !highlight) return;
      highlight.style.width = `${item.offsetWidth}px`;
      highlight.style.transform = `translateX(${item.offsetLeft}px)`;
    }
    moveHighlight();
    window.addEventListener("resize", moveHighlight);
    return () => window.removeEventListener("resize", moveHighlight);
  }, [activeIndex]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setIsReady(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= names.length) onSelect(number - 1);
      else if (event.key === "ArrowRight") onSelect((activeIndex + 1) % names.length);
      else if (event.key === "ArrowLeft") onSelect((activeIndex - 1 + names.length) % names.length);
      else if (event.key === "r" || event.key === "R") onReplay();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, names.length, onReplay, onSelect]);

  return (
    <nav
      ref={pickerRef}
      className="proto-picker"
      aria-label="Prototype variants"
      data-ready={isReady ? "" : undefined}
    >
      <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
      {names.map((name, index) => (
        <button
          key={name}
          ref={(element) => {
            itemRefs.current[index] = element;
          }}
          type="button"
          className="proto-picker-item"
          data-active={index === activeIndex ? "" : undefined}
          aria-current={index === activeIndex ? "true" : undefined}
          onClick={() => onSelect(index)}
        >
          {name}
        </button>
      ))}
      <span className="proto-picker-divider" aria-hidden="true" />
      <button
        type="button"
        className="proto-picker-item proto-picker-replay"
        aria-label="Replay animation (R)"
        onClick={onReplay}
      >
        ↻
      </button>
    </nav>
  );
}
