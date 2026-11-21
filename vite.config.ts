// @lovable.dev/vite-tanstack-config supplies the Start, React, Tailwind and Nitro plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Relative asset URLs are required because the same build is served from
  // the ESP32 at http://192.168.4.1, not from a domain root.
  vite: { base: "./" },
  tanstackStart: {
    server: { entry: "server" },
    // Emit a static SPA shell so the dashboard can be hosted by ESP32 LittleFS.
    spa: {
      enabled: true,
      prerender: { outputPath: "/index.html", crawlLinks: false, retryCount: 0 },
    },
  },
});
