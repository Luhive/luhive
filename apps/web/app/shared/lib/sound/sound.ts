/**
 * Sounds, behind one module so call sites never import the engine.
 * Use as a namespace: `import * as Sound from "~/shared/lib/sound/sound"`.
 *
 * Today the engine is cuelume (Web Audio, SSR-safe). Swapping it means changing
 * this file only: the cue names and the functions below are ours.
 */
import * as Engine from "cuelume";

/** Outcome cues, played from code when something finishes. */
export type Cue = "success";

export type Emphasis = "subtle" | "normal" | "strong";

/** Plays a cue now. A no-op on the server and while the browser still blocks audio. */
export function play(name: Cue, options: { emphasis?: Emphasis } = {}): void {
  Engine.play(name, options);
}
