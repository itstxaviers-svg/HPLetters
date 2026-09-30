import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  base: mode === 'github' ? '/HPLetters/' : '/',
  build: { target: 'es2018' },
  plugins: [react(), tailwindcss()],
}))
