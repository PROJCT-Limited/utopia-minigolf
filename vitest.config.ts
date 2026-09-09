// FILE: vitest.config.ts
// -----------------------------------------------------------------------------
// The unit tests run outside Next's bundler, so the "@/*" path alias from
// tsconfig.json has to be repeated here — without it, any tested module that
// imports a real value (not just a type) across the lib/ tree fails to
// resolve. No plugins: everything under test is deliberately pure TypeScript
// with no JSX and no database.
// -----------------------------------------------------------------------------
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
