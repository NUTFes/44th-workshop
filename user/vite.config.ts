import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true
    },
    allowedHosts: [
      '.local',
      'localhost', 
      // '16dbd1de098c.ngrok-free.app',
      'hanabi.nutfes.net',
      'hanabi-stg.nutfes.net',
    ]
  }
})