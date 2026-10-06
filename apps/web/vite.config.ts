import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const sharedSrc = path.resolve(webRoot, "../../packages/shared/src/index.ts");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@ascent/shared": sharedSrc,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    setupFiles: ["src/test/setup.ts"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
