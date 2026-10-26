/**
 * Interaction sounds, behind one module so call sites never import the engine.
 * Use as a namespace: `import * as Sound from "~/shared/lib/sound/sound"`.
 *
 * Today the engine is cuelume (Web Audio, SSR-safe). Swapping it means changing
 * this file only: the cue names, the attribute helper and the functions below are ours.
 */
import * as Engine from "cuelume";

/** Interaction cues: fired by an element when the user acts on it (see `cue`). */
export type InteractionCue = "tap" | "type" | "select" | "toggle" | "open" | "close" | "navigate";

/** Outcome cues: played from code when something finishes. */
export type OutcomeCue = "success" | "warning" | "error";

export type Cue = InteractionCue | OutcomeCue;

export type Emphasis = "subtle" | "normal" | "strong";

/**
 * Props that make an element sound when the user interacts with it, e.g.
 * `<input {...Sound.cue("type", { emphasis: "subtle" })} />`. Takes effect under a
 * root passed to `bind`.
 */
export function cue(
  name: InteractionCue,
  options: { emphasis?: Emphasis } = {},
): Record<string, string> {
  return {
    [`data-cuelume-${name}`]: "",
    ...(options.emphasis && { "data-cuelume-emphasis": options.emphasis }),
  };
}

/** Wires every `cue(...)` element under `root`. Returns its cleanup, for `useEffect`. */
export function bind(root: ParentNode): () => void {
  return Engine.bind(root);
}

/** Plays a cue now. A no-op on the server and while the browser still blocks audio. */
export function play(name: Cue, options: { emphasis?: Emphasis } = {}): void {
  Engine.play(name, options);
}

/** Turns all sound on or off. Not persisted; the caller owns the preference. */
export function setEnabled(enabled: boolean): void {
  Engine.setEnabled(enabled);
}

/** Starts audio. Call inside a user gesture; resolves to whether sound can play. */
export function unlock(): Promise<boolean> {
  return Engine.unlock();
}
