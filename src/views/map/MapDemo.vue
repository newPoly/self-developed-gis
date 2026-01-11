<!--
 * @Description: GIS
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2026-1-11
 * @Copyright: All rights reserved.
-->
<template>
  <div class="gis-portal">
    <!-- 地图容器 - 全屏 -->
    <div class="map-wrapper">
      <MapContainer
        ref="mapRef"
        :center="mapCenter"
        :zoom="mapZoom"
        :height="mapHeight"
        :show-controls="true"
        :show-layer-control="false"
        @map-ready="onMapReady"
        @map-click="onMapClick"
        @map-zoom="onMapZoom"
        @map-move="onMapMove"
        @marker-click="onMarkerClick"
      />
    </div>

    <!-- 功能控制面板 - 覆盖在地图上 -->
    <div class="control-panel" :class="{ 'panel-collapsed': isPanelCollapsed }">
      <div class="panel-toggle" @click="togglePanel">
        <span>{{ isPanelCollapsed ? '展开' : '收起' }}</span>
      </div>
      
      <div class="panel-content" v-show="!isPanelCollapsed">
        <div class="panel-header">
          <h3>GIS 功能面板</h3>
        </div>
        
        <!-- 底图切换模块 -->
        <div class="function-group">
          <h4>底图切换</h4>
          <div class="layer-select-wrapper">
            <select 
              v-model="currentLayer" 
              @change="switchLayer" 
              class="layer-select"
            >
              <option value="" disabled v-if="layerOptions.length === 0">加载中...</option>
              <option 
                v-for="layer in layerOptions" 
                :key="layer.value" 
                :value="layer.value"
              >
                {{ layer.label }}
              </option>
            </select>
          </div>
        </div>
        
        <!-- A3 行政区边界 -->
        <div class="function-group">
          <h4>行政边界</h4>
          <div class="function-buttons">
            <button class="func-btn" @click="showProvinceBoundary">甘肃省</button>
            <button class="func-btn" @click="showCityBoundary">兰州市</button>
          </div>
        </div>

        <div class="function-group">
          <h4>POI 统计</h4>
          <div class="function-buttons">
            <button class="func-btn" @click="showEducationPOI">教育设施</button>
            <button class="func-btn" @click="showMedicalPOI">医疗设施</button>
            <button class="func-btn" @click="showCommercialPOI">商业设施</button>
            <button class="func-btn" @click="showTourismPOI">旅游景点</button>
            <button class="func-btn clear-btn" @click="clearAllPOI">清除POI</button>
          </div>
        </div>

        <!-- C4 服务半径分析 -->
        <div class="function-group">
          <h4>服务半径分析</h4>
          <div class="function-buttons">
            <button class="func-btn" @click="analyzeHospitalRadius">医院覆盖</button>
            <button class="func-btn" @click="analyzeSchoolRadius">学校覆盖</button>
            <button class="func-btn" @click="analyzeShoppingRadius">商圈覆盖</button>
            <button class="func-btn clear-btn" @click="clearServiceRadius">清除分析</button>
          </div>
        </div>

        <!-- D1 热力图 -->
        <div class="function-group">
          <h4>热力图</h4>
          <div class="function-buttons">
            <button class="func-btn" @click="showPopulationHeatmap">人口</button>
            <button class="func-btn" @click="showTrafficHeatmap">交通</button>
            <button class="func-btn" @click="showCommercialHeatmap">商业</button>
            <button class="func-btn clear-btn" @click="clearHeatmap">清除</button>
          </div>
        </div>

        <!-- 图层服务 -->
        <!-- <div class="function-group">
          <h4>图层服务</h4>
          <div class="function-buttons">
            <button class="func-btn" @click="loadWMSLayer">WMS图层</button>
            <button class="func-btn" @click="loadGeoJSONService">GeoJSON服务</button>
            <button class="func-btn clear-btn" @click="clearGeoServerLayers">清除服务</button>
          </div>
        </div> -->

        <!-- 系统操作 -->
        <div class="function-group">
          <h4>系统操作</h4>
          <div class="function-buttons">
            <button class="func-btn reset-btn" @click="resetView">重置</button>
            <button class="func-btn clear-btn" @click="clearAll">清空</button>
            <button class="func-btn" @click="toggleStatusPanel">状态面板</button>
            <button class="func-btn" @click="exportMapData">导出数据</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态信息面板 -->
    <div class="status-panel" v-if="showStatusPanel">
      <div class="status-header">
        <h4>系统状态</h4>
        <button class="close-btn" @click="showStatusPanel = false">×</button>
      </div>
      <div class="status-content">
        <div class="status-section">
          <h5>地图信息</h5>
          <p>中心: {{ mapCenter[0].toFixed(4) }}, {{ mapCenter[1].toFixed(4) }}</p>
          <p>缩放: {{ mapZoom }}</p>
          <p>当前图层: {{ mapRef?.getCurrentLayer() || '未知' }}</p>
        </div>
        
        <div class="status-section">
          <h5>功能状态</h5>
          <p>当前功能: {{ currentFunction || '无' }}</p>
          <p>面板状态: {{ isPanelCollapsed ? '收起' : '展开' }}</p>
          <p>加载状态: {{ isLoading ? '加载中' : '就绪' }}</p>
        </div>
        
        <div class="status-section">
          <h5>系统信息</h5>
          <p>浏览器: {{ browserInfo }}</p>
          <p>语言: {{ systemLanguage }}</p>
          <p>视窗: {{ viewportSize }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import MapContainer from '@/components/MapContainer.vue'
import { LayerServiceType, type UniversalLayerConfig, L, mapService } from '@/utils/mapService'
import type { Map as LeafletMap, Marker } from 'leaflet'

// 响应式数据
const mapRef = ref<InstanceType<typeof MapContainer>>()
const mapCenter = ref<[number, number]>([37.5, 102.5]) // 甘肃
const mapZoom = ref(7)
const mapHeight = ref('100%')
const isMapReady = ref(false)
const showStatusPanel = ref(false)
const currentFunction = ref<string>('')
const isPanelCollapsed = ref(false)

// 图层切换相关 - 包含QGIS Cloud服务
const currentLayer = ref('qgis-cloud-default') // 默认使用QGIS Cloud服务
const layerOptions = ref<Array<{ label: string; value: string }>>([
  { label: 'QGIS Cloud 5A级旅游景区', value: 'qgis-cloud-default' },
  { label: '高德电子', value: 'amap-vec' },
  { label: '天地图影像', value: 'tianditu-img' },
  { label: '天地图矢量', value: 'tianditu-vec' },
  { label: '高德影像', value: 'amap-satellite' },
  { label: '百度电子', value: 'baidu-vec' },
  { label: '百度影像', value: 'baidu-satellite' }
])

// 面板切换
const togglePanel = () => {
  isPanelCollapsed.value = !isPanelCollapsed.value
}

// 地图事件处理
const onMapReady = (map: LeafletMap) => {
  console.log('GIS 门户系统地图初始化完成', map)
  isMapReady.value = true
  currentFunction.value = '地图已就绪'
  
  // 初始化图层选项
  initLayerOptions()
  
  // 调试信息
  console.log('当前图层选项:', layerOptions.value)
  console.log('当前选中图层:', currentLayer.value)
}

// 初始化图层选项
const initLayerOptions = async () => {
  try {
    // 从MapContainer组件获取图层选项
    if (mapRef.value && typeof mapRef.value.getLayerOptions === 'function') {
      const options = mapRef.value.getLayerOptions()
      if (options && options.length > 0) {
        // 使用 nextTick 避免响应式循环
        nextTick(() => {
          layerOptions.value = options
          console.log('从MapContainer获取图层选项:', options)
          
          // 确保当前选中的图层在选项中存在
          const currentExists = options.find(opt => opt.value === currentLayer.value)
          if (!currentExists && options.length > 0) {
            currentLayer.value = options[0].value
          }
        })
      }
    }
  } catch (error) {
    console.warn('获取图层选项失败，使用默认选项:', error)
  }
}

// 切换图层
const switchLayer = async (layerType: string | Event) => {
  if (!mapRef.value) return
  
  // 处理事件对象
  const layerValue = typeof layerType === 'string' ? layerType : (layerType.target as HTMLSelectElement).value
  
  currentFunction.value = `切换到: ${layerOptions.value.find(l => l.value === layerValue)?.label || layerValue}`
  
  try {
    // 调用MapContainer的图层切换方法
    if (typeof mapRef.value.switchLayer === 'function') {
      await mapRef.value.switchLayer(layerValue)
      console.log(`✅ 图层切换成功: ${layerValue}`)
    }
  } catch (error) {
    console.error('图层切换失败:', error)
  }
}

const onMapClick = (event: any) => {
  console.log(`点击位置: ${event.latlng[0].toFixed(4)}, ${event.latlng[1].toFixed(4)}`)
}

// 防抖处理，避免频繁更新
let zoomUpdateTimer: NodeJS.Timeout | null = null
let moveUpdateTimer: NodeJS.Timeout | null = null

// 计算属性
const browserInfo = computed(() => navigator.userAgent.split(' ').pop() || '未知')
const systemLanguage = computed(() => navigator.language)
const viewportSize = computed(() => `${window.innerWidth}×${window.innerHeight}`)

const onMapZoom = (zoom: number) => {
  // 清除之前的定时器
  if (zoomUpdateTimer) {
    clearTimeout(zoomUpdateTimer)
  }
  
  // 使用防抖，避免频繁更新导致死循环
  zoomUpdateTimer = setTimeout(() => {
    mapZoom.value = zoom
  }, 100)
}

const onMapMove = (center: [number, number]) => {
  // 清除之前的定时器
  if (moveUpdateTimer) {
    clearTimeout(moveUpdateTimer)
  }
  
  // 使用防抖，避免频繁更新
  moveUpdateTimer = setTimeout(() => {
    mapCenter.value = center
  }, 100)
}

const onMarkerClick = (markerId: string, marker: Marker) => {
  const position = marker.getLatLng()
  console.log(`点击标记: ${markerId} (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`)
}

// ==================== A3 行政区边界显示 ====================

// 防重复点击的状态
const isLoading = ref(false)

/**
 * 显示省级边界
 */
const showProvinceBoundary = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '甘肃省边界'
  
  try {
    // 先移除之前的行政区边界图层
    mapRef.value.removeLayer('province-boundary')
    mapRef.value.removeLayer('city-boundary')
    console.log('🗑️ 已移除之前的行政区边界')
    
    // 添加小延迟确保移除操作完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const config: UniversalLayerConfig = {
      id: 'province-boundary',
      name: '省级行政边界',
      type: LayerServiceType.LOCAL_JSON,
      url: '/sheng.json',
      geoJsonStyle: () => ({
        color: '#3f51b5',
        weight: 2,
        fillColor: '#3f51b5',
        fillOpacity: 0.1
      }),
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties && feature.properties.name) {
          layer.bindPopup(`
            <div style="min-width: 200px;">
              <h4 style="margin: 0 0 10px 0; color: #2c3e50;">甘肃省</h4>
              <p><strong>名称:</strong> ${feature.properties.name}</p>
              <p><strong>行政代码:</strong> ${feature.properties.adcode || 'N/A'}</p>
              <p><strong>级别:</strong> ${feature.properties.level || '省级'}</p>
              <p><strong>类型:</strong> 省级行政区边界</p>
            </div>
          `)
        }
      },
      attribution: '© 行政区划数据'
    }
    
    const layer = await mapRef.value.addLayer(config)
    if (layer) {
      console.log('✅ 甘肃省边界显示成功')
    }
  } catch (error) {
    console.error('❌ 显示甘肃省边界失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 显示市级边界
 */
const showCityBoundary = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '兰州市边界'
  
  try {
    // 先移除之前的行政区边界图层
    mapRef.value.removeLayer('province-boundary')
    mapRef.value.removeLayer('city-boundary')
    console.log('🗑️ 已移除之前的行政区边界')
    
    // 添加小延迟确保移除操作完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const config: UniversalLayerConfig = {
      id: 'city-boundary',
      name: '市级行政边界',
      type: LayerServiceType.LOCAL_JSON,
      url: '/shi.json',
      geoJsonStyle: () => ({
        color: '#4ecdc4',
        weight: 2,
        fillColor: '#4ecdc4',
        fillOpacity: 0.1
      }),
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties && feature.properties.name) {
          layer.bindPopup(`
            <div style="min-width: 200px;">
              <h4 style="margin: 0 0 10px 0; color: #2c3e50;">兰州市</h4>
              <p><strong>名称:</strong> ${feature.properties.name}</p>
              <p><strong>行政代码:</strong> ${feature.properties.adcode || 'N/A'}</p>
              <p><strong>级别:</strong> ${feature.properties.level || '市级'}</p>
              <p><strong>类型:</strong> 市级行政区边界</p>
            </div>
          `)
        }
      },
      attribution: '© 行政区划数据'
    }
    
    const layer = await mapRef.value.addLayer(config)
    if (layer) {
      console.log('✅ 兰州市边界显示成功')
    }
  } catch (error) {
    console.error('❌ 显示兰州市边界失败:', error)
  } finally {
    isLoading.value = false
  }
}

// ==================== B4 行政区内 POI 统计 ====================

/**
 * 显示教育设施POI
 */
const showEducationPOI = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '教育设施POI'
  
  try {
    // 先移除之前的POI图层
    clearPOILayers()
    
    // 添加小延迟确保移除操作完成
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 创建教育设施POI数据
    const educationPOIData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "兰州大学",
            type: "高等院校",
            address: "兰州市城关区天水南路222号",
            category: "教育设施",
            students: "约30000人"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8648, 36.0435]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "西北师范大学",
            type: "高等院校", 
            address: "兰州市安宁区安宁东路967号",
            category: "教育设施",
            students: "约26000人"
          },
          geometry: {
            type: "Point",
            coordinates: [103.7188, 36.0969]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "兰州理工大学",
            type: "高等院校",
            address: "兰州市七里河区兰工坪路287号", 
            category: "教育设施",
            students: "约22000人"
          },
          geometry: {
            type: "Point",
            coordinates: [103.7856, 36.0647]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "甘肃农业大学",
            type: "高等院校",
            address: "兰州市安宁区营门村1号",
            category: "教育设施", 
            students: "约20000人"
          },
          geometry: {
            type: "Point",
            coordinates: [103.7045, 36.1025]
          }
        }
      ]
    }
    
    const config: UniversalLayerConfig = {
      id: 'education-poi',
      name: '兰州教育设施POI',
      type: LayerServiceType.GEOJSON,
      data: educationPOIData,
      pointToLayer: (feature: any, latlng: L.LatLng) => {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        })
      },
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties
        layer.bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🎓 ${props.name}</h4>
            <p><strong>类型:</strong> ${props.type}</p>
            <p><strong>地址:</strong> ${props.address}</p>
            <p><strong>学生数:</strong> ${props.students}</p>
            <p><strong>分类:</strong> ${props.category}</p>
          </div>
        `)
      },
      attribution: '© 兰州教育设施POI数据'
    }
    
    const layer = await mapRef.value.addLayer(config)
    if (layer) {
      console.log('✅ 兰州教育设施POI显示成功')
      flyToLanzhou()
    }
  } catch (error) {
    console.error('❌ 显示教育设施POI失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 显示医疗设施POI
 */
const showMedicalPOI = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '医疗设施POI'
  
  try {
    clearPOILayers()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const medicalPOIData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "兰州大学第一医院",
            type: "三甲医院",
            address: "兰州市城关区东岗西路1号",
            category: "医疗设施",
            beds: "约2000张"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8756, 36.0521]
          }
        },
        {
          type: "Feature", 
          properties: {
            name: "甘肃省人民医院",
            type: "三甲医院",
            address: "兰州市城关区东岗西路204号",
            category: "医疗设施",
            beds: "约1800张"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8698, 36.0498]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "兰州大学第二医院",
            type: "三甲医院", 
            address: "兰州市城关区萃英门82号",
            category: "医疗设施",
            beds: "约1600张"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8445, 36.0612]
          }
        }
      ]
    }
    
    const config: UniversalLayerConfig = {
      id: 'medical-poi',
      name: '兰州医疗设施POI',
      type: LayerServiceType.GEOJSON,
      data: medicalPOIData,
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties
        layer.bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🏥 ${props.name}</h4>
            <p><strong>类型:</strong> ${props.type}</p>
            <p><strong>地址:</strong> ${props.address}</p>
            <p><strong>床位数:</strong> ${props.beds}</p>
            <p><strong>分类:</strong> ${props.category}</p>
          </div>
        `)
      },
      attribution: '© 兰州医疗设施POI数据'
    }
    
    const layer = await mapRef.value.addLayer(config)
    if (layer) {
      console.log('✅ 兰州医疗设施POI显示成功')
      flyToLanzhou()
    }
  } catch (error) {
    console.error('❌ 显示医疗设施POI失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 显示商业设施POI
 */
const showCommercialPOI = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '商业设施POI'
  
  try {
    clearPOILayers()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const commercialPOIData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "兰州中心",
            type: "购物中心",
            address: "兰州市城关区庆阳路219号",
            category: "商业设施",
            area: "约15万㎡"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8236, 36.0581]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "万达广场",
            type: "购物中心",
            address: "兰州市城关区民主东路97号",
            category: "商业设施", 
            area: "约12万㎡"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8345, 36.0634]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "西太华商厦",
            type: "百货商场",
            address: "兰州市城关区张掖路1号",
            category: "商业设施",
            area: "约8万㎡"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8198, 36.0567]
          }
        }
      ]
    }
    
    const config: UniversalLayerConfig = {
      id: 'commercial-poi',
      name: '兰州商业设施POI',
      type: LayerServiceType.GEOJSON,
      data: commercialPOIData,
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties
        layer.bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🏬 ${props.name}</h4>
            <p><strong>类型:</strong> ${props.type}</p>
            <p><strong>地址:</strong> ${props.address}</p>
            <p><strong>面积:</strong> ${props.area}</p>
            <p><strong>分类:</strong> ${props.category}</p>
          </div>
        `)
      },
      attribution: '© 兰州商业设施POI数据'
    }
    
    const layer = await mapRef.value.addLayer(config)
    if (layer) {
      console.log('✅ 兰州商业设施POI显示成功')
      flyToLanzhou()
    }
  } catch (error) {
    console.error('❌ 显示商业设施POI失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 显示旅游景点POI
 */
const showTourismPOI = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '旅游景点POI'
  
  try {
    clearPOILayers()
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const tourismPOIData = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "甘肃省博物馆",
            type: "博物馆",
            address: "兰州市七里河区西津西路3号",
            category: "旅游景点",
            level: "国家一级博物馆"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8048, 36.0473]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "白塔山公园",
            type: "公园景区",
            address: "兰州市城关区北滨河中路白塔山1号",
            category: "旅游景点",
            level: "4A级景区"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8345, 36.0712]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "黄河铁桥",
            type: "历史建筑",
            address: "兰州市城关区滨河路中段北侧",
            category: "旅游景点",
            level: "国家重点文物保护单位"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8298, 36.0678]
          }
        },
        {
          type: "Feature",
          properties: {
            name: "五泉山公园",
            type: "公园景区",
            address: "兰州市城关区五泉南路103号",
            category: "旅游景点",
            level: "4A级景区"
          },
          geometry: {
            type: "Point",
            coordinates: [103.8456, 36.0423]
          }
        }
      ]
    }
    
    const config: UniversalLayerConfig = {
      id: 'tourism-poi',
      name: '兰州旅游景点POI',
      type: LayerServiceType.GEOJSON,
      data: tourismPOIData,
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties
        layer.bindPopup(`
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🏛️ ${props.name}</h4>
            <p><strong>类型:</strong> ${props.type}</p>
            <p><strong>地址:</strong> ${props.address}</p>
            <p><strong>级别:</strong> ${props.level}</p>
            <p><strong>分类:</strong> ${props.category}</p>
          </div>
        `)
      },
      attribution: '© 兰州旅游景点POI数据'
    }
    
    const layer = await mapRef.value.addLayer(config)
    if (layer) {
      console.log('✅ 兰州旅游景点POI显示成功')
      flyToLanzhou()
    }
  } catch (error) {
    console.error('❌ 显示旅游景点POI失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 清除所有POI图层
 */
const clearPOILayers = () => {
  if (!mapRef.value) return
  
  const poiLayerIds = [
    'gansu-poi', 'gansu-poi-wfs', 'gansu-poi-wms', 'gansu-poi-local',
    'education-poi', 'medical-poi', 'commercial-poi', 'tourism-poi'
  ]
  
  poiLayerIds.forEach(id => {
    mapRef.value?.removeLayer(id)
  })
  
  console.log('🗑️ 已移除之前的POI图层')
}

/**
 * 飞到兰州市范围
 */
const flyToLanzhou = () => {
  try {
    const lanzhouBounds = L.latLngBounds(
      [35.9, 103.5], // 西南角
      [36.2, 104.2]  // 东北角
    )
    
    const mapInstance = mapRef.value?.getMapInstance()
    if (mapInstance) {
      mapInstance.fitBounds(lanzhouBounds, { 
        padding: [20, 20],
        maxZoom: 12
      })
      console.log('🛩️ 地图已飞到兰州市POI数据范围')
    }
  } catch (error) {
    console.error('❌ 地图视图调整失败:', error)
  }
}

/**
 * 清除所有POI数据（用户操作）
 */
const clearAllPOI = () => {
  if (!mapRef.value) return
  
  currentFunction.value = '清除POI数据'
  
  // 清除POI图层
  clearPOILayers()
  
  console.log('✅ 所有POI数据已清除')
}

// ==================== C4 服务半径分析 ====================

/**
 * 医院服务半径分析
 * 分析医院的服务覆盖范围（一般为3-5公里）
 */
const analyzeHospitalRadius = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '医院服务半径分析'
  
  try {
    // 清除之前的服务半径分析
    clearServiceRadius()
    
    // 医院位置数据（使用之前定义的医疗设施数据）
    const hospitals = [
      { name: "兰州大学第一医院", coords: [103.8756, 36.0521], radius: 5000 },
      { name: "甘肃省人民医院", coords: [103.8698, 36.0498], radius: 4000 },
      { name: "兰州大学第二医院", coords: [103.8445, 36.0612], radius: 4000 }
    ]
    
    // 为每个医院绘制服务半径
    hospitals.forEach((hospital, index) => {
      const colors = ['#ff5722', '#e91e63', '#9c27b0']
      const color = colors[index % colors.length]
      
      // 绘制服务半径圆圈
      mapRef.value?.drawCircle([hospital.coords[1], hospital.coords[0]], hospital.radius, {
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5'
      })
      
      // 添加医院标记
      mapRef.value?.addMarker(`hospital-${index}`, {
        position: [hospital.coords[1], hospital.coords[0]],
        popup: `
          <div style="min-width: 180px;">
            <h4 style="margin: 0 0 8px 0; color: #d32f2f;">🏥 ${hospital.name}</h4>
            <p><strong>服务半径:</strong> ${hospital.radius/1000}公里</p>
            <p><strong>覆盖范围:</strong> 约${Math.round(Math.PI * Math.pow(hospital.radius/1000, 2))}平方公里</p>
            <p><strong>说明:</strong> 三甲医院标准服务半径</p>
          </div>
        `
      })
    })
    
    // 飞到兰州市中心查看整体覆盖情况
    flyToLanzhou()
    
    console.log('✅ 医院服务半径分析完成')
  } catch (error) {
    console.error('❌ 医院服务半径分析失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 学校服务半径分析
 * 分析学校的服务覆盖范围（一般为2-3公里）
 */
const analyzeSchoolRadius = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '学校服务半径分析'
  
  try {
    clearServiceRadius()
    
    // 学校位置数据
    const schools = [
      { name: "兰州大学", coords: [103.8648, 36.0435], radius: 3000 },
      { name: "西北师范大学", coords: [103.7188, 36.0969], radius: 2500 },
      { name: "兰州理工大学", coords: [103.7856, 36.0647], radius: 2500 },
      { name: "甘肃农业大学", coords: [103.7045, 36.1025], radius: 2000 }
    ]
    
    schools.forEach((school, index) => {
      const colors = ['#2196f3', '#03a9f4', '#00bcd4', '#009688']
      const color = colors[index % colors.length]
      
      // 绘制服务半径
      mapRef.value?.drawCircle([school.coords[1], school.coords[0]], school.radius, {
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '8, 4'
      })
      
      // 添加学校标记
      mapRef.value?.addMarker(`school-${index}`, {
        position: [school.coords[1], school.coords[0]],
        popup: `
          <div style="min-width: 180px;">
            <h4 style="margin: 0 0 8px 0; color: #1976d2;">🎓 ${school.name}</h4>
            <p><strong>服务半径:</strong> ${school.radius/1000}公里</p>
            <p><strong>覆盖范围:</strong> 约${Math.round(Math.PI * Math.pow(school.radius/1000, 2))}平方公里</p>
            <p><strong>说明:</strong> 高等院校学生生活服务半径</p>
          </div>
        `
      })
    })
    
    flyToLanzhou()
    console.log('✅ 学校服务半径分析完成')
  } catch (error) {
    console.error('❌ 学校服务半径分析失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 商圈服务半径分析
 * 分析商业中心的服务覆盖范围（一般为1-2公里）
 */
const analyzeShoppingRadius = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '商圈服务半径分析'
  
  try {
    clearServiceRadius()
    
    // 商圈位置数据
    const shoppingCenters = [
      { name: "兰州中心", coords: [103.8236, 36.0581], radius: 2000 },
      { name: "万达广场", coords: [103.8345, 36.0634], radius: 1800 },
      { name: "西太华商厦", coords: [103.8198, 36.0567], radius: 1500 }
    ]
    
    shoppingCenters.forEach((center, index) => {
      const colors = ['#ff9800', '#ffc107', '#ffeb3b']
      const color = colors[index % colors.length]
      
      // 绘制服务半径
      mapRef.value?.drawCircle([center.coords[1], center.coords[0]], center.radius, {
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 3,
        dashArray: '10, 5'
      })
      
      // 添加商圈标记
      mapRef.value?.addMarker(`shopping-${index}`, {
        position: [center.coords[1], center.coords[0]],
        popup: `
          <div style="min-width: 180px;">
            <h4 style="margin: 0 0 8px 0; color: #f57c00;">🏬 ${center.name}</h4>
            <p><strong>服务半径:</strong> ${center.radius/1000}公里</p>
            <p><strong>覆盖范围:</strong> 约${Math.round(Math.PI * Math.pow(center.radius/1000, 2))}平方公里</p>
            <p><strong>说明:</strong> 商业中心主要客流辐射范围</p>
          </div>
        `
      })
    })
    
    flyToLanzhou()
    console.log('✅ 商圈服务半径分析完成')
  } catch (error) {
    console.error('❌ 商圈服务半径分析失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 清除服务半径分析
 */
const clearServiceRadius = () => {
  if (!mapRef.value) return
  
  currentFunction.value = '清除服务半径分析'
  
  // 清除绘制的圆圈
  mapRef.value.clearDrawings()
  
  // 清除标记点
  const markerPrefixes = ['hospital-', 'school-', 'shopping-']
  markerPrefixes.forEach(prefix => {
    for (let i = 0; i < 10; i++) {
      mapRef.value?.removeMarker(`${prefix}${i}`)
    }
  })
  
  console.log('✅ 服务半径分析已清除')
}

// ==================== D1 热力图 ====================

/**
 * 显示人口热力图
 */
const showPopulationHeatmap = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '人口热力图'
  
  try {
    // 清除之前的热力图
    clearHeatmap()
    
    // 兰州市人口密度数据点 [lat, lng, intensity]
    const populationHeatData = [
      [36.0581, 103.8236, 0.9], // 城关区中心
      [36.0634, 103.8345, 0.8], // 城关区东部
      [36.0567, 103.8198, 0.85], // 城关区西部
      [36.0612, 103.8445, 0.7], // 城关区北部
      [36.0521, 103.8756, 0.65], // 城关区医院区
      [36.0435, 103.8648, 0.75], // 城关区东南
      [36.0473, 103.8048, 0.7], // 七里河区中心
      [36.0423, 103.8056, 0.6], // 七里河区南部
      [36.0523, 103.8148, 0.55], // 七里河区北部
      [36.0647, 103.7856, 0.6], // 西固区中心
      [36.0697, 103.7756, 0.5], // 西固区北部
      [36.0597, 103.7956, 0.45], // 西固区南部
      [36.0969, 103.7188, 0.5], // 安宁区大学城
      [36.1025, 103.7045, 0.4], // 安宁区北部
      [36.0869, 103.7288, 0.35], // 安宁区南部
      // 添加更多密集的数据点以形成更好的热力图效果
      [36.0601, 103.8256, 0.8], [36.0561, 103.8216, 0.75],
      [36.0621, 103.8276, 0.7], [36.0541, 103.8196, 0.65],
      [36.0654, 103.8365, 0.75], [36.0614, 103.8325, 0.7],
      [36.0674, 103.8385, 0.65], [36.0594, 103.8305, 0.6],
      [36.0587, 103.8218, 0.8], [36.0547, 103.8178, 0.7],
      [36.0627, 103.8258, 0.75], [36.0567, 103.8198, 0.65]
    ]
    
    // 使用mapService添加热力图
    const mapInstance = mapRef.value.getMapInstance()
    if (mapInstance) {
      mapService.addHeatmapLayer('population-heat', populationHeatData, {
        radius: 35,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.6,
        gradient: {
          0.0: '#000080',  // 深蓝色
          0.2: '#0000ff',  // 蓝色
          0.4: '#00ffff',  // 青色
          0.6: '#00ff00',  // 绿色
          0.8: '#ffff00',  // 黄色
          1.0: '#ff0000'   // 红色
        }
      })
    }
    
    flyToLanzhou()
    console.log('✅ 人口热力图显示完成')
  } catch (error) {
    console.error('❌ 显示人口热力图失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 显示交通热力图
 */
const showTrafficHeatmap = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '交通热力图'
  
  try {
    clearHeatmap()
    
    // 兰州市交通流量数据点 [lat, lng, intensity]
    const trafficHeatData = [
      [36.0678, 103.8298, 0.95], // 黄河铁桥
      [36.0581, 103.8236, 0.9], // 中山桥周边
      [36.0634, 103.8345, 0.85], // 东方红广场
      [36.0567, 103.8198, 0.8], // 张掖路步行街
      [36.0521, 103.8756, 0.75], // 火车站区域
      [36.0647, 103.7856, 0.7], // 西固区主干道
      [36.0969, 103.7188, 0.6], // 安宁区大学城
      [36.0473, 103.8048, 0.65], // 七里河区中心
      [36.0612, 103.8445, 0.55], // 五泉山周边
      [36.1025, 103.7045, 0.4], // 安宁区外围
      // 主要道路交通流量点
      [36.0698, 103.8318, 0.9], [36.0658, 103.8278, 0.85],
      [36.0718, 103.8338, 0.8], [36.0638, 103.8258, 0.75],
      [36.0601, 103.8256, 0.85], [36.0561, 103.8216, 0.8],
      [36.0621, 103.8276, 0.75], [36.0541, 103.8196, 0.7],
      [36.0541, 103.8776, 0.7], [36.0501, 103.8736, 0.65],
      [36.0561, 103.8796, 0.6], [36.0481, 103.8716, 0.55]
    ]
    
    const mapInstance = mapRef.value.getMapInstance()
    if (mapInstance) {
      mapService.addHeatmapLayer('traffic-heat', trafficHeatData, {
        radius: 30,
        blur: 12,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.5,
        gradient: {
          0.0: '#000080',  // 深蓝色
          0.3: '#0080ff',  // 蓝色
          0.5: '#00ff80',  // 青绿色
          0.7: '#ffff00',  // 黄色
          0.9: '#ff8000',  // 橙色
          1.0: '#ff0000'   // 红色
        }
      })
    }
    
    flyToLanzhou()
    console.log('✅ 交通热力图显示完成')
  } catch (error) {
    console.error('❌ 显示交通热力图失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 显示商业热力图
 */
const showCommercialHeatmap = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = '商业热力图'
  
  try {
    clearHeatmap()
    
    // 兰州市商业活跃度数据点 [lat, lng, intensity]
    const commercialHeatData = [
      [36.0581, 103.8236, 0.95], // 兰州中心商圈
      [36.0634, 103.8345, 0.9], // 万达广场商圈
      [36.0567, 103.8198, 0.85], // 西太华商圈
      [36.0678, 103.8298, 0.8], // 中山桥商业区
      [36.0473, 103.8048, 0.7], // 七里河商业区
      [36.0521, 103.8756, 0.65], // 火车站商业区
      [36.0647, 103.7856, 0.6], // 西固区商业中心
      [36.0969, 103.7188, 0.55], // 安宁区商业街
      [36.0612, 103.8445, 0.5], // 五泉山商业区
      [36.1025, 103.7045, 0.4], // 安宁区外围
      // 商业密集区域
      [36.0601, 103.8256, 0.9], [36.0561, 103.8216, 0.85],
      [36.0621, 103.8276, 0.8], [36.0541, 103.8196, 0.75],
      [36.0654, 103.8365, 0.85], [36.0614, 103.8325, 0.8],
      [36.0674, 103.8385, 0.75], [36.0594, 103.8305, 0.7],
      [36.0587, 103.8218, 0.8], [36.0547, 103.8178, 0.75],
      [36.0493, 103.8068, 0.65], [36.0453, 103.8028, 0.6]
    ]
    
    const mapInstance = mapRef.value.getMapInstance()
    if (mapInstance) {
      mapService.addHeatmapLayer('commercial-heat', commercialHeatData, {
        radius: 32,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.5,
        gradient: {
          0.0: '#800080',  // 紫色
          0.2: '#ff0080',  // 品红色
          0.4: '#ff4000',  // 橙红色
          0.6: '#ff8000',  // 橙色
          0.8: '#ffff00',  // 黄色
          1.0: '#ffffff'   // 白色（最高强度）
        }
      })
    }
    
    flyToLanzhou()
    console.log('✅ 商业热力图显示完成')
  } catch (error) {
    console.error('❌ 显示商业热力图失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 清除热力图
 */
const clearHeatmap = () => {
  if (!mapRef.value) return
  
  currentFunction.value = '清除热力图'
  
  // 使用mapService清除所有热力图
  mapService.clearAllHeatmaps()
  
  console.log('✅ 热力图已清除')
}

// ==================== 图层服务 ====================

/**
 * 加载WMS图层服务
 */
const loadWMSLayer = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = 'WMS图层服务'
  
  try {
    // 清除之前的GeoServer图层
    clearGeoServerLayers()
    
    // 使用公开的GeoServer WMS服务
    const wmsConfig: UniversalLayerConfig = {
      id: 'geoserver-wms',
      name: 'GeoServer WMS图层',
      type: LayerServiceType.WMS,
      url: 'https://demo.boundlessgeo.com/geoserver/wms',
      layers: 'ne:ne_10m_admin_0_countries', // 世界国家边界
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      attribution: '© GeoServer Demo Service'
    }
    
    const layer = await mapRef.value.addLayer(wmsConfig)
    if (layer) {
      console.log('✅ WMS图层加载成功')
      
      // 添加说明标记
      mapRef.value.addMarker('wms-info', {
        position: [35.0, 100.0],
        popup: `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🌍 WMS图层服务</h4>
            <p><strong>服务类型:</strong> Web Map Service</p>
            <p><strong>数据源:</strong> Boundless GeoServer</p>
            <p><strong>图层:</strong> 世界国家边界</p>
            <p><strong>格式:</strong> PNG (透明)</p>
            <p><strong>说明:</strong> 演示WMS服务集成</p>
          </div>
        `
      })
    }
  } catch (error) {
    console.error('❌ WMS图层加载失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 加载WFS图层服务
 */
// const loadWFSLayer = async () => {
//   if (!mapRef.value || isLoading.value) return
  
//   isLoading.value = true
//   currentFunction.value = 'WFS图层服务'
  
//   try {
//     clearGeoServerLayers()
    
//     // 使用OpenStreetMap的Overpass API作为替代方案
//     // 或者直接使用一个简单的GeoJSON数据来模拟WFS效果
//     const wfsConfig: UniversalLayerConfig = {
//       id: 'geoserver-wfs',
//       name: 'WFS矢量图层',
//       type: LayerServiceType.GEOJSON,
//       url: 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
//       geoJsonStyle: () => ({
//         color: '#e91e63',
//         weight: 1,
//         fillColor: '#e91e63',
//         fillOpacity: 0.3
//       }),
//       onEachFeature: (feature: any, layer: any) => {
//         if (feature.properties) {
//           layer.bindPopup(`
//             <div style="min-width: 180px;">
//               <h4 style="margin: 0 0 8px 0; color: #e91e63;">🌍 ${feature.properties.name || '国家'}</h4>
//               <p><strong>国家代码:</strong> ${feature.properties.id || '未知'}</p>
//               <p><strong>类型:</strong> WFS风格矢量数据</p>
//               <p><strong>数据源:</strong> GitHub公共数据</p>
//               <p><strong>格式:</strong> GeoJSON</p>
//             </div>
//           `)
//         }
//       },
//       attribution: '© 公共地理数据服务'
//     }
    
//     const layer = await mapRef.value.addLayer(wfsConfig)
//     if (layer) {
//       console.log('✅ WFS风格图层加载成功')
      
//       // 添加说明标记
//       mapRef.value.addMarker('wfs-info', {
//         position: [40.0, 100.0],
//         popup: `
//           <div style="min-width: 200px;">
//             <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📍 WFS风格图层</h4>
//             <p><strong>服务类型:</strong> 矢量数据服务</p>
//             <p><strong>数据源:</strong> 公共地理数据</p>
//             <p><strong>图层:</strong> 世界国家边界</p>
//             <p><strong>格式:</strong> GeoJSON</p>
//             <p><strong>特点:</strong> 矢量数据，可查询属性</p>
//           </div>
//         `
//       })
//     }
//   } catch (error) {
//     console.error('❌ WFS图层加载失败:', error)
    
//     // 如果在线服务也失败，使用本地备用数据
//     try {
//       console.log('🔄 尝试加载备用WFS数据')
      
//       const fallbackWFSData = {
//         type: "FeatureCollection",
//         features: [
//           {
//             type: "Feature",
//             properties: {
//               name: "中国",
//               id: "CN",
//               population: "1400000000"
//             },
//             geometry: {
//               type: "Point",
//               coordinates: [104.0, 35.0]
//             }
//           },
//           {
//             type: "Feature", 
//             properties: {
//               name: "美国",
//               id: "US",
//               population: "330000000"
//             },
//             geometry: {
//               type: "Point",
//               coordinates: [-95.0, 40.0]
//             }
//           },
//           {
//             type: "Feature",
//             properties: {
//               name: "俄罗斯",
//               id: "RU", 
//               population: "146000000"
//             },
//             geometry: {
//               type: "Point",
//               coordinates: [100.0, 60.0]
//             }
//           },
//           {
//             type: "Feature",
//             properties: {
//               name: "印度",
//               id: "IN",
//               population: "1380000000"
//             },
//             geometry: {
//               type: "Point",
//               coordinates: [77.0, 20.0]
//             }
//           }
//         ]
//       }
      
//       const fallbackConfig: UniversalLayerConfig = {
//         id: 'geoserver-wfs',
//         name: 'WFS备用数据',
//         type: LayerServiceType.GEOJSON,
//         data: fallbackWFSData,
//         pointToLayer: (feature: any, latlng: L.LatLng) => {
//           return L.circleMarker(latlng, {
//             radius: 8,
//             color: '#e91e63',
//             fillColor: '#e91e63',
//             fillOpacity: 0.7,
//             weight: 2
//           })
//         },
//         onEachFeature: (feature: any, layer: any) => {
//           const props = feature.properties
//           layer.bindPopup(`
//             <div style="min-width: 180px;">
//               <h4 style="margin: 0 0 8px 0; color: #e91e63;">🌍 ${props.name}</h4>
//               <p><strong>国家代码:</strong> ${props.id}</p>
//               <p><strong>人口:</strong> ${parseInt(props.population).toLocaleString()}</p>
//               <p><strong>类型:</strong> WFS备用数据</p>
//               <p><strong>说明:</strong> 主要国家示例点</p>
//             </div>
//           `)
//         },
//         attribution: '© WFS备用演示数据'
//       }
      
//       const fallbackLayer = await mapRef.value.addLayer(fallbackConfig)
//       if (fallbackLayer) {
//         console.log('✅ WFS备用数据加载成功')
        
//         mapRef.value.addMarker('wfs-info', {
//           position: [40.0, 100.0],
//           popup: `
//             <div style="min-width: 200px;">
//               <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📍 WFS备用数据</h4>
//               <p><strong>服务类型:</strong> 本地备用数据</p>
//               <p><strong>内容:</strong> 主要国家信息</p>
//               <p><strong>格式:</strong> GeoJSON点数据</p>
//               <p><strong>特点:</strong> 离线可用，演示WFS概念</p>
//             </div>
//           `
//         })
//       }
//     } catch (fallbackError) {
//       console.error('❌ 备用WFS数据也加载失败:', fallbackError)
//     }
//   } finally {
//     isLoading.value = false
//   }
// }

/**
 * 加载GeoJSON服务
 */
const loadGeoJSONService = async () => {
  if (!mapRef.value || isLoading.value) return
  
  isLoading.value = true
  currentFunction.value = 'GeoJSON服务'
  
  try {
    clearGeoServerLayers()
    
    // 使用公开的GeoJSON服务
    const geoJsonConfig: UniversalLayerConfig = {
      id: 'geojson-service',
      name: 'GeoJSON在线服务',
      type: LayerServiceType.GEOJSON,
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson',
      geoJsonStyle: (feature: any) => {
        const magnitude = feature.properties.mag || 0
        return {
          color: magnitude > 6 ? '#d32f2f' : magnitude > 4 ? '#ff9800' : '#4caf50',
          weight: 2,
          fillColor: magnitude > 6 ? '#d32f2f' : magnitude > 4 ? '#ff9800' : '#4caf50',
          fillOpacity: 0.7,
          radius: Math.max(magnitude * 3, 5)
        }
      },
      pointToLayer: (feature: any, latlng: L.LatLng) => {
        const magnitude = feature.properties.mag || 0
        return L.circleMarker(latlng, {
          radius: Math.max(magnitude * 3, 5)
        })
      },
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties) {
          const props = feature.properties
          layer.bindPopup(`
            <div style="min-width: 200px;">
              <h4 style="margin: 0 0 10px 0; color: #d32f2f;">🌋 ${props.title || '地震事件'}</h4>
              <p><strong>震级:</strong> ${props.mag || '未知'}</p>
              <p><strong>时间:</strong> ${new Date(props.time).toLocaleString()}</p>
              <p><strong>地点:</strong> ${props.place || '未知'}</p>
              <p><strong>深度:</strong> ${props.depth || '未知'} km</p>
              <p><strong>数据源:</strong> USGS地震监测</p>
            </div>
          `)
        }
      },
      attribution: '© USGS Earthquake Hazards Program'
    }
    
    const layer = await mapRef.value.addLayer(geoJsonConfig)
    if (layer) {
      console.log('✅ GeoJSON服务加载成功')
      
      // 添加说明标记
      mapRef.value.addMarker('geojson-info', {
        position: [30.0, -120.0],
        popup: `
          <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🌋 GeoJSON在线服务</h4>
            <p><strong>服务类型:</strong> REST GeoJSON API</p>
            <p><strong>数据源:</strong> USGS地震监测</p>
            <p><strong>内容:</strong> 近期重大地震事件</p>
            <p><strong>更新:</strong> 实时数据</p>
            <p><strong>特点:</strong> 动态颜色编码（震级）</p>
          </div>
        `
      })
      
      // 飞到美国西海岸查看地震数据
      const mapInstance = mapRef.value.getMapInstance()
      if (mapInstance) {
        mapInstance.setView([37.0, -120.0], 5)
      }
    }
  } catch (error) {
    console.error('❌ GeoJSON服务加载失败:', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 清除GeoServer图层服务
 */
const clearGeoServerLayers = () => {
  if (!mapRef.value) return
  
  currentFunction.value = '清除图层服务'
  
  // 清除图层服务相关的图层
  const serviceLayerIds = [
    'geoserver-wms', 'geoserver-wfs', 'geojson-service'
  ]
  
  serviceLayerIds.forEach(id => {
    mapRef.value?.removeLayer(id)
  })
  
  // 清除说明标记
  const infoMarkerIds = ['wms-info', 'wfs-info', 'geojson-info']
  infoMarkerIds.forEach(id => {
    mapRef.value?.removeMarker(id)
  })
  
  console.log('✅ 图层服务已清除')
}

// ==================== 系统操作 ====================

/**
 * 重置视图
 */
const resetView = () => {
  if (!mapRef.value) return
  
  currentFunction.value = '重置视图'
  
  try {
    // 重置到初始位置和缩放级别
    const mapInstance = mapRef.value.getMapInstance()
    if (mapInstance) {
      mapInstance.setView([37.5, 102.5], 7) // 甘肃省中心，适合的缩放级别
    }
    console.log('✅ 视图已重置')
  } catch (error) {
    console.error('❌ 重置视图失败:', error)
  }
}

/**
 * 清除所有图层和绘制
 */
const clearAll = () => {
  if (!mapRef.value) return
  
  currentFunction.value = '清除所有'
  
  // 清除所有图层
  clearLayers()
  
  // 清除所有绘制
  mapRef.value.clearDrawings()
  mapRef.value.clearMarkers()
  
  console.log('✅ 已清除所有内容')
}

/**
 * 切换状态面板显示
 */
const toggleStatusPanel = () => {
  showStatusPanel.value = !showStatusPanel.value
  currentFunction.value = showStatusPanel.value ? '显示状态面板' : '隐藏状态面板'
  console.log(`✅ 状态面板已${showStatusPanel.value ? '显示' : '隐藏'}`)
}

/**
 * 导出地图数据
 */
const exportMapData = () => {
  currentFunction.value = '导出地图数据'
  
  try {
    const mapData = {
      timestamp: new Date().toISOString(),
      mapCenter: mapCenter.value,
      mapZoom: mapZoom.value,
      currentFunction: currentFunction.value,
      systemInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      },
      mapBounds: mapRef.value?.getMapInstance()?.getBounds(),
      layerInfo: {
        currentLayer: mapRef.value?.getCurrentLayer(),
        availableLayers: mapRef.value?.getLayerOptions()
      }
    }
    
    // 创建下载链接
    const dataStr = JSON.stringify(mapData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    // 创建下载链接并触发下载
    const link = document.createElement('a')
    link.href = url
    link.download = `gis-map-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log('✅ 地图数据导出成功')
  } catch (error) {
    console.error('❌ 导出地图数据失败:', error)
  }
}

/**
 * 清除图层
 */
const clearLayers = () => {
  if (!mapRef.value) return
  
  const layerIds = [
    'province-boundary', 'city-boundary', 'district-boundary',
    'gansu-poi', 'gansu-poi-fallback', 'gansu-poi-wfs', 'gansu-poi-wms', 'gansu-poi-local',
    'education-poi', 'medical-poi', 'commercial-poi', 'tourism-poi',
    'geoserver-wms', 'geoserver-wfs', 'geojson-service'
  ]
  
  layerIds.forEach(id => {
    mapRef.value?.removeLayer(id)
  })
  
  console.log('🗑️ 所有功能图层已清除')
}

// 组件挂载时的初始化
onMounted(() => {
  console.log('🚀 GIS 门户系统启动')
  console.log('初始图层选项:', layerOptions.value)
  console.log('初始选中图层:', currentLayer.value)
})
</script>

<style scoped lang="scss">
.gis-portal {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;

  // 地图容器 - 全屏
  .map-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  // 控制面板 - 覆盖在地图上
  .control-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 240px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    z-index: 1000;
    transition: all 0.3s ease;

    &.panel-collapsed {
      width: 80px;
      
      .panel-content {
        display: none;
      }
    }

    .panel-toggle {
      padding: 8px 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      transition: background-color 0.2s;

      &:hover {
        background: #e9ecef;
      }

      span {
        font-weight: 500;
      }
    }

    .panel-content {
      padding: 15px;
    }

    .panel-header {
      margin-bottom: 20px;
      text-align: center;
      
      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
      }
    }

    .function-group {
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }

      h4 {
        margin: 0 0 10px 0;
        font-size: 13px;
        font-weight: 600;
        color: #495057;
        padding-bottom: 5px;
        border-bottom: 1px solid #e9ecef;
      }

      .function-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;

        .func-btn {
          padding: 6px 8px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: #ffffff;
          color: #495057;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          outline: none;

          &:hover {
            background: #f8f9fa;
            border-color: #adb5bd;
            transform: translateY(-1px);
          }

          &:active {
            transform: translateY(0);
            background: #e9ecef;
          }

          // 特殊按钮样式
          &.clear-btn {
            background: #fff5f5;
            border-color: #fed7d7;
            color: #c53030;

            &:hover {
              background: #fed7d7;
              border-color: #fc8181;
            }
          }

          &.reset-btn {
            background: #f0fff4;
            border-color: #c6f6d5;
            color: #2f855a;

            &:hover {
              background: #c6f6d5;
              border-color: #9ae6b4;
            }
          }
        }
      }

      // 图层选择器样式
      .layer-select-wrapper {
        .layer-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: #ffffff;
          color: #495057;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;

          &:hover {
            border-color: #adb5bd;
            background: #f8f9fa;
          }

          &:focus {
            border-color: #80bdff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
          }

          option {
            padding: 8px;
            background: #ffffff;
            color: #495057;
          }
        }
      }
    }
  }

  // 状态面板
  .status-panel {
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 280px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    z-index: 1000;
    max-height: 400px;
    overflow-y: auto;

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e9ecef;

      h4 {
        margin: 0;
        color: #2c3e50;
        font-size: 14px;
        font-weight: 600;
      }

      .close-btn {
        padding: 2px 6px;
        border: none;
        background: transparent;
        color: #6c757d;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        border-radius: 3px;
        transition: all 0.2s;

        &:hover {
          color: #dc3545;
          background: rgba(220, 53, 69, 0.1);
        }
      }
    }

    .status-content {
      .status-section {
        margin-bottom: 12px;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        h5 {
          margin: 0 0 6px 0;
          font-size: 12px;
          font-weight: 600;
          color: #495057;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        p {
          margin: 3px 0;
          font-size: 11px;
          color: #6c757d;
          line-height: 1.4;
          
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .gis-portal {
    .control-panel {
      width: calc(100% - 40px);
      left: 20px;
      right: 20px;

      &.panel-collapsed {
        width: 60px;
        right: auto;
      }

      .function-buttons {
        grid-template-columns: 1fr 1fr 1fr;
      }
    }

    .status-panel {
      width: calc(100% - 40px);
      left: 20px;
      right: 20px;
      bottom: 20px;
    }
  }
}

@media (max-width: 480px) {
  .gis-portal {
    .control-panel {
      .function-buttons {
        grid-template-columns: 1fr;
        
        .func-btn {
          font-size: 11px;
          padding: 5px 6px;
        }
      }
    }
  }
}
</style>
