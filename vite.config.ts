import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'
import obfuscator from 'rollup-plugin-obfuscator'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    plugins: [
      vue(),
      ...(!isProduction ? [vueDevTools()] : [])
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      sourcemap: isProduction ? 'hidden' : false,
      rollupOptions: {
        plugins: [
          ...(isProduction ? [
            (obfuscator as any)({
              global: true,
              options: {
                compact: true,
                debugProtection: false,
                disableConsoleOutput: false,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.5,
                identifierNamesGenerator: 'hexadecimal',
                stringArray: true,
                stringArrayEncoding: ['base64'], 
                stringArrayThreshold: 0.75,
                unicodeEscapeSequence: false
              }
            })
          ] : [])
        ]
      }
    }
  }
})