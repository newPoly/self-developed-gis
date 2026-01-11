<!--
 * @Description: 
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2025-08-28 15:28:39
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-08-28 16:16:25
 * @FilePath: \gisportal\src\App.vue
 * Copyright (C) 2025 liuhaobo. All rights reserved.
-->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

body, html {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
