import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'layout-module': path.resolve(__dirname, '../dist/esm/index.js'),
    },
  },
  plugins: [react()],
  server: {
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 500, // чтобы vite дождался завершения компиляции модуля
        pollInterval: 100
      },
      // Отслеживаем изменения в модуле
      ignored: ['!**/node_modules/layout-module/**'],
    },
  },
  optimizeDeps: {
    // Исключаем модуль из пред-сборки Vite
    exclude: ['layout-module'],
  },
})
