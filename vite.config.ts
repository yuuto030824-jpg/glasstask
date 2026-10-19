import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Workers AI can only run remotely. Opt in with CF_REMOTE_BINDINGS=true after `wrangler login`;
    // otherwise local dev uses the API's heuristic fallback.
    cloudflare({ remoteBindings: process.env.CF_REMOTE_BINDINGS === "true" }),
  ],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
});
