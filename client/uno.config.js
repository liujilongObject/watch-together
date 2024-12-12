import { defineConfig } from 'unocss'
import { presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      collections: {
        'material-symbols': () => import('@iconify-json/material-symbols'),
      },
    }),
  ],
  // 添加全局样式
  preflights: [
    {
      getCSS: () => `
        body {
          margin: 0;
          padding: 0;
        }
      `
    }
  ],
  shortcuts: {
    'btn': 'px-4 py-2 rounded inline-block bg-teal-600 text-white cursor-pointer hover:bg-teal-700 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50',
    'icon-btn': 'text-[0.9em] inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600'
  }
})
