<!--
 * @Description: Leaflet 地图容器组件
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2025-09-13
 * @Copyright: All rights reserved.
-->
<template>
  <div class="map-container">
    <div
      ref="mapRef"
      :id="mapId"
      class="map-content"
      :style="{ width: width, height: height }"
    ></div>
    
    <!-- 地图控制面板 -->
    <div v-if="showControls" class="map-controls">
      <el-button-group>
        <el-button size="small" @click="zoomIn" title="放大地图">
          <el-icon><Plus /></el-icon>
        </el-button>
        <el-button size="small" @click="zoomOut" title="缩小地图">
          <el-icon><Minus /></el-icon>
        </el-button>
        <el-button size="small" @click="resetView" title="重置视图到初始位置">
          <el-icon><Refresh /></el-icon>
        </el-button>
        <el-button size="small" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏显示地图'">
          <el-icon v-if="isFullscreen"><Minus /></el-icon>
          <el-icon v-else><FullScreen /></el-icon>
        </el-button>
      </el-button-group>
    </div>

    <!-- 图层切换面板 -->
    <div v-if="showLayerControl" class="layer-controls">
      <el-select v-model="currentLayer" @change="switchLayer" size="small" style="min-width: 150px;">
        <el-option
          v-for="layer in layerOptions"
          :key="layer.value"
          :label="layer.label"
          :value="layer.value"
        />
      </el-select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { mapService, type MapConfig, type MarkerConfig, type DrawOptions, L } from '@/utils/mapService'
import { loadMapConfig, getMapConfig, getTileLayerConfig } from '@/utils/mapConfig'
import type { Map as LeafletMap, Marker} from 'leaflet'

// 组件属性
interface Props {
  // 地图配置
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
  width?: string
  height?: string
  // 控制选项
  showControls?: boolean
  showLayerControl?: boolean
  zoomControl?: boolean
  attributionControl?: boolean
  // 图层选项
  tileLayerUrl?: string
  tileLayerOptions?: any
}


const props = withDefaults(defineProps<Props>(), {
  center: () => [37.5, 102.5],
  zoom: 7,
  minZoom: 1,
  maxZoom: 18,
  width: '100%',
  height: '400px',
  showControls: true,
  showLayerControl: true,
  zoomControl: false,
  attributionControl: true,
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})

const emit = defineEmits<{
  mapReady: [map: LeafletMap]
  mapClick: [event: any]
  mapZoom: [zoom: number]
  mapMove: [center: [number, number]]
  markerClick: [markerId: string, marker: Marker]
}>()

// 响应式数据
const mapRef = ref<HTMLElement>()
const mapId = ref(`map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
const map = ref<LeafletMap | null>(null)
const currentLayer = ref('amap-vec') // 默认选中高德电子
const isFullscreen = ref(false)

// 图层选项 - 从配置文件加载
const layerOptions = ref<Array<{ label: string; value: string }>>([])

// 初始化图层选项
const initLayerOptions = async () => {
  try {
    // 确保配置已加载
    await loadMapConfig()
    const config = getMapConfig()
    
    // 获取所有图层选项
    layerOptions.value = Object.entries(config.tileLayers).map(([key, layer]) => ({
      label: layer.name,
      value: key
    }))
    
    console.log('所有图层选项:', layerOptions.value)
  } catch (error) {
    console.error('加载图层选项失败:', error)
  }
}

// 初始化当前选中图层
const initCurrentLayer = async () => {
  try {
    await loadMapConfig()
    const config = getMapConfig()
    const visibleLayer = Object.entries(config.tileLayers).find(([_, layer]) => layer.visible)
    currentLayer.value = visibleLayer ? visibleLayer[0] : Object.keys(config.tileLayers)[0]
    console.log('当前选中图层:', currentLayer.value)
  } catch (error) {
    console.error('初始化当前图层失败:', error)
  }
}

// 地图初始化
const initMap = async () => {
  await nextTick()
  
  if (!mapRef.value) {
    console.error('地图容器元素未找到')
    return
  }

  console.log('开始初始化地图...', mapRef.value)

  // 初始化图层选项和当前选中图层
  await initLayerOptions()
  await initCurrentLayer()

  // 检查默认图层是否是百度地图，如果是则强制使用百度投影
  const defaultLayerConfig = getTileLayerConfig(currentLayer.value)
  const needsBaiduProjection = defaultLayerConfig && 
    (defaultLayerConfig.name.includes('百度') || defaultLayerConfig.url.includes('bdimg.com'))

  console.log('初始化投影检查:', {
    currentLayerValue: currentLayer.value,
    defaultLayerConfig: defaultLayerConfig?.name,
    needsBaiduProjection
  })

  const config: MapConfig = {
    container: mapRef.value,
    center: props.center,
    zoom: props.zoom,
    minZoom: props.minZoom,
    maxZoom: props.maxZoom,
    zoomControl: props.zoomControl,
    attributionControl: props.attributionControl,
    useBaiduProjection: needsBaiduProjection || false  // 强制指定是否使用百度投影
  }

  try {
    if (needsBaiduProjection) {
      // 使用专门的百度地图初始化方法
      console.log('使用百度地图专用初始化方法')
      map.value = await mapService.initBaiduMap(mapRef.value, props.center, props.zoom)
    } else {
      // 使用标准地图初始化
      map.value = await mapService.initMap(config)
    }
    
    console.log('地图初始化成功:', map.value)
    
    // 绑定地图事件
    bindMapEvents()
    
    // 触发地图就绪事件
    emit('mapReady', map.value as LeafletMap)
  } catch (error) {
    console.error('地图初始化失败:', error)
  }
}

// 绑定地图事件
let eventsbound = false // 防止重复绑定事件
const bindMapEvents = () => {
  if (!map.value || eventsbound) return

  // 防抖定时器
  let zoomTimer: NodeJS.Timeout | null = null
  let moveTimer: NodeJS.Timeout | null = null

  // 点击事件
  mapService.on('click', (e: any) => {
    emit('mapClick', {
      latlng: [e.latlng.lat, e.latlng.lng],
      originalEvent: e
    })
  })

  // 缩放事件 - 添加防抖
  mapService.on('zoomend', () => {
    if (zoomTimer) {
      clearTimeout(zoomTimer)
    }
    zoomTimer = setTimeout(() => {
      const zoom = mapService.getZoom()
      if (zoom !== null) {
        emit('mapZoom', zoom)
      }
    }, 150)
  })

  // 移动事件 - 添加防抖
  mapService.on('moveend', () => {
    if (moveTimer) {
      clearTimeout(moveTimer)
    }
    moveTimer = setTimeout(() => {
      const center = mapService.getCenter()
      if (center) {
        emit('mapMove', center)
      }
    }, 150)
  })

  eventsbound = true
  console.log('地图事件绑定完成')
}

// 地图控制方法
const zoomIn = () => {
  const currentZoom = mapService.getZoom()
  if (currentZoom !== null) {
    mapService.setZoom(currentZoom + 1)
  }
}

const zoomOut = () => {
  const currentZoom = mapService.getZoom()
  if (currentZoom !== null) {
    mapService.setZoom(currentZoom - 1)
  }
}

const resetView = () => {
  mapService.setCenter(props.center, props.zoom)
}

const toggleFullscreen = () => {
  if (!mapRef.value) {
    console.warn('地图容器未找到')
    return
  }

  try {
    if (!document.fullscreenElement) {
      // 进入全屏
      mapRef.value.requestFullscreen().then(() => {
        console.log('地图已进入全屏模式')
        isFullscreen.value = true
        // 全屏后重新调整地图大小
        setTimeout(() => {
          if (map.value) {
            map.value.invalidateSize()
          }
        }, 100)
      }).catch(err => {
        console.error('进入全屏失败:', err)
      })
    } else {
      // 退出全屏
      document.exitFullscreen().then(() => {
        console.log('地图已退出全屏模式')
        isFullscreen.value = false
        // 退出全屏后重新调整地图大小
        setTimeout(() => {
          if (map.value) {
            map.value.invalidateSize()
          }
        }, 100)
      }).catch(err => {
        console.error('退出全屏失败:', err)
      })
    }
  } catch (error) {
    console.error('全屏功能不支持:', error)
  }
}

// 切换图层
const switchLayer = async (layerType: string) => {
  try {
    // 清除所有瓦片图层，确保没有残留
    console.log('清除所有旧图层...')
    mapService.clearAllTileLayers()
    
    // 从配置获取图层
    const layerConfig = getTileLayerConfig(layerType)
    
    if (layerConfig) {
      console.log(`切换到图层: ${layerConfig.name}`)
      
      // 检查是否是百度地图图层，如果是且当前地图不支持百度投影，则重新初始化地图
      const isBaiduLayer = layerConfig.name.includes('百度') || layerConfig.url.includes('bdimg.com')
      const currentMap = mapService.getMap()
      
      // 检查当前地图是否使用百度投影
      const isBaiduCRS = currentMap && (
        (currentMap.options.crs as any)?.code === 'EPSG:900913' ||
        (currentMap.options.crs as any) === (L.CRS as any).Baidu ||
        (currentMap.options.crs as any)?.options?.bounds // 百度CRS的特征
      )
      
      console.log(`切换图层调试信息:`, {
        layerName: layerConfig.name,
        layerUrl: layerConfig.url,
        isBaiduLayer,
        currentCRS: currentMap?.options.crs,
        crsCode: (currentMap?.options.crs as any)?.code,
        isBaiduCRS,
        needsReinitForBaidu: isBaiduLayer && currentMap && !isBaiduCRS,
        needsReinitForStandard: !isBaiduLayer && currentMap && isBaiduCRS
      })
      
      if (isBaiduLayer && currentMap && !isBaiduCRS) {
        console.log('需要重新初始化地图以支持百度投影')
        // 保存当前视图状态和绘制图形
        const center = mapService.getCenter()
        const zoom = mapService.getZoom()
        const drawingData = mapService.exportDrawings() // 导出绘制图形数据
        
        // 重置事件绑定状态
        eventsbound = false
        
        // 销毁当前地图
        mapService.destroyMap()
        
        // 重新初始化支持百度投影的地图
        const config = {
          container: mapRef.value!,
          center: center || props.center,
          zoom: zoom || props.zoom,
          minZoom: props.minZoom,
          maxZoom: props.maxZoom,
          zoomControl: props.zoomControl,
          attributionControl: props.attributionControl,
          useBaiduProjection: true
        }
        
        map.value = await mapService.initMap(config)
        bindMapEvents()
        emit('mapReady', map.value as LeafletMap)
        
        // 恢复绘制图形
        if (drawingData && drawingData.length > 0) {
          console.log('恢复绘制图形:', drawingData.length, '个')
          mapService.importDrawings(drawingData)
        }
        
        // 重新初始化后，稍作延迟再添加百度图层，确保地图完全加载
        console.log('百度地图重新初始化完成，添加图层:', layerConfig.name)
        await new Promise(resolve => setTimeout(resolve, 100))
        if (layerConfig.name.includes('影像')) {
          mapService.addBaiduSatelliteLayer()
          mapService.addBaiduAnnotationLayer()
        } else {
          mapService.addBaiduVectorLayer()
        }
      } else if (!isBaiduLayer && currentMap && isBaiduCRS) {
        console.log('需要重新初始化地图以支持标准投影')
        // 保存当前视图状态和绘制图形
        const center = mapService.getCenter()
        const zoom = mapService.getZoom()
        const drawingData = mapService.exportDrawings() // 导出绘制图形数据
        
        // 重置事件绑定状态
        eventsbound = false
        
        // 销毁当前地图
        mapService.destroyMap()
        
        // 清理百度地图的全局CRS设置
        console.log('清理百度地图CRS设置')
        
        // 重新初始化标准地图
        const config = {
          container: mapRef.value!,
          center: center || props.center,
          zoom: zoom || props.zoom,
          minZoom: props.minZoom,
          maxZoom: props.maxZoom,
          zoomControl: props.zoomControl,
          attributionControl: props.attributionControl,
          useBaiduProjection: false,
          forceStandardCRS: true // 强制使用标准坐标系
        }
        
        map.value = await mapService.initMap(config)
        bindMapEvents()
        emit('mapReady', map.value as LeafletMap)
        
        // 恢复绘制图形
        if (drawingData && drawingData.length > 0) {
          console.log('恢复绘制图形:', drawingData.length, '个')
          mapService.importDrawings(drawingData)
        }
        
        // 重新初始化后，稍作延迟再添加图层，确保地图完全加载
        console.log('地图重新初始化完成，添加图层:', layerConfig.name)
        await new Promise(resolve => setTimeout(resolve, 100))
        mapService.addTileLayerFromConfig('current', layerConfig)
        mapService.addAnnotationLayer(layerConfig)
      } else {
        // 不需要重新初始化，直接添加图层
        mapService.addTileLayerFromConfig('current', layerConfig)
        
        // 如果是影像图层，添加注记
        mapService.addAnnotationLayer(layerConfig)
      }
      
      // 更新配置中的 visible 状态（可选，用于记住用户选择）
      updateVisibleLayer(layerType)
    } else {
      console.error(`未找到图层配置: ${layerType}`)
    }
  } catch (error) {
    console.error('切换图层失败:', error)
  }
}

// 更新可见图层状态
const updateVisibleLayer = (selectedLayerId: string) => {
  try {
    const config = getMapConfig()
    // 将所有图层设为不可见
    Object.keys(config.tileLayers).forEach(key => {
      config.tileLayers[key].visible = false
    })
    // 设置选中的图层为可见
    if (config.tileLayers[selectedLayerId]) {
      config.tileLayers[selectedLayerId].visible = true
    }
    console.log(`图层 ${selectedLayerId} 设置为可见`)
  } catch (error) {
    console.error('更新图层可见状态失败:', error)
  }
}

// 对外暴露的方法
const addMarker = (markerId: string, config: MarkerConfig) => {
  const marker = mapService.addMarker(markerId, config)
  if (marker) {
    marker.on('click', () => {
      emit('markerClick', markerId, marker)
    })
  }
  return marker
}

const removeMarker = (markerId: string) => {
  mapService.removeMarker(markerId)
}

const clearMarkers = () => {
  mapService.clearMarkers()
}

const drawCircle = (center: [number, number], radius: number, options?: DrawOptions) => {
  return mapService.drawCircle(center, radius, options)
}

const drawPolygon = (positions: [number, number][], options?: DrawOptions) => {
  return mapService.drawPolygon(positions, options)
}

const drawPolyline = (positions: [number, number][], options?: DrawOptions) => {
  return mapService.drawPolyline(positions, options)
}

const clearDrawings = () => {
  mapService.clearDrawings()
}

const setCenter = (center: [number, number], zoom?: number) => {
  mapService.setCenter(center, zoom)
}

const getCenter = () => {
  return mapService.getCenter()
}

const setZoom = (zoom: number) => {
  mapService.setZoom(zoom)
}

const getZoom = () => {
  return mapService.getZoom()
}

const getMapInstance = () => {
  return mapService.getMap()
}

// 监听属性变化
watch(() => props.center, (newCenter) => {
  if (map.value) {
    setCenter(newCenter)
  }
})

// 移除zoom的监听器，避免与地图事件形成死循环
// watch(() => props.zoom, (newZoom) => {
//   if (map.value && newZoom) {
//     setZoom(newZoom)
//   }
// })

// 监听全屏状态变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
  // 全屏状态变化时重新调整地图大小
  setTimeout(() => {
    if (map.value) {
      map.value.invalidateSize()
    }
  }, 100)
}

// 生命周期
onMounted(() => {
  initMap()
  // 添加全屏状态变化监听
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  eventsbound = false
  mapService.destroyMap()
  // 清理全屏状态变化监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

// 对外暴露的图层添加方法
const addLayer = async (config: any) => {
  return await mapService.addLayer(config)
}

const removeLayer = (layerId: string) => {
  try {
    // 尝试移除瓦片图层
    mapService.removeTileLayer(layerId)
    
    // 同时尝试从地图中直接移除图层（处理 GeoJSON 等其他类型的图层）
    const mapInstance = mapService.getMap()
    if (mapInstance) {
      mapInstance.eachLayer((layer: L.Layer) => {
        // 检查图层是否有我们设置的 ID
        if ((layer as any).options?.id === layerId || (layer as any).layerId === layerId) {
          mapInstance.removeLayer(layer)
          console.log(`直接从地图移除图层: ${layerId}`)
        }
      })
    }
  } catch (error) {
    console.warn(`移除图层 ${layerId} 时出错:`, error)
  }
}

// 对外暴露的绘制方法
const startDrawingPoint = (options?: any) => {
  mapService.startDrawingPoint(options)
}

const startDrawingLine = (options?: any) => {
  mapService.startDrawingLine(options)
}

const startDrawingPolygon = (options?: any) => {
  mapService.startDrawingPolygon(options)
}

const startDrawingRectangle = (options?: any) => {
  mapService.startDrawingRectangle(options)
}

const startDrawingCircle = (options?: any) => {
  mapService.startDrawingCircle(options)
}

const stopDrawing = () => {
  mapService.stopDrawing()
}

const setDrawingCallbacks = (callbacks: any) => {
  mapService.setDrawingCallbacks(callbacks)
}

const getCurrentDrawingMode = () => {
  return mapService.getCurrentDrawingMode()
}

const startMeasureDistance = (options?: any) => {
  mapService.startMeasureDistance(options)
}

const startMeasureArea = (options?: any) => {
  mapService.startMeasureArea(options)
}

// 暴露组件方法
defineExpose({
  addMarker,
  removeMarker,
  clearMarkers,
  drawCircle,
  drawPolygon,
  drawPolyline,
  clearDrawings,
  setCenter,
  getCenter,
  setZoom,
  getZoom,
  getMapInstance,
  resetView,
  toggleFullscreen,
  addLayer,
  removeLayer,
  // 交互式绘制方法
  startDrawingPoint,
  startDrawingLine,
  startDrawingPolygon,
  startDrawingRectangle,
  startDrawingCircle,
  stopDrawing,
  setDrawingCallbacks,
  getCurrentDrawingMode,
  // 测量工具
  startMeasureDistance,
  startMeasureArea,
  // 图层管理方法
  switchLayer,
  getLayerOptions: () => layerOptions.value,
  getCurrentLayer: () => currentLayer.value
})
</script>

<style scoped lang="scss">
.map-container {
  position: relative;
  width: 100%;
  height: 100%;

  .map-content {
    border-radius: 4px;
    overflow: hidden;
  }

  .map-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    padding: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .layer-controls {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    padding: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

// 全局样式，修复 Leaflet 样式问题
:global(.leaflet-container) {
  font-family: inherit;
}

:global(.leaflet-popup-content-wrapper) {
  border-radius: 4px;
}

:global(.leaflet-popup-tip) {
  background: white;
}

// 全屏样式优化
:global(.map-container:fullscreen) {
  width: 100vw !important;
  height: 100vh !important;
  
  .map-content {
    width: 100% !important;
    height: 100% !important;
  }
  
  .map-controls {
    z-index: 2000; // 确保控制按钮在全屏时仍然可见
  }
  
  .layer-controls {
    z-index: 2000; // 确保图层控制在全屏时仍然可见
  }
}
</style>
