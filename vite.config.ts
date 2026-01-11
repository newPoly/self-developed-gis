import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'
import px2rem from 'postcss-plugin-px2rem'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
console.log(__dirname, '==__dirname')
const px2remOptions = {
  rootValue: 16,
  unitPrecision: 5,
  exclude: false,
  mediaQuery: false,
  minPixelValue: 0
}

export default defineConfig(({ mode }) => {
  const processCwd = path.join(__dirname, '/env')
  const env = loadEnv(mode, processCwd)
  console.log(env, '当前环境')
  // 确保 env.VITE_TARGET_URL 存在且不为空
  if (!env.VITE_TARGET_URL) {
    throw new Error('VITE_TARGET_URL is not defined in the environment variables.')
  }
  return {
    css: {
      postcss: {
        plugins: [px2rem(px2remOptions)]
      }
    },
    base: env.VITE_BASE_URL,
    plugins: [
      vue(),
      AutoImport({
        imports: [
          'vue', // 自动导入 Vue 相关函数
          'vue-router',
          'pinia'
        ],
        dts: 'src/auto-imports.d.ts', // 生成自动导入的声明文件
        eslintrc: {
          enabled: true, // 生成 eslint 配置
          filepath: './.eslintrc-auto-import.json' // 指定生成路径
        }
      }),
      Components({
        dts: 'src/components.d.ts'
      })
    ],

    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 46000,
      assetsInlineLimit: 0,
      manifest: false,
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: `assets/[name].[ext]`,
          globals: {
            vue: 'Vue'
          }
        }
      }
    },
    server: {
      host: '127.0.0.1',
      port: 9000,
      hmr: {
        overlay: false // 禁用错误覆盖层，避免干扰
      },
      open: true,
      proxy: {
        '^/api': {
          target: env.VITE_TARGET_URL,
          ws: true,
          changeOrigin: true
          // bypass(req, res, options) {
          //   const proxyURL = options.target
          //   console.log('proxyURL : ', proxyURL)
          // },
        }
      },
      // 确保静态文件服务正常工作
      fs: {
        strict: false,
        allow: ['..']
      }
    },
    envDir: './env',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    optimizeDeps: {
      include: ['leaflet']
    },
    appType: 'spa',
    publicDir: 'public' // 确保 public 目录被正确配置
  }
})
