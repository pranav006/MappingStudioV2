import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true, // listen on 0.0.0.0 so other devices on the network can open the app
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
    }
})
