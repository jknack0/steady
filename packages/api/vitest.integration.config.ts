import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./src/__tests__/integration/global-setup.ts"],
    setupFiles: ["./src/__tests__/integration/setup.ts"],
    include: ["src/__tests__/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    // Run test files sequentially to avoid DB conflicts
    fileParallelism: false,
  },
});
