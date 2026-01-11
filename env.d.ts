/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 全局类型声明
declare global {
  interface Window {
    proj4: any
  }
}

declare module 'postcss-plugin-px2rem' {
  interface Px2remOptions {
    rootValue?: number
    unitPrecision?: number
    exclude?: boolean | RegExp | ((file: string) => boolean)
    mediaQuery?: boolean
    minPixelValue?: number
  }
  
  const px2rem: (options?: Px2remOptions) => any
  export default px2rem
}