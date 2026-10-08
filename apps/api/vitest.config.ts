import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: {
          syntax: "typescript",
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        target: "es2022",
      },
      module: {
        type: "es6",
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
  },
});
