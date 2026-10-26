import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import * as Sound from "~/shared/lib/sound/sound";

const STORAGE_KEY = "luhive_sound";

function readStoredPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * Sound on/off for the /app interaction sounds. The sound module does not persist
 * the setting, so the page owns it: stored per browser, on by default.
 */
export function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const stored = readStoredPreference();
    setOn(stored);
    Sound.setEnabled(stored);
  }, []);

  const toggle = async () => {
    const next = !on;
    Sound.setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Private mode or blocked storage: the setting just won't survive a reload.
    }
    if (next) {
      // Called inside the click, so the browser lets audio start. Trust its result.
      const unlocked = await Sound.unlock();
      setOn(unlocked);
      if (unlocked) Sound.play("toggle");
    } else {
      setOn(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      className="waitlist-press fixed bottom-4 right-4 z-40 flex size-10 items-center justify-center rounded-full border border-foreground/10 bg-white/80 text-foreground/70 shadow-[0px_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md transition-colors hover:text-foreground md:bottom-6 md:right-6"
    >
      {on ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
    </button>
  );
}
