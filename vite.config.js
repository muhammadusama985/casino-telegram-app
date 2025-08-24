import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
        react(),
        tailwindcss()
  ],
  server: {
    proxy: {
      '/admin': 'https://b33ff2158e32.ngrok-free.app',
    }
  }

})
