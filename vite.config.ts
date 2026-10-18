import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds doctor/ into dist/ (one index.html).
export default defineConfig({
  root: 'doctor',
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: '../dist', emptyOutDir: true },
})
