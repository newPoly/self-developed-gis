/*
 * @Description: 
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2025-09-15 09:06:00
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-09-16 14:08:13
 * @FilePath: \leaflet-self-website\src\main.ts
 * Copyright (C) 2025 liuhaobo. All rights reserved.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import mitt from 'mitt'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { setDomFontSize, convertPxToRem } from '@/utils/responsiveUtils'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'

// 预加载地图相关依赖
import 'leaflet/dist/leaflet.css'
import proj4 from 'proj4'
// @ts-ignore - proj4leaflet 没有官方类型定义
import 'proj4leaflet'

// 确保 proj4 在全局可用
window.proj4 = proj4
// main.js 或入口文件
document.addEventListener('DOMContentLoaded', () => {
  convertPxToRem()
})
const app = createApp(App)
setDomFontSize()
const Mit = mitt()
app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: zhCn
})
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// Vue3挂载全局API
app.config.globalProperties.$Bus = Mit
app.mount('#app')
