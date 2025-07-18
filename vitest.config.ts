import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    hookTimeout: 10_000_000,
    testTimeout: 180000, // 3 minutes in milliseconds
    // Disable isolation to allow debugging with breakpoints
    isolate: false,
    // Disable concurrent test execution
    fileParallelism: false,
    maxConcurrency: 1,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
