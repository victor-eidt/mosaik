import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal local declaration so tsc doesn't need @types/node just for this file
// (pulling in @types/node would change Node globals — e.g. setTimeout return
// types — across the browser source).
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 5173 },
});
