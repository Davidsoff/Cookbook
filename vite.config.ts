import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const withTrailingSlash = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

const base = withTrailingSlash(process.env.VITE_BASE_PATH ?? "/");

export default defineConfig({
  base,
  plugins: [vue()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/stryker-tmp/**", "**/.stryker-tmp/**"],
  },
});
