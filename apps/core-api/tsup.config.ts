import { defineConfig } from "tsup";

export default defineConfig({
  // start.ts is a separate entry because it is preloaded with `node --import`
  // rather than imported. See the comment in that file.
  entry: ["src/index.ts", "src/telemetry/start.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: [/^@luhive\//],
});
