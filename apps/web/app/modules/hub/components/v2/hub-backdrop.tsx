/**
 * Soft brand tint fixed to the top of the viewport, after Luma's page backdrop:
 * orange from the left, red in the middle, pink from the right, fading downwards.
 * The top edge starts at #fff3f1, the colour Safari uses for its bars (see app.css).
 * Sits at z-index -1, so the page root must create a stacking context (`isolate`).
 */
export function HubBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[260px] [mask-image:linear-gradient(to_bottom,black_35%,transparent)] bg-[radial-gradient(55%_120%_at_0%_0%,rgba(255,109,35,0.11),transparent_70%),radial-gradient(45%_110%_at_50%_0%,rgba(255,59,48,0.06),transparent_70%),radial-gradient(55%_120%_at_100%_0%,rgba(255,107,157,0.1),transparent_70%),linear-gradient(#fff3f1,rgba(255,243,241,0)_45%)]"
    />
  );
}
