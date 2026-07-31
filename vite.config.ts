import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// BASE_PATH lets GitHub Pages serve the site from a sub-path
// (e.g. https://<user>.github.io/<repo>/). Locally it defaults to '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
