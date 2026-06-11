import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        ws: true,
        cookieDomainRewrite: "localhost",
        cookiePathRewrite: "/",
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies from the original request
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
            if (mode === 'development') {
              console.log('Sending Request to the Target:', req.method, req.url);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // Ensure Set-Cookie headers are forwarded
            if (proxyRes.headers['set-cookie']) {
              proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map((cookie: string) => {
                // Update cookie domain and path for localhost:8080
                return cookie
                  .replace(/Domain=[^;]+/gi, '')
                  .replace(/Path=[^;]+/gi, 'Path=/')
                  .replace(/Secure/gi, '');
              });
            }
            if (mode === 'development') {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            }
          });
        },
      },
    },
  },
  plugins: [
    react(),
    // Sentry source map upload — silently no-ops if env vars are not set
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            // Hidden source maps: uploaded to Sentry, not served publicly
            sourcemaps: {
              filesToDeleteAfterUpload: ["./dist/**/*.map"],
            },
            telemetry: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Hidden source maps: .map files generated for Sentry but NOT referenced in bundles
    sourcemap: "hidden",
    // Raise chunk warning threshold — we've manually split heavy deps
    chunkSizeWarningLimit: 600,
    // CSS code splitting: landing.css only loads on landing pages
    cssCodeSplit: true,
    // Fast minification
    minify: "esbuild",
    rollupOptions: {
      output: {
        /**
         * Manual chunk strategy — splits heavy dependencies into named chunks
         * so the initial bundle is as lean as possible.
         *
         * Chunk groups:
         *  vendor-react     — React core + router (always needed)
         *  vendor-ui        — Radix UI components + Lucide icons
         *  vendor-forms     — Form handling + validation
         *  vendor-query     — Data fetching + table
         *  vendor-charts    — Recharts (heavy — only used on Dashboard/Billing)
         *  vendor-editor    — Rich text editor + document export (heavy — only on Templates/Notes)
         *  vendor-socket    — Socket.IO client (only used in authenticated views)
         *  vendor-sentry    — Sentry SDK (error monitoring)
         */
        manualChunks(id) {
          // React core + router
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          // Radix UI + Lucide (UI primitives)
          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/class-variance-authority/") ||
            id.includes("node_modules/clsx/") ||
            id.includes("node_modules/tailwind-merge/") ||
            id.includes("node_modules/cmdk/") ||
            id.includes("node_modules/vaul/") ||
            id.includes("node_modules/sonner/") ||
            id.includes("node_modules/embla-carousel-react/") ||
            id.includes("node_modules/input-otp/")
          ) {
            return "vendor-ui";
          }

          // Form handling + validation
          if (
            id.includes("node_modules/react-hook-form/") ||
            id.includes("node_modules/@hookform/") ||
            id.includes("node_modules/zod/") ||
            id.includes("node_modules/react-day-picker/")
          ) {
            return "vendor-forms";
          }

          // Data fetching + table
          if (
            id.includes("node_modules/@tanstack/react-query/") ||
            id.includes("node_modules/@tanstack/react-table/") ||
            id.includes("node_modules/@tanstack/query-core/")
          ) {
            return "vendor-query";
          }

          // Charts (heavy — Dashboard/Billing only)
          if (id.includes("node_modules/recharts/")) {
            return "vendor-charts";
          }

          // Document export (heavy — Templates/Notes only)
          if (
            id.includes("node_modules/docx/") ||
            id.includes("node_modules/jspdf/") ||
            id.includes("node_modules/html-docx-js-typescript/") ||
            id.includes("node_modules/file-saver/") ||
            id.includes("node_modules/react-quill-new/")
          ) {
            return "vendor-editor";
          }

          // Socket.IO (authenticated views only)
          if (
            id.includes("node_modules/socket.io-client/") ||
            id.includes("node_modules/engine.io-client/")
          ) {
            return "vendor-socket";
          }

          // Sentry SDK
          if (id.includes("node_modules/@sentry/")) {
            return "vendor-sentry";
          }

          // date-fns
          if (id.includes("node_modules/date-fns/")) {
            return "vendor-datefns";
          }
        },
      },
    },
  },
}));
