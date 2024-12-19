import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { presetUno, presetAttributify, presetIcons } from 'unocss'
import 'dotenv/config'

// https://vite.dev/config/
export default defineConfig({
  root: './client',
  define: {
    'process.env': {
      USER_IDENTITY: process.env.USER_IDENTITY,
      PORT: process.env.PORT,
      BASE_API_URL: '' // 部署到生产环境后，需提供的生产环境服务器 API 地址
    }
  },
  plugins: [
    vue(),
    UnoCSS({
      presets: [
        presetUno(),
        presetAttributify(),
        presetIcons()
      ]
    })
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../server/static',
    emptyOutDir: true
  }
})
