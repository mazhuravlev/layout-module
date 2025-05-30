import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/layout-module/',
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'layout-module': path.resolve(__dirname, '../layout-module/dist/esm'),
      // Или для исходников (если нужен HMR):
      //'layout-module': path.resolve(__dirname, '../layout-module/src')
    },
  },
  plugins: [react()],
  server: {
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 50, // чтобы vite дождался завершения компиляции модуля
        pollInterval: 100
      },
      // Отслеживаем изменения в модуле
      ignored: ['!../layout-module/dist/esm/**'],
    },
  },
  optimizeDeps: {
    // Исключаем модуль из пред-сборки Vite
    exclude: ['layout-module'],
  },
  publicDir: 'public',
})
