import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './', // caminhos relativos: funciona no GitHub Pages (/expedicao-4.0/) e em qualquer outro host
  plugins: [react(), tailwindcss()],
})
