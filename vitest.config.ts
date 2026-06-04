import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests run in plain Node — the suites cover pure lib/ helpers
// (no DOM, no Next runtime). The `@/` alias mirrors tsconfig so test
// imports match app imports.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
