/*
 * @Description: 
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2025-09-13 16:55:45
 * @LastEditors: 
 * @LastEditTime: 2025-09-14 09:03:14
 * @FilePath: \leaflet-self-webiste\src\router\index.ts
 * Copyright (C) 2025 liuhaobo. All rights reserved.
 */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/map'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue')
  },
  {
    path: '/map',
    name: 'MapDemo',
    component: () => import('@/views/map/MapDemo.vue')
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
