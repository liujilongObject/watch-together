import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      collections: {
        'material-symbols': () => import('@iconify-json/material-symbols'),
      },
    }),
  ],
}) 