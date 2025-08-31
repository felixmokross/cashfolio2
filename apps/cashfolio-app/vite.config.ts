import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), !isStorybook() && reactRouter(), tsconfigPaths()],
});

function isStorybook() {
  return process.argv[1]?.includes("storybook");
}
