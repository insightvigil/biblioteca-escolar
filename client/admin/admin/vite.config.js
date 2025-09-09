import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
   server: {
    port: 5174,     // ← cambia este número al puerto que quieras
    strictPort: true // opcional: si el puerto está ocupado, falla en vez de elegir otro
  }
})
