import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const withTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

const base = withTrailingSlash(process.env.VITE_BASE_PATH ?? "/");

export default defineConfig({
  base,
  build: {
    outDir: process.env.VITE_OUT_DIR ?? "dist",
    emptyOutDir: true,
  },
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/stryker-tmp/**", "**/.stryker-tmp/**"],
  },
});
