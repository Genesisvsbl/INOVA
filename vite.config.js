import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "WMS/frontend",
  plugins: [react()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
});
