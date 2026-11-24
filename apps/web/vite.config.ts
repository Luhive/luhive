import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  return {
    ssr: {},
    server: {
      allowedHosts: ["screenshot-exactly-baker-trembl.trycloudflare.com"],
    },
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
    ],
    assetsInclude: ["**/*.lottie"],
  };
});
