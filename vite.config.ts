import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "subtopia",
      formats: ["es", "cjs", "umd", "iife"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ["algosdk", "beaker-ts"],
      output: {
        sourcemap: true,
        globals: {
          algosdk: "algosdk",
          "beaker-ts": "beaker-ts",
        },
      },
    },
  },
});
