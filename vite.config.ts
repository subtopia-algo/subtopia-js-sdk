import path, { extname, relative } from "path";
import { defineConfig } from "vite";
import * as packageJson from "./package.json";
import { fileURLToPath } from "url";
import { glob } from "glob";
import dts from "vite-plugin-dts";

export default defineConfig({
  base: "./",
  plugins: [
    dts({
      exclude: [],
      outDir: "dist/types",
      beforeWriteFile: (filePath, content) => {
        return {
          filePath: filePath.replace("src/", ""),
          content: content.replace(/from "\.\/(.*?\.d\.ts)"/g, 'from "./$1"'),
        };
      },
    }),
  ],
  build: {
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "subtopia",
      formats: ["es", "cjs"],
      fileName: (format) => `${format}/index.js`,
    },
    rollupOptions: {
      external: [...Object.keys(packageJson.peerDependencies)],
      input: Object.fromEntries(
        glob
          .sync("src/**/*.ts", {
            ignore: ["src/**/*.d.ts", "**/*.spec.ts", "**/__fixtures__/**"],
          })
          .map((file) => [
            relative("src", file.slice(0, file.length - extname(file).length)),
            fileURLToPath(new URL(file, import.meta.url)),
          ]),
      ),
      output: [
        {
          format: "es",
          dir: "dist/esm",
          entryFileNames: "[name].js",
          assetFileNames: "assets/[name][extname]",
        },
        {
          format: "cjs",
          dir: "dist/cjs",
          entryFileNames: "[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      ],
    },
  },
});
