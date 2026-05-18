import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
