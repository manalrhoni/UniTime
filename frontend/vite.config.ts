import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Indispensable pour Docker
    strictPort: true,
    port: 5173,
    watch: {
      usePolling: true, // <--- C'EST LA CLÉ DU SUCCÈS SUR WINDOWS
    }
  }
})