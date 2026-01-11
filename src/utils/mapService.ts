
/*
 * @Description: 
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2025-09-13 17:30:44
 * @LastEditors: liuhaobo 448573434@qq.com
 * @LastEditTime: 2026-01-10 22:44:15
 * @FilePath: \leaflet-self-website\src\utils\mapService.ts
 * Copyright (C) 2025 liuhaobo. All rights reserved.
 */

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import { 
  loadMapConfig, 
  getMapConfig, 
  getDefaultTileLayerConfig,
  type TileLayerConfig 
} from './mapConfig'
import { 
  BaiduMapUtils, 
  BaiduTileLayer, 
  type BaiduTileLayerOptions,
  initGlobalBaiduCRS,
  createBaiduTileLayer 
} from './baiduMapUtils'

// 初始化配置
let configInitialized = false

// 初始化地图配置和图标
async function initializeMapConfig() {
  if (configInitialized) return
  
  try {
    await loadMapConfig()
    
    // 修复 Leaflet 默认图标问题
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      console.log('Leaflet 默认图标配置成功')
    } catch (error) {
      console.warn('Leaflet 默认图标配置失败:', error)
    }
    
    configInitialized = true
    console.log('地图配置初始化完成')
  } catch (error) {
    console.error('地图配置初始化失败:', error)
    // 使用备用图标配置
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      console.log('Leaflet 备用图标配置成功')
    } catch (error) {
      console.warn('Leaflet 备用图标配置也失败:', error)
    }
    configInitialized = true
  }
}

// 地图配置接口
export interface MapConfig {
  container: string | HTMLElement
  center?: [number, number]
  zoom?: number
  minZoom?: number
  maxZoom?: number
  zoomControl?: boolean
  attributionControl?: boolean
  useBaiduProjection?: boolean  // 是否使用百度地图投影
  forceStandardCRS?: boolean    // 强制使用标准坐标系（EPSG:3857）
}

// 标记点配置接口
export interface MarkerConfig {
  position: [number, number]
  title?: string
  popup?: string
  icon?: L.Icon
  draggable?: boolean
}

// 图层配置接口
export interface LayerConfig {
  url: string
  options?: L.TileLayerOptions
}

// 绘制选项接口
export interface DrawOptions {
  color?: string
  weight?: number
  opacity?: number
  fillColor?: string
  fillOpacity?: number
  dashArray?: string
}

// 绘制模式枚举
export enum DrawingMode {
  NONE = 'none',
  POINT = 'point',
  LINE = 'line',
  POLYGON = 'polygon',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  MEASURE_DISTANCE = 'measure-distance', // 测距
  MEASURE_AREA = 'measure-area' // 测面
}

// 绘制事件回调接口
export interface DrawingCallbacks {
  onDrawStart?: (mode: DrawingMode) => void
  onDrawEnd?: (layer: L.Layer, mode: DrawingMode) => void
  onDrawCancel?: (mode: DrawingMode) => void
}

// 图层服务类型枚举
export enum LayerServiceType {
  XYZ = 'xyz',
  TMS = 'tms', 
  WMS = 'wms',
  WMTS = 'wmts',
  WFS = 'wfs',
  WCS = 'wcs',
  GEOJSON = 'geojson',
  LOCAL_JSON = 'local-json' // 本地 JSON 文件 (public 目录下)
}

// 通用图层配置接口
export interface UniversalLayerConfig {
  id: string
  name: string
  type: LayerServiceType
  url?: string // URL 路径，对于本地文件使用相对路径 (如 '/data/example.json')
  data?: any // 直接传入的数据对象
  options?: any
  // XYZ/TMS 特有选项
  maxZoom?: number
  minZoom?: number
  subdomains?: string | string[]
  attribution?: string
  // WMS 特有选项
  layers?: string
  format?: string
  transparent?: boolean
  version?: string
  crs?: L.CRS
  // WMTS 特有选项
  layer?: string
  wmtsStyle?: string
  tilematrixSet?: string
  // WFS 特有选项
  typeName?: string
  outputFormat?: string
  maxFeatures?: number
  // GeoJSON 特有选项
  pointToLayer?: (feature: any, latlng: L.LatLng) => L.Layer
  geoJsonStyle?: (feature: any) => L.PathOptions
  onEachFeature?: (feature: any, layer: L.Layer) => void
}

/**
 * Leaflet 地图服务类
 * 封装了地图的创建、标记、图层、绘制等功能
 */
export class MapService {
  private map: L.Map | null = null
  private markers: Map<string, L.Marker> = new Map()
  private layers: Map<string, L.Layer> = new Map()
  private heatmapLayers: Map<string, any> = new Map() // 存储热力图图层
  private drawingItems: L.FeatureGroup = new L.FeatureGroup()
  
  // 绘制状态管理
  private currentDrawingMode: DrawingMode = DrawingMode.NONE
  private drawingCallbacks: DrawingCallbacks = {}
  private tempDrawingLayers: L.Layer[] = []
  private drawingPoints: L.LatLng[] = []
  private drawingCounter: number = 0 // 绘制图形计数器

  /**
   * 初始化地图
   * @param config 地图配置
   */
  public async initMap(config: MapConfig): Promise<L.Map> {
    // 确保配置已初始化
    await initializeMapConfig()
    
    const mapConfig = getMapConfig()
    const {
      container,
      center = mapConfig.defaultCenter,
      zoom = mapConfig.defaultZoom,
      minZoom = mapConfig.minZoom,
      maxZoom = mapConfig.maxZoom,
      zoomControl = true,
      attributionControl = true,
      useBaiduProjection = false,
      forceStandardCRS = false
    } = config

    console.log('MapService: 初始化地图配置', config)

    // 获取默认图层配置来判断是否需要百度投影
    const layerConfig = getDefaultTileLayerConfig()
    const needsBaiduProjection = useBaiduProjection || 
      (layerConfig.name.includes('百度') || layerConfig.url.includes('bdimg.com')) && !forceStandardCRS

    // 如果需要百度地图投影且不强制使用标准坐标系，则创建百度地图实例
    if (needsBaiduProjection) {
      // 初始化全局百度CRS
      initGlobalBaiduCRS()
      
      // 检查百度地图支持
      const baiduSupported = BaiduMapUtils.checkBaiduMapSupport()
      if (!baiduSupported) {
        console.error('MapService: 百度地图支持库检查失败，回退到标准地图')
        this.map = L.map(container, {
          center,
          zoom,
          minZoom,
          maxZoom,
          zoomControl,
          attributionControl
        })
      } else {
        try {
          this.map = BaiduMapUtils.createBaiduMap(container, {
            center,
            zoom,
            minZoom,
            maxZoom,
            zoomControl,
            attributionControl
          })
          console.log('MapService: 百度地图实例创建成功', this.map)
        } catch (error) {
          console.error('MapService: 百度地图创建失败，回退到标准地图', error)
          // 回退到标准地图
          this.map = L.map(container, {
            center,
            zoom,
            minZoom,
            maxZoom,
            zoomControl,
            attributionControl
          })
        }
      }
    } else {
      // 创建标准地图，明确指定使用标准坐标系
      const mapOptions: L.MapOptions = {
        center,
        zoom,
        minZoom,
        maxZoom,
        zoomControl,
        attributionControl
      }
      // 如果强制使用标准坐标系，明确指定CRS
      if (forceStandardCRS) {
        mapOptions.crs = L.CRS.EPSG3857
      } else if (!useBaiduProjection) {
        // 确保非百度地图使用标准坐标系
        mapOptions.crs = L.CRS.EPSG3857
      }
      
      this.map = L.map(container, mapOptions)
      
    }

    console.log('MapService: 地图实例创建成功', this.map)

    // 直接使用默认可见图层，提升加载速度
    try {
      const tileLayer = this.addTileLayerFromConfig('default', layerConfig)
      
      if (tileLayer) {
        // 优化图层选项以提升性能
        if ('updateWhenIdle' in tileLayer.options) {
          (tileLayer.options as any).updateWhenIdle = true
          ;(tileLayer.options as any).keepBuffer = 2
        }
        
        // 设置图层加载超时检测
        const timeoutId = setTimeout(() => {
          this.switchToFallbackLayer()
        }, 10000) // 10秒超时
        
        // 成功加载时清除超时
        tileLayer.on('load', () => {
          clearTimeout(timeoutId)
        })
        
        // 加载错误时切换到备用图层
        tileLayer.on('tileerror', () => {
          clearTimeout(timeoutId)
          this.switchToFallbackLayer()
        })
      }

      // 如果是影像图层，自动添加注记
      this.addAnnotationIfSatellite(layerConfig)
    } catch (error) {
      console.error('MapService: 无法加载瓦片图层', error)
      this.switchToFallbackLayer()
    }

    // 添加绘制图层组
    this.drawingItems.addTo(this.map)

    return this.map
  }

  /**
   * 获取地图实例
   */
  public getMap(): L.Map | null {
    return this.map
  }

  /**
   * 销毁地图
   */
  public destroyMap(): void {
    if (this.map) {
      this.map.remove()
      this.map = null
      this.markers.clear()
      this.layers.clear()
      this.heatmapLayers.clear() // 清除热力图图层
      this.drawingItems.clearLayers()
    }
  }

  /**
   * 添加瓦片图层
   * @param layerId 图层ID
   * @param config 图层配置
   */
  public addTileLayer(layerId: string, config: LayerConfig): L.TileLayer | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    const layer = L.tileLayer(config.url, config.options)
    layer.addTo(this.map)
    this.layers.set(layerId, layer)
    
    return layer
  }

  /**
   * 从配置文件添加瓦片图层
   * @param layerId 图层ID
   * @param config 瓦片图层配置
   */
  public addTileLayerFromConfig(layerId: string, config: TileLayerConfig): L.TileLayer | L.LayerGroup | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    // 检查是否是WMS图层
    if (config.type === 'wms') {
      console.log(`创建WMS图层: ${config.name}`)
      const wmsLayer = L.tileLayer.wms(config.url, {
        layers: config.layers || '',
        format: config.format || 'image/png',
        transparent: config.transparent !== false,
        version: config.version || '1.1.1',
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        crossOrigin: true
      })
      
      wmsLayer.addTo(this.map)
      this.layers.set(layerId, wmsLayer)
      
      // 监听图层加载事件
      wmsLayer.on('loading', () => {
        console.log(`WMS图层 ${config.name} 开始加载`)
      })
      
      wmsLayer.on('load', () => {
        console.log(`WMS图层 ${config.name} 加载完成`)
      })
      
      wmsLayer.on('tileerror', (e: any) => {
        console.error(`WMS图层 ${config.name} 瓦片加载错误:`, e)
      })
      
      return wmsLayer
    }

    // 检查是否是百度地图图层
    if (config.name.includes('百度') || config.url.includes('bdimg.com')) {
      return this.addBaiduTileLayerOptimized(layerId, config)
    }

    const layerOptions: L.TileLayerOptions = {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || undefined,
      crossOrigin: true  // 添加跨域支持
    }

    
    const layer = L.tileLayer(config.url, layerOptions)
    layer.addTo(this.map)
    this.layers.set(layerId, layer)
    
    // 监听图层加载事件
    layer.on('loading', () => {
      console.log(`图层 ${config.name} 开始加载`)
    })
    
    layer.on('load', () => {
      console.log(`图层 ${config.name} 加载完成`)
    })
    
    layer.on('tileerror', (e: any) => {
      console.error(`图层 ${config.name} 瓦片加载错误:`, e)
    })
    
    return layer
  }

  /**
   * 添加百度地图瓦片图层（优化版本，使用工厂函数）
   * @param layerId 图层ID
   * @param config 瓦片图层配置
   */
  public addBaiduTileLayerOptimized(layerId: string, config: TileLayerConfig): L.TileLayer | L.LayerGroup | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    // 检查百度地图支持
    const baiduSupported = BaiduMapUtils.checkBaiduMapSupport()
    if (!baiduSupported) {
      console.error('百度地图支持库未加载，请确保 proj4 和 proj4leaflet 已正确引入')
      return null
    }

    try {
      // 根据配置确定图层类型
      let layerType: 'vec' | 'img' = 'vec'
      if (config.name.includes('影像') || config.url.includes('shangetu')) {
        layerType = 'img'
      }

      // 使用优化的工厂函数创建图层
      const layer = createBaiduTileLayer({ 
        layer: layerType, 
        name: config.name 
      })

      // 应用性能优化选项
      if (layer instanceof L.TileLayer) {
        layer.options.maxZoom = config.maxZoom
        layer.options.minZoom = 3
        layer.options.keepBuffer = 2
        layer.options.updateWhenIdle = true
        layer.options.updateWhenZooming = false
      }

      layer.addTo(this.map)
      this.layers.set(layerId, layer as L.TileLayer)
      
      console.log(`MapService: 优化的百度地图图层 ${config.name} 添加成功`)
      return layer
    } catch (error) {
      console.error(`MapService: 添加百度地图图层 ${config.name} 失败:`, error)
      return null
    }
  }

  /**
   * 添加百度地图瓦片图层（原版本，保持兼容性）
   * @param layerId 图层ID
   * @param config 瓦片图层配置
   */
  public addBaiduTileLayer(layerId: string, config: TileLayerConfig): BaiduTileLayer | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    // 检查百度地图支持
    const baiduSupported = BaiduMapUtils.checkBaiduMapSupport()
    if (!baiduSupported) {
      console.error('百度地图支持库未加载，请确保 proj4 和 proj4leaflet 已正确引入')
      return null
    }

    const layerOptions: BaiduTileLayerOptions = {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains,
      tms: true
    }

    const layer = new BaiduTileLayer(config.url, layerOptions)
    layer.addTo(this.map)
    this.layers.set(layerId, layer)
    
    console.log(`MapService: 百度地图图层 ${config.name} 添加成功`)
    return layer
  }

  /**
   * 为图层自动添加注记（影像图层和天地图矢量）
   */
  private addAnnotationIfSatellite(layerConfig: TileLayerConfig): void {
    if (!this.map) return
    
    // 判断是否需要添加注记（影像图层或天地图矢量）
    const needsAnnotation = layerConfig.name.includes('影像') || 
                           layerConfig.name.includes('卫星') || 
                           layerConfig.name.includes('矢量') ||
                           layerConfig.url.includes('img_w') ||
                           layerConfig.url.includes('vec_w') ||
                           layerConfig.url.includes('style=6') ||
                           layerConfig.url.includes('vtile')
    
    if (needsAnnotation) {
      console.log(`MapService: 为图层 ${layerConfig.name} 添加注记`)
      
      let annotationUrl = ''
      
      // 根据不同的图层添加对应的注记
      if (layerConfig.url.includes('tianditu.gov.cn/img_w')) {
        // 天地图影像注记
        annotationUrl = layerConfig.url.replace('/img_w/', '/cia_w/').replace('LAYER=img', 'LAYER=cia')
      } else if (layerConfig.url.includes('tianditu.gov.cn/vec_w')) {
        // 天地图矢量注记
        annotationUrl = layerConfig.url.replace('/vec_w/', '/cva_w/').replace('LAYER=vec', 'LAYER=cva')
      } else if (layerConfig.url.includes('autonavi.com') && layerConfig.url.includes('style=6')) {
        // 高德影像注记
        annotationUrl = 'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}'
      } else if (layerConfig.url.includes('bdimg.com')) {
        // 百度影像注记
        annotationUrl = 'http://online{s}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=sl&udt=20190507'
      }
      
      if (annotationUrl) {
        // 处理天地图 key
        if (annotationUrl.includes('{tianditu_key}')) {
          annotationUrl = annotationUrl.replace('{tianditu_key}', '17763402f97aa5d363379927f5ce70a6')
        }
        
        const annotationLayer = L.tileLayer(annotationUrl, {
          attribution: layerConfig.attribution,
          maxZoom: layerConfig.maxZoom,
          subdomains: layerConfig.subdomains,
          pane: 'overlayPane' // 确保注记在影像之上
        })
        
        annotationLayer.addTo(this.map)
        this.layers.set('annotation', annotationLayer)
        
        console.log('MapService: 注记图层添加成功')
      }
    }
  }

  /**
   * 添加注记图层（公共方法）
   */
  public addAnnotationLayer(layerConfig: TileLayerConfig): void {
    this.addAnnotationIfSatellite(layerConfig)
  }

  /**
   * 移除图层（支持所有类型的图层）
   * @param layerId 图层ID
   */
  public removeTileLayer(layerId: string): void {
    const layer = this.layers.get(layerId)
    if (layer && this.map) {
      this.map.removeLayer(layer)
      this.layers.delete(layerId)
      console.log(`已移除图层: ${layerId}`)
    } else {
      // 如果在layers Map中找不到，尝试从地图中直接查找并移除
      if (this.map) {
        let found = false
        this.map.eachLayer((mapLayer: L.Layer) => {
          if ((mapLayer as any).layerId === layerId) {
            this.map!.removeLayer(mapLayer)
            found = true
            console.log(`从地图中直接移除图层: ${layerId}`)
          }
        })
        if (!found) {
          console.warn(`未找到要移除的图层: ${layerId}`)
        }
      }
    }
  }

  /**
   * 清除所有瓦片图层
   */
  public clearAllTileLayers(): void {
    console.log('清除所有瓦片图层...')
    // 移除所有已注册的图层
    this.layers.forEach((layer, layerId) => {
      if (this.map) {
        this.map.removeLayer(layer)
        console.log(`已移除图层: ${layerId}`)
      }
    })
    this.layers.clear()
    
    // 额外检查：遍历地图上的所有图层，移除瓦片图层
    if (this.map) {
      this.map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.TileLayer) {
          this.map!.removeLayer(layer)
          console.log('移除未注册的瓦片图层')
        }
      })
    }
  }

  /**
   * 添加标记点
   * @param markerId 标记ID
   * @param config 标记配置
   */
  public addMarker(markerId: string, config: MarkerConfig): L.Marker | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    // 如果没有提供图标，使用默认图标或创建一个
    let markerIcon = config.icon
    if (!markerIcon) {
      try {
        // 直接创建图标而不依赖默认图标
        markerIcon = L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
        console.log('使用标准图标配置创建标记图标')
      } catch (error) {
        console.error('创建标记图标失败:', error)
        // 如果连基本图标都创建失败，使用最简单的方式
        markerIcon = undefined // 让 Leaflet 使用其内置默认值
      }
    }

    const marker = L.marker(config.position, {
      title: config.title,
      icon: markerIcon,
      draggable: config.draggable || false
    })

    if (config.popup) {
      marker.bindPopup(config.popup)
    }

    marker.addTo(this.map)
    this.markers.set(markerId, marker)

    console.log(`标记 ${markerId} 添加成功:`, marker)
    return marker
  }

  /**
   * 移除标记点
   * @param markerId 标记ID
   */
  public removeMarker(markerId: string): void {
    const marker = this.markers.get(markerId)
    if (marker && this.map) {
      this.map.removeLayer(marker)
      this.markers.delete(markerId)
    }
  }

  /**
   * 获取标记点
   * @param markerId 标记ID
   */
  public getMarker(markerId: string): L.Marker | undefined {
    return this.markers.get(markerId)
  }

  /**
   * 清除所有标记点
   */
  public clearMarkers(): void {
    this.markers.forEach((marker) => {
      if (this.map) {
        this.map.removeLayer(marker)
      }
    })
    this.markers.clear()
  }

  /**
   * 设置地图中心点
   * @param center 中心点坐标
   * @param zoom 缩放级别
   */
  public setCenter(center: [number, number], zoom?: number): void {
    if (this.map) {
      this.map.setView(center, zoom || this.map.getZoom())
    }
  }

  /**
   * 获取地图中心点
   */
  public getCenter(): [number, number] | null {
    if (this.map) {
      const center = this.map.getCenter()
      return [center.lat, center.lng]
    }
    return null
  }

  /**
   * 设置缩放级别
   * @param zoom 缩放级别
   */
  public setZoom(zoom: number): void {
    if (this.map) {
      this.map.setZoom(zoom)
    }
  }

  /**
   * 获取缩放级别
   */
  public getZoom(): number | null {
    return this.map ? this.map.getZoom() : null
  }

  /**
   * 适应视图 - 优先适应所有标记点，如果没有标记则适应绘制图形，否则重置到默认视图
   */
  public fitBounds(): void {
    if (!this.map) {
      console.warn('地图未初始化，无法执行 fitBounds')
      return
    }

    // 收集所有需要适应的图层
    const layersToFit: L.Layer[] = []
    
    // 添加所有标记点
    if (this.markers.size > 0) {
      layersToFit.push(...Array.from(this.markers.values()))
    }
    
    // 添加所有绘制图形
    this.drawingItems.eachLayer((layer) => {
      layersToFit.push(layer)
    })
    
    if (layersToFit.length > 0) {
      // 如果有标记点或绘制图形，适应它们的边界
      const group = new L.FeatureGroup(layersToFit)
      this.map.fitBounds(group.getBounds(), {
        padding: [20, 20] // 添加一些边距
      })
      console.log(`适应视图：包含 ${layersToFit.length} 个对象`)
    } else {
      // 如果没有任何标记或绘制图形，重置到地图的完整视图
      const mapConfig = getMapConfig()
      this.map.setView(mapConfig.defaultCenter, mapConfig.defaultZoom)
      console.log('重置到默认视图：没有找到标记点或绘制图形')
    }
  }

  /**
   * 绘制圆形
   * @param center 圆心坐标
   * @param radius 半径（米）
   * @param options 绘制选项
   */
  public drawCircle(
    center: [number, number],
    radius: number,
    options: DrawOptions = {}
  ): L.Circle | null {
    if (!this.map) return null

    const circle = L.circle(center, {
      radius,
      color: options.color || '#3388ff',
      weight: options.weight || 3,
      opacity: options.opacity || 1,
      fillColor: options.fillColor || '#3388ff',
      fillOpacity: options.fillOpacity || 0.2,
      dashArray: options.dashArray
    })

    circle.addTo(this.drawingItems)
    return circle
  }

  /**
   * 绘制多边形
   * @param positions 顶点坐标数组
   * @param options 绘制选项
   */
  public drawPolygon(
    positions: [number, number][],
    options: DrawOptions = {}
  ): L.Polygon | null {
    if (!this.map) return null

    const polygon = L.polygon(positions, {
      color: options.color || '#3388ff',
      weight: options.weight || 3,
      opacity: options.opacity || 1,
      fillColor: options.fillColor || '#3388ff',
      fillOpacity: options.fillOpacity || 0.2
    })

    polygon.addTo(this.drawingItems)
    return polygon
  }

  /**
   * 绘制折线
   * @param positions 坐标点数组
   * @param options 绘制选项
   */
  public drawPolyline(
    positions: [number, number][],
    options: DrawOptions = {}
  ): L.Polyline | null {
    if (!this.map) return null

    const polyline = L.polyline(positions, {
      color: options.color || '#3388ff',
      weight: options.weight || 3,
      opacity: options.opacity || 1
    })

    polyline.addTo(this.drawingItems)
    return polyline
  }

  /**
   * 清除所有绘制图形
   */
  public clearDrawings(): void {
    this.drawingItems.clearLayers()
  }

  /**
   * 添加事件监听
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  public on(event: string, handler: L.LeafletEventHandlerFn): void {
    if (this.map) {
      this.map.on(event, handler)
    }
  }

  /**
   * 移除事件监听
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  public off(event: string, handler?: L.LeafletEventHandlerFn): void {
    if (this.map) {
      this.map.off(event, handler)
    }
  }

  /**
   * 创建自定义图标
   * @param iconUrl 图标URL
   * @param options 图标选项
   */
  public createIcon(iconUrl: string, options?: L.IconOptions): L.Icon {
    return L.icon({
      iconUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
      ...options
    })
  }

  /**
   * 获取地图边界
   */
  public getBounds(): L.LatLngBounds | null {
    return this.map ? this.map.getBounds() : null
  }

  /**
   * 坐标转换：经纬度转屏幕坐标
   * @param latlng 经纬度坐标
   */
  public latLngToContainerPoint(latlng: [number, number]): L.Point | null {
    if (!this.map) return null
    return this.map.latLngToContainerPoint(latlng)
  }

  /**
   * 坐标转换：屏幕坐标转经纬度
   * @param point 屏幕坐标
   */
  public containerPointToLatLng(point: L.Point): [number, number] | null {
    if (!this.map) return null
    const latlng = this.map.containerPointToLatLng(point)
    return [latlng.lat, latlng.lng]
  }

  /**
   * 初始化百度地图（便捷方法）
   * @param container 容器
   * @param center 中心点（WGS84坐标）
   * @param zoom 缩放级别
   */
  public async initBaiduMap(
    container: string | HTMLElement, 
    center: [number, number] = [37.5, 102.5], 
    zoom: number = 7
  ): Promise<L.Map> {
    console.log('MapService: 初始化百度地图专用方法')
    
    // 确保配置已初始化
    await initializeMapConfig()
    
    // 强制使用百度投影和坐标转换
    try {
      this.map = BaiduMapUtils.createBaiduMap(container, {
        center,
        zoom,
        minZoom: 3,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true
      })
      
      console.log('MapService: 百度地图创建成功')
      
      // 添加百度电子地图图层
      const baiduLayer = this.addBaiduVectorLayer()
      if (baiduLayer) {
        console.log('MapService: 百度电子图层添加成功')
      }
      
      // 添加绘制图层组
      this.drawingItems.addTo(this.map)
      
      return this.map
    } catch (error) {
      console.error('MapService: 百度地图初始化失败:', error)
      throw error
    }
  }

  /**
   * 添加百度电子地图图层（便捷方法）
   */
  public addBaiduVectorLayer(): L.TileLayer | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    try {
      const layer = BaiduMapUtils.addBaiduVectorLayer(this.map)
      this.layers.set('baidu-vector', layer)
      return layer
    } catch (error) {
      console.error('添加百度电子地图图层失败:', error)
      return null
    }
  }

  /**
   * 添加百度影像地图图层（便捷方法）
   */
  public addBaiduSatelliteLayer(): L.LayerGroup | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    try {
      const layer = BaiduMapUtils.addBaiduSatelliteLayer(this.map)
      this.layers.set('baidu-satellite', layer as any)
      return layer
    } catch (error) {
      console.error('添加百度影像地图图层失败:', error)
      return null
    }
  }

  /**
   * 添加百度地图注记图层（便捷方法）
   */
  public addBaiduAnnotationLayer(): L.TileLayer | null {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    try {
      const layer = BaiduMapUtils.addBaiduAnnotationLayer(this.map)
      this.layers.set('baidu-annotation', layer)
      return layer
    } catch (error) {
      console.error('添加百度注记图层失败:', error)
      return null
    }
  }

  /**
   * 检查是否支持百度地图
   */
  public checkBaiduMapSupport(): boolean {
    return BaiduMapUtils.checkBaiduMapSupport()
  }

  /**
   * 通用图层添加方法 - 支持多种服务类型
   * @param config 图层配置
   */
  public async addLayer(config: UniversalLayerConfig): Promise<L.Layer | null> {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    try {
      let layer: L.Layer | null = null

      switch (config.type) {
        case LayerServiceType.XYZ:
          layer = this.createXYZLayer(config)
          break
        case LayerServiceType.TMS:
          layer = this.createTMSLayer(config)
          break
        case LayerServiceType.WMS:
          layer = this.createWMSLayer(config)
          break
        case LayerServiceType.WMTS:
          layer = this.createWMTSLayer(config)
          break
        case LayerServiceType.WFS:
          layer = await this.createWFSLayer(config)
          break
        case LayerServiceType.WCS:
          layer = this.createWCSLayer(config)
          break
        case LayerServiceType.GEOJSON:
          layer = await this.createGeoJSONLayer(config)
          break
        case LayerServiceType.LOCAL_JSON:
          layer = await this.createLocalJSONLayer(config)
          break
        default:
          throw new Error(`不支持的图层类型: ${config.type}`)
      }

      if (layer) {
        // 为图层添加ID标识，便于后续查找和移除
        (layer as any).layerId = config.id
        layer.addTo(this.map)
        this.layers.set(config.id, layer)
        console.log(`✅ ${config.name} (${config.type}) 图层添加成功`)
        return layer
      } else {
        throw new Error('图层创建失败')
      }
    } catch (error) {
      console.error(`❌ 添加 ${config.name} 图层失败:`, error)
      return null
    }
  }

  /**
   * 创建 XYZ 瓦片图层
   */
  private createXYZLayer(config: UniversalLayerConfig): L.TileLayer {
    if (!config.url) {
      throw new Error('XYZ 图层需要提供 URL')
    }
    return L.tileLayer(config.url, {
      maxZoom: config.maxZoom || 18,
      minZoom: config.minZoom || 0,
      subdomains: config.subdomains,
      attribution: config.attribution,
      crossOrigin: true,
      ...config.options
    })
  }

  /**
   * 创建 TMS 瓦片图层
   */
  private createTMSLayer(config: UniversalLayerConfig): L.TileLayer {
    if (!config.url) {
      throw new Error('TMS 图层需要提供 URL')
    }
    return L.tileLayer(config.url, {
      maxZoom: config.maxZoom || 18,
      minZoom: config.minZoom || 0,
      subdomains: config.subdomains,
      attribution: config.attribution,
      tms: true, // TMS 特有属性
      crossOrigin: true,
      ...config.options
    })
  }

  /**
   * 创建 WMS 图层
   */
  private createWMSLayer(config: UniversalLayerConfig): L.TileLayer.WMS {
    if (!config.url) {
      throw new Error('WMS 图层需要提供 URL')
    }
    return L.tileLayer.wms(config.url, {
      layers: config.layers || '',
      format: config.format || 'image/png',
      transparent: config.transparent !== false,
      version: config.version || '1.1.1',
      crs: config.crs || L.CRS.EPSG3857,
      attribution: config.attribution,
      ...config.options
    })
  }

  /**
   * 创建 WMTS 图层
   */
  private createWMTSLayer(config: UniversalLayerConfig): L.TileLayer {
    if (!config.url) {
      throw new Error('WMTS 图层需要提供 URL')
    }
    // WMTS 通常使用类似 XYZ 的方式，但 URL 格式不同
    return L.tileLayer(config.url, {
      maxZoom: config.maxZoom || 18,
      minZoom: config.minZoom || 0,
      attribution: config.attribution,
      crossOrigin: true,
      ...config.options
    })
  }

  /**
   * 创建 WFS 图层（异步加载 GeoJSON 数据）
   */
  private async createWFSLayer(config: UniversalLayerConfig): Promise<L.GeoJSON | null> {
    try {
      const wfsUrl = this.buildWFSUrl(config)
      const response = await fetch(wfsUrl)
      
      if (!response.ok) {
        throw new Error(`WFS 请求失败: ${response.status}`)
      }
      
      const geoJsonData = await response.json()
      
      return L.geoJSON(geoJsonData, {
        pointToLayer: config.pointToLayer,
        style: config.geoJsonStyle,
        onEachFeature: config.onEachFeature,
        ...config.options
      })
    } catch (error) {
      console.error('WFS 图层创建失败:', error)
      return null
    }
  }

  /**
   * 构建 WFS 请求 URL
   */
  private buildWFSUrl(config: UniversalLayerConfig): string {
    const params = new URLSearchParams({
      service: 'WFS',
      version: config.version || '1.1.0',
      request: 'GetFeature',
      typeName: config.typeName || '',
      outputFormat: config.outputFormat || 'application/json',
      srsName: 'EPSG:4326'
    })
    
    return `${config.url}?${params.toString()}`
  }

  /**
   * 创建 WCS 图层（类似 WMS）
   */
  private createWCSLayer(config: UniversalLayerConfig): L.TileLayer.WMS {
    if (!config.url) {
      throw new Error('WCS 图层需要提供 URL')
    }
    // WCS 可以用类似 WMS 的方式处理
    return L.tileLayer.wms(config.url, {
      layers: config.layers || '',
      format: config.format || 'image/png',
      version: config.version || '1.0.0',
      service: 'WCS',
      request: 'GetCoverage',
      crs: config.crs || L.CRS.EPSG3857,
      attribution: config.attribution,
      ...config.options
    })
  }

  /**
   * 创建 GeoJSON 图层（从 URL 加载或直接使用数据对象）
   */
  private async createGeoJSONLayer(config: UniversalLayerConfig): Promise<L.GeoJSON | null> {
    try {
      let geoJsonData: any = null

      // 支持两种方式：直接数据对象或从URL加载
      if (config.data) {
        // 方式1: 直接传入数据对象
        geoJsonData = config.data
        console.log(`📁 使用直接传入的数据创建GeoJSON图层: ${config.name}`)
      } else if (config.url) {
        // 方式2: 从URL加载
        const response = await fetch(config.url)
        
        if (!response.ok) {
          throw new Error(`GeoJSON 请求失败: ${response.status}`)
        }
        
        geoJsonData = await response.json()
        console.log(`🌐 从URL加载GeoJSON数据: ${config.url}`)
      } else {
        throw new Error('GeoJSON 图层需要提供 data 或 url')
      }
      
      return L.geoJSON(geoJsonData, {
        pointToLayer: config.pointToLayer,
        style: config.geoJsonStyle,
        onEachFeature: config.onEachFeature,
        ...config.options
      })
    } catch (error) {
      console.error('GeoJSON 图层创建失败:', error)
      return null
    }
  }

  /**
   * 创建本地 JSON 图层（从 public 目录加载）
   */
  private async createLocalJSONLayer(config: UniversalLayerConfig): Promise<L.GeoJSON | null> {
    try {
      let jsonData: any = null

      // 支持三种方式：直接数据、URL路径、或默认路径
      if (config.data) {
        // 方式1: 直接传入数据对象
        jsonData = config.data
        console.log(`📁 使用直接传入的数据创建图层: ${config.name}`)
      } else if (config.url) {
        // 方式2: 从指定路径加载（public 目录下的相对路径）
        const response = await fetch(config.url)
        
        if (!response.ok) {
          throw new Error(`本地 JSON 文件加载失败: ${response.status} - ${config.url}`)
        }
        
        jsonData = await response.json()
        console.log(`📁 从本地文件加载数据: ${config.url}`)
      } else {
        throw new Error('本地 JSON 图层需要提供 data 或 url')
      }

      // 创建 GeoJSON 图层
      return L.geoJSON(jsonData, {
        pointToLayer: config.pointToLayer,
        style: config.geoJsonStyle,
        onEachFeature: config.onEachFeature,
        ...config.options
      })
    } catch (error) {
      console.error('本地 JSON 图层创建失败:', error)
      return null
    }
  }

  /**
   * 切换到备用图层（OpenStreetMap）
   */
  private switchToFallbackLayer(): void {
    if (!this.map) return

    try {
      // 移除当前图层
      this.removeTileLayer('default')
      this.removeTileLayer('annotation')

      // 使用 OpenStreetMap 作为备用图层
      const fallbackConfig = {
        name: "OpenStreetMap (备用)",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
        subdomains: ["a", "b", "c"],
        visible: true
      }

      console.log('MapService: 切换到备用图层 OpenStreetMap')
      const fallbackLayer = this.addTileLayerFromConfig('fallback', fallbackConfig)
      
      if (fallbackLayer && 'updateWhenIdle' in fallbackLayer.options) {
        (fallbackLayer.options as any).updateWhenIdle = true
        ;(fallbackLayer.options as any).keepBuffer = 2
      }
    } catch (error) {
      console.error('MapService: 备用图层加载也失败了', error)
    }
  }

  // ==================== 交互式绘制方法 ====================

  /**
   * 设置绘制回调函数
   * @param callbacks 回调函数配置
   */
  public setDrawingCallbacks(callbacks: DrawingCallbacks): void {
    this.drawingCallbacks = callbacks
  }

  /**
   * 获取当前绘制模式
   */
  public getCurrentDrawingMode(): DrawingMode {
    return this.currentDrawingMode
  }

  /**
   * 停止当前绘制
   */
  public stopDrawing(): void {
    if (this.currentDrawingMode === DrawingMode.NONE) return

    const previousMode = this.currentDrawingMode
    this.currentDrawingMode = DrawingMode.NONE
    
    // 清理临时图层
    this.clearTempDrawingLayers()
    this.drawingPoints = []
    
    // 移除地图事件监听
    if (this.map) {
      this.map.off('click', this.onMapClick, this)
      this.map.off('dblclick', this.onMapDoubleClick, this)
      this.map.off('mousemove', this.onMapMouseMove, this)
      this.map.getContainer().style.cursor = ''
    }

    // 触发取消回调
    this.drawingCallbacks.onDrawCancel?.(previousMode)
    console.log(`🛑 停止绘制模式: ${previousMode}`)
  }

  /**
   * 开始绘制点
   */
  public startDrawingPoint(options: DrawOptions = {}): void {
    if (!this.map) {
      console.warn('地图未初始化')
      return
    }

    this.stopDrawing() // 停止之前的绘制
    this.currentDrawingMode = DrawingMode.POINT
    
    // 设置鼠标样式
    this.map.getContainer().style.cursor = 'crosshair'
    
    // 绑定点击事件
    this.map.on('click', this.onMapClick, this)
    
    this.drawingCallbacks.onDrawStart?.(DrawingMode.POINT)
    console.log('📍 开始绘制点模式')
  }

  /**
   * 开始绘制线
   */
  public startDrawingLine(options: DrawOptions = {}): void {
    if (!this.map) {
      console.warn('地图未初始化')
      return
    }

    this.stopDrawing()
    this.currentDrawingMode = DrawingMode.LINE
    this.drawingPoints = []
    
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', this.onMapClick, this)
    this.map.on('dblclick', this.onMapDoubleClick, this)
    this.map.on('mousemove', this.onMapMouseMove, this)
    
    this.drawingCallbacks.onDrawStart?.(DrawingMode.LINE)
    console.log('📏 开始绘制线模式 - 单击添加点，双击结束')
  }

  /**
   * 开始绘制多边形
   */
  public startDrawingPolygon(options: DrawOptions = {}): void {
    if (!this.map) {
      console.warn('地图未初始化')
      return
    }

    this.stopDrawing()
    this.currentDrawingMode = DrawingMode.POLYGON
    this.drawingPoints = []
    
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', this.onMapClick, this)
    this.map.on('dblclick', this.onMapDoubleClick, this)
    this.map.on('mousemove', this.onMapMouseMove, this)
    
    this.drawingCallbacks.onDrawStart?.(DrawingMode.POLYGON)
    console.log('🔷 开始绘制多边形模式 - 单击添加点，双击结束')
  }

  /**
   * 开始绘制矩形
   */
  public startDrawingRectangle(options: DrawOptions = {}): void {
    if (!this.map) {
      console.warn('地图未初始化')
      return
    }

    this.stopDrawing()
    this.currentDrawingMode = DrawingMode.RECTANGLE
    this.drawingPoints = []
    
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', this.onMapClick, this)
    this.map.on('mousemove', this.onMapMouseMove, this)
    
    this.drawingCallbacks.onDrawStart?.(DrawingMode.RECTANGLE)
    console.log('⬜ 开始绘制矩形模式 - 单击开始，再次单击结束')
  }

  /**
   * 开始绘制圆形
   */
  public startDrawingCircle(options: DrawOptions = {}): void {
    if (!this.map) {
      console.warn('地图未初始化')
      return
    }

    this.stopDrawing()
    this.currentDrawingMode = DrawingMode.CIRCLE
    this.drawingPoints = []
    
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', this.onMapClick, this)
    this.map.on('mousemove', this.onMapMouseMove, this)
    
    this.drawingCallbacks.onDrawStart?.(DrawingMode.CIRCLE)
    console.log('⭕ 开始绘制圆形模式 - 单击开始，再次单击结束')
  }

  /**
   * 开始测距
   */
  public startMeasureDistance(options: DrawOptions = {}): void {
    if (!this.map) {
      console.warn('地图未初始化')
      return
    }

    this.stopDrawing()
    this.currentDrawingMode = DrawingMode.MEASURE_DISTANCE
    this.drawingPoints = []
    
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', this.onMapClick, this)
    this.map.on('dblclick', this.onMapDoubleClick, this)
    this.map.on('mousemove', this.onMapMouseMove, this)
    
    this.drawingCallbacks.onDrawStart?.(DrawingMode.MEASURE_DISTANCE)
    console.log('📏 开始测距模式 - 单击添加点，双击结束测量')
  }

  /**
   * 开始测面
   */
  public startMeasureArea(options: DrawOptions = {}): void {
    if (!this.map) {
      console.warn('地图未初始化')
      return
    }

    this.stopDrawing()
    this.currentDrawingMode = DrawingMode.MEASURE_AREA
    this.drawingPoints = []
    
    this.map.getContainer().style.cursor = 'crosshair'
    this.map.on('click', this.onMapClick, this)
    this.map.on('dblclick', this.onMapDoubleClick, this)
    this.map.on('mousemove', this.onMapMouseMove, this)
    
    this.drawingCallbacks.onDrawStart?.(DrawingMode.MEASURE_AREA)
    console.log('📐 开始测面模式 - 单击添加点，双击结束测量')
  }

  /**
   * 地图点击事件处理
   */
  private onMapClick = (e: L.LeafletMouseEvent) => {
    if (!this.map) return

    switch (this.currentDrawingMode) {
      case DrawingMode.POINT:
        this.finishDrawingPoint(e.latlng)
        break
      case DrawingMode.LINE:
        this.addLinePoint(e.latlng)
        break
      case DrawingMode.POLYGON:
        this.addPolygonPoint(e.latlng)
        break
      case DrawingMode.RECTANGLE:
        this.handleRectangleClick(e.latlng)
        break
      case DrawingMode.CIRCLE:
        this.handleCircleClick(e.latlng)
        break
      case DrawingMode.MEASURE_DISTANCE:
        this.addMeasurePoint(e.latlng)
        break
      case DrawingMode.MEASURE_AREA:
        this.addMeasurePoint(e.latlng)
        break
    }
  }

  /**
   * 地图双击事件处理
   */
  private onMapDoubleClick = (e: L.LeafletMouseEvent) => {
    if (!this.map) return

    // 阻止默认的缩放行为
    e.originalEvent.preventDefault()
    e.originalEvent.stopPropagation()

    switch (this.currentDrawingMode) {
      case DrawingMode.LINE:
        this.finishDrawingLine()
        break
      case DrawingMode.POLYGON:
        this.finishDrawingPolygon()
        break
      case DrawingMode.MEASURE_DISTANCE:
        this.finishMeasureDistance()
        break
      case DrawingMode.MEASURE_AREA:
        this.finishMeasureArea()
        break
    }
  }

  /**
   * 地图鼠标移动事件处理
   */
  private onMapMouseMove = (e: L.LeafletMouseEvent) => {
    if (!this.map) return

    switch (this.currentDrawingMode) {
      case DrawingMode.LINE:
        this.updateLinePreview(e.latlng)
        break
      case DrawingMode.POLYGON:
        this.updatePolygonPreview(e.latlng)
        break
      case DrawingMode.RECTANGLE:
        this.updateRectanglePreview(e.latlng)
        break
      case DrawingMode.CIRCLE:
        this.updateCirclePreview(e.latlng)
        break
      case DrawingMode.MEASURE_DISTANCE:
        this.updateMeasurePreview(e.latlng)
        break
      case DrawingMode.MEASURE_AREA:
        this.updateMeasurePreview(e.latlng)
        break
    }
  }

  /**
   * 完成点绘制
   */
  private finishDrawingPoint(latlng: L.LatLng): void {
    const drawingId = this.generateDrawingId()
    const marker = L.marker(latlng, {
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

    // 为图层添加ID属性
    ;(marker as any).drawingId = drawingId

    marker.addTo(this.drawingItems)
    
    // 生成并打印GeoJSON数据
    const geoJson = this.layerToGeoJSON(marker, 'point', drawingId)
    if (geoJson) {
      this.printGeoJSON(geoJson)
    }
    
    // 触发回调，但保持绘制模式继续
    this.drawingCallbacks.onDrawEnd?.(marker, this.currentDrawingMode)
    
    // 点绘制完成后继续保持绘制模式，可以连续绘制多个点
    console.log('📍 点绘制完成，继续绘制模式')
  }

  /**
   * 添加线条点
   */
  private addLinePoint(latlng: L.LatLng): void {
    this.drawingPoints.push(latlng)
    
    // 添加点标记
    const marker = L.circleMarker(latlng, {
      radius: 4,
      color: '#ff0000',
      fillColor: '#ff0000',
      fillOpacity: 0.8
    })
    marker.addTo(this.map!)
    this.tempDrawingLayers.push(marker)
  }

  /**
   * 更新线条预览
   */
  private updateLinePreview(latlng: L.LatLng): void {
    if (this.drawingPoints.length === 0) return

    // 移除之前的预览线
    this.clearPreviewLayers()

    // 创建预览线
    const previewPoints = [...this.drawingPoints, latlng]
    const previewLine = L.polyline(previewPoints, {
      color: '#ff0000',
      weight: 2,
      opacity: 0.6,
      dashArray: '5, 5'
    })
    previewLine.addTo(this.map!)
    this.tempDrawingLayers.push(previewLine)
  }

  /**
   * 完成线条绘制
   */
  private finishDrawingLine(): void {
    if (this.drawingPoints.length < 2) {
      console.warn('线条至少需要2个点')
      return
    }

    const drawingId = this.generateDrawingId()
    const line = L.polyline(this.drawingPoints, {
      color: '#3388ff',
      weight: 3,
      opacity: 1
    })

    // 为图层添加ID属性
    ;(line as any).drawingId = drawingId

    line.addTo(this.drawingItems)
    
    // 生成并打印GeoJSON数据
    const geoJson = this.layerToGeoJSON(line, 'line', drawingId)
    if (geoJson) {
      this.printGeoJSON(geoJson)
    }
    
    // 触发回调，但保持绘制模式继续
    this.drawingCallbacks.onDrawEnd?.(line, this.currentDrawingMode)
    
    // 清理当前绘制的临时数据，准备绘制下一条线
    this.clearTempDrawingLayers()
    this.drawingPoints = []
    
    console.log('📏 线条绘制完成，继续绘制模式')
  }

  /**
   * 添加多边形点
   */
  private addPolygonPoint(latlng: L.LatLng): void {
    this.drawingPoints.push(latlng)
    
    // 添加点标记
    const marker = L.circleMarker(latlng, {
      radius: 4,
      color: '#0000ff',
      fillColor: '#0000ff',
      fillOpacity: 0.8
    })
    marker.addTo(this.map!)
    this.tempDrawingLayers.push(marker)
  }

  /**
   * 更新多边形预览
   */
  private updatePolygonPreview(latlng: L.LatLng): void {
    if (this.drawingPoints.length === 0) return

    // 移除之前的预览
    this.clearPreviewLayers()

    if (this.drawingPoints.length >= 2) {
      // 创建预览多边形
      const previewPoints = [...this.drawingPoints, latlng]
      const previewPolygon = L.polygon(previewPoints, {
        color: '#0000ff',
        weight: 2,
        opacity: 0.6,
        fillColor: '#0000ff',
        fillOpacity: 0.1,
        dashArray: '5, 5'
      })
      previewPolygon.addTo(this.map!)
      this.tempDrawingLayers.push(previewPolygon)
    } else {
      // 只有一个点时，显示预览线
      const previewLine = L.polyline([this.drawingPoints[0], latlng], {
        color: '#0000ff',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 5'
      })
      previewLine.addTo(this.map!)
      this.tempDrawingLayers.push(previewLine)
    }
  }

  /**
   * 完成多边形绘制
   */
  private finishDrawingPolygon(): void {
    if (this.drawingPoints.length < 3) {
      console.warn('多边形至少需要3个点')
      return
    }

    const drawingId = this.generateDrawingId()
    const polygon = L.polygon(this.drawingPoints, {
      color: '#3388ff',
      weight: 3,
      opacity: 1,
      fillColor: '#3388ff',
      fillOpacity: 0.2
    })

    // 为图层添加ID属性
    ;(polygon as any).drawingId = drawingId

    polygon.addTo(this.drawingItems)
    
    // 生成并打印GeoJSON数据
    const geoJson = this.layerToGeoJSON(polygon, 'polygon', drawingId)
    if (geoJson) {
      this.printGeoJSON(geoJson)
    }
    
    // 触发回调，但保持绘制模式继续
    this.drawingCallbacks.onDrawEnd?.(polygon, this.currentDrawingMode)
    
    // 清理当前绘制的临时数据，准备绘制下一个多边形
    this.clearTempDrawingLayers()
    this.drawingPoints = []
    
    console.log('🔷 多边形绘制完成，继续绘制模式')
  }

  /**
   * 处理矩形点击
   */
  private handleRectangleClick(latlng: L.LatLng): void {
    if (this.drawingPoints.length === 0) {
      // 第一次点击：设置起始点
      this.drawingPoints.push(latlng)
      
      // 添加起始点标记
      const marker = L.circleMarker(latlng, {
        radius: 4,
        color: '#00ff00',
        fillColor: '#00ff00',
        fillOpacity: 0.8
      })
      marker.addTo(this.map!)
      this.tempDrawingLayers.push(marker)
    } else {
      // 第二次点击：完成矩形
      this.finishDrawingRectangle(latlng)
    }
  }

  /**
   * 更新矩形预览
   */
  private updateRectanglePreview(latlng: L.LatLng): void {
    if (this.drawingPoints.length === 0) return

    // 移除之前的预览
    this.clearPreviewLayers()

    const startPoint = this.drawingPoints[0]
    const bounds = L.latLngBounds([startPoint, latlng])
    
    const previewRectangle = L.rectangle(bounds, {
      color: '#00ff00',
      weight: 2,
      opacity: 0.6,
      fillColor: '#00ff00',
      fillOpacity: 0.1,
      dashArray: '5, 5'
    })
    previewRectangle.addTo(this.map!)
    this.tempDrawingLayers.push(previewRectangle)
  }

  /**
   * 完成矩形绘制
   */
  private finishDrawingRectangle(latlng: L.LatLng): void {
    const startPoint = this.drawingPoints[0]
    const bounds = L.latLngBounds([startPoint, latlng])
    
    const drawingId = this.generateDrawingId()
    const rectangle = L.rectangle(bounds, {
      color: '#3388ff',
      weight: 3,
      opacity: 1,
      fillColor: '#3388ff',
      fillOpacity: 0.2
    })

    // 为图层添加ID属性
    ;(rectangle as any).drawingId = drawingId

    rectangle.addTo(this.drawingItems)
    
    // 生成并打印GeoJSON数据
    const geoJson = this.layerToGeoJSON(rectangle, 'rectangle', drawingId)
    if (geoJson) {
      this.printGeoJSON(geoJson)
    }
    
    // 触发回调，但保持绘制模式继续
    this.drawingCallbacks.onDrawEnd?.(rectangle, this.currentDrawingMode)
    
    // 清理当前绘制的临时数据，准备绘制下一个矩形
    this.clearTempDrawingLayers()
    this.drawingPoints = []
    
    console.log('⬜ 矩形绘制完成，继续绘制模式')
  }

  /**
   * 处理圆形点击
   */
  private handleCircleClick(latlng: L.LatLng): void {
    if (this.drawingPoints.length === 0) {
      // 第一次点击：设置圆心
      this.drawingPoints.push(latlng)
      
      // 添加圆心标记
      const marker = L.circleMarker(latlng, {
        radius: 4,
        color: '#ff00ff',
        fillColor: '#ff00ff',
        fillOpacity: 0.8
      })
      marker.addTo(this.map!)
      this.tempDrawingLayers.push(marker)
    } else {
      // 第二次点击：完成圆形
      this.finishDrawingCircle(latlng)
    }
  }

  /**
   * 更新圆形预览
   */
  private updateCirclePreview(latlng: L.LatLng): void {
    if (this.drawingPoints.length === 0) return

    // 移除之前的预览
    this.clearPreviewLayers()

    const center = this.drawingPoints[0]
    const radius = center.distanceTo(latlng)
    
    const previewCircle = L.circle(center, {
      radius: radius,
      color: '#ff00ff',
      weight: 2,
      opacity: 0.6,
      fillColor: '#ff00ff',
      fillOpacity: 0.1,
      dashArray: '5, 5'
    })
    previewCircle.addTo(this.map!)
    this.tempDrawingLayers.push(previewCircle)
  }

  /**
   * 完成圆形绘制
   */
  private finishDrawingCircle(latlng: L.LatLng): void {
    const center = this.drawingPoints[0]
    const radius = center.distanceTo(latlng)
    
    const drawingId = this.generateDrawingId()
    const circle = L.circle(center, {
      radius: radius,
      color: '#3388ff',
      weight: 3,
      opacity: 1,
      fillColor: '#3388ff',
      fillOpacity: 0.2
    })

    // 为图层添加ID属性
    ;(circle as any).drawingId = drawingId

    circle.addTo(this.drawingItems)
    
    // 生成并打印GeoJSON数据
    const geoJson = this.layerToGeoJSON(circle, 'circle', drawingId)
    if (geoJson) {
      this.printGeoJSON(geoJson)
    }
    
    // 触发回调，但保持绘制模式继续
    this.drawingCallbacks.onDrawEnd?.(circle, this.currentDrawingMode)
    
    // 清理当前绘制的临时数据，准备绘制下一个圆形
    this.clearTempDrawingLayers()
    this.drawingPoints = []
    
    console.log('⭕ 圆形绘制完成，继续绘制模式')
  }

  /**
   * 清理临时绘制图层
   */
  private clearTempDrawingLayers(): void {
    this.tempDrawingLayers.forEach(layer => {
      if (this.map) {
        this.map.removeLayer(layer)
      }
    })
    this.tempDrawingLayers = []
  }

  /**
   * 清理预览图层（保留点标记）
   */
  private clearPreviewLayers(): void {
    // 只移除预览图层，保留点标记
    const previewLayers = this.tempDrawingLayers.filter(layer => 
      layer instanceof L.Polyline || 
      layer instanceof L.Polygon || 
      layer instanceof L.Rectangle || 
      layer instanceof L.Circle
    )
    
    previewLayers.forEach(layer => {
      if (this.map) {
        this.map.removeLayer(layer)
      }
      const index = this.tempDrawingLayers.indexOf(layer)
      if (index > -1) {
        this.tempDrawingLayers.splice(index, 1)
      }
    })
  }

  // ==================== 测距和测面方法 ====================

  /**
   * 添加测量点
   */
  private addMeasurePoint(latlng: L.LatLng): void {
    this.drawingPoints.push(latlng)
    
    // 添加点标记
    const marker = L.circleMarker(latlng, {
      radius: 4,
      color: '#ff6600',
      fillColor: '#ff6600',
      fillOpacity: 0.8
    })
    marker.addTo(this.map!)
    this.tempDrawingLayers.push(marker)
  }

  /**
   * 更新测量预览
   */
  private updateMeasurePreview(latlng: L.LatLng): void {
    if (this.drawingPoints.length === 0) return

    // 移除之前的预览
    this.clearPreviewLayers()

    if (this.currentDrawingMode === DrawingMode.MEASURE_DISTANCE) {
      // 测距预览 - 显示线条和距离标签
      const previewPoints = [...this.drawingPoints, latlng]
      const previewLine = L.polyline(previewPoints, {
        color: '#ff6600',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 5'
      })
      previewLine.addTo(this.map!)
      this.tempDrawingLayers.push(previewLine)

      // 显示实时距离
      const totalDistance = this.calculateTotalDistance([...this.drawingPoints, latlng])
      this.showMeasureTooltip(latlng, `距离: ${totalDistance}`)
    } else if (this.currentDrawingMode === DrawingMode.MEASURE_AREA) {
      // 测面预览
      if (this.drawingPoints.length >= 2) {
        const previewPoints = [...this.drawingPoints, latlng]
        const previewPolygon = L.polygon(previewPoints, {
          color: '#ff6600',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        })
        previewPolygon.addTo(this.map!)
        this.tempDrawingLayers.push(previewPolygon)

        // 显示实时面积
        const area = this.calculatePolygonArea([...this.drawingPoints, latlng])
        this.showMeasureTooltip(latlng, `面积: ${area}`)
      } else {
        // 只有一个点时，显示预览线
        const previewLine = L.polyline([this.drawingPoints[0], latlng], {
          color: '#ff6600',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5'
        })
        previewLine.addTo(this.map!)
        this.tempDrawingLayers.push(previewLine)
      }
    }
  }

  /**
   * 完成测距
   */
  private finishMeasureDistance(): void {
    if (this.drawingPoints.length < 2) {
      console.warn('测距至少需要2个点')
      return
    }

    const drawingId = this.generateDrawingId()
    const line = L.polyline(this.drawingPoints, {
      color: '#ff6600',
      weight: 3,
      opacity: 1
    })

    // 为图层添加ID属性
    ;(line as any).drawingId = drawingId

    // 计算总距离
    const totalDistance = this.calculateTotalDistance(this.drawingPoints)
    
    // 添加距离标签到线条中点
    const midPoint = this.getLineMiddlePoint(this.drawingPoints)
    const distanceLabel = L.marker(midPoint, {
      icon: L.divIcon({
        className: 'measure-label',
        html: `<div style="color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; font-weight: bold;">${totalDistance}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      })
    })

    line.addTo(this.drawingItems)
    distanceLabel.addTo(this.drawingItems)

    // 生成并打印GeoJSON数据
    const geoJson = this.layerToGeoJSON(line, 'measure-distance', drawingId)
    if (geoJson) {
      this.printGeoJSON(geoJson)
    }

    // 触发回调，但保持测距模式继续
    this.drawingCallbacks.onDrawEnd?.(line, this.currentDrawingMode)
    
    // 清理当前测量的临时数据，准备下一次测量
    this.clearTempDrawingLayers()
    this.drawingPoints = []
    
    console.log(`📏 测距完成: ${totalDistance}，继续测距模式`)
  }

  /**
   * 完成测面
   */
  private finishMeasureArea(): void {
    if (this.drawingPoints.length < 3) {
      console.warn('测面至少需要3个点')
      return
    }

    const drawingId = this.generateDrawingId()
    const polygon = L.polygon(this.drawingPoints, {
      color: '#ff6600',
      weight: 3,
      opacity: 1,
      fillColor: '#ff6600',
      fillOpacity: 0.3
    })

    // 为图层添加ID属性
    ;(polygon as any).drawingId = drawingId

    // 计算面积
    const area = this.calculatePolygonArea(this.drawingPoints)
    
    // 添加面积标签到多边形中心
    const centroid = this.getPolygonCentroid(this.drawingPoints)
    const areaLabel = L.marker(centroid, {
      icon: L.divIcon({
        className: 'measure-label',
        html: `<div style="color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; font-weight: bold;">${area}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      })
    })

    polygon.addTo(this.drawingItems)
    areaLabel.addTo(this.drawingItems)

    // 生成并打印GeoJSON数据
    const geoJson = this.layerToGeoJSON(polygon, 'measure-area', drawingId)
    if (geoJson) {
      this.printGeoJSON(geoJson)
    }

    // 触发回调，但保持测面模式继续
    this.drawingCallbacks.onDrawEnd?.(polygon, this.currentDrawingMode)
    
    // 清理当前测量的临时数据，准备下一次测量
    this.clearTempDrawingLayers()
    this.drawingPoints = []
    
    console.log(`📐 测面完成: ${area}，继续测面模式`)
  }

  /**
   * 显示测量工具提示
   */
  private showMeasureTooltip(latlng: L.LatLng, text: string): void {
    // 移除之前的工具提示
    this.tempDrawingLayers.forEach(layer => {
      if (layer instanceof L.Marker && layer.options.icon && (layer.options.icon as any).options?.className === 'measure-tooltip') {
        this.map?.removeLayer(layer)
        const index = this.tempDrawingLayers.indexOf(layer)
        if (index > -1) {
          this.tempDrawingLayers.splice(index, 1)
        }
      }
    })

    const tooltip = L.marker(latlng, {
      icon: L.divIcon({
        className: 'measure-tooltip',
        html: `<div style="background: rgba(0,0,0,0.8); color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap;">${text}</div>`,
        iconSize: [0, 0],
        iconAnchor: [10, 10]
      })
    })
    
    tooltip.addTo(this.map!)
    this.tempDrawingLayers.push(tooltip)
  }

  /**
   * 计算线条总距离
   */
  private calculateTotalDistance(points: L.LatLng[]): string {
    if (points.length < 2) return '0 米'
    
    let totalDistance = 0
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += points[i].distanceTo(points[i + 1])
    }
    
    if (totalDistance >= 1000) {
      return `${(totalDistance / 1000).toFixed(2)} 公里`
    } else {
      return `${totalDistance.toFixed(2)} 米`
    }
  }

  /**
   * 计算多边形面积
   */
  private calculatePolygonArea(points: L.LatLng[]): string {
    if (points.length < 3) return '0 平方米'
    
    // 使用鞋带公式计算多边形面积（近似）
    let area = 0
    const n = points.length
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const lat1 = points[i].lat * Math.PI / 180
      const lng1 = points[i].lng * Math.PI / 180
      const lat2 = points[j].lat * Math.PI / 180
      const lng2 = points[j].lng * Math.PI / 180
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }
    
    area = Math.abs(area) * 6378137 * 6378137 / 2 // 地球半径的平方
    
    if (area >= 1000000) {
      return `${(area / 1000000).toFixed(2)} 平方公里`
    } else if (area >= 10000) {
      return `${(area / 10000).toFixed(2)} 公顷`
    } else {
      return `${area.toFixed(2)} 平方米`
    }
  }

  /**
   * 获取线条中点
   */
  private getLineMiddlePoint(points: L.LatLng[]): L.LatLng {
    if (points.length === 0) return new L.LatLng(0, 0)
    if (points.length === 1) return points[0]
    
    const midIndex = Math.floor(points.length / 2)
    return points[midIndex]
  }

  /**
   * 获取多边形重心
   */
  private getPolygonCentroid(points: L.LatLng[]): L.LatLng {
    if (points.length === 0) return new L.LatLng(0, 0)
    
    let lat = 0, lng = 0
    points.forEach(point => {
      lat += point.lat
      lng += point.lng
    })
    
    return new L.LatLng(lat / points.length, lng / points.length)
  }

  /**
   * 生成下一个图形ID
   */
  private generateDrawingId(): string {
    this.drawingCounter++
    return `drawing_${this.drawingCounter}_${Date.now()}`
  }

  /**
   * 将Leaflet图层转换为GeoJSON数据
   */
  private layerToGeoJSON(layer: L.Layer, drawingType: string, drawingId: string): any {
    let geoJson: any = null
    
    if (layer instanceof L.Marker) {
      const latlng = layer.getLatLng()
      geoJson = {
        type: 'Feature',
        id: drawingId,
        properties: {
          type: 'point',
          drawingType: drawingType,
          createdAt: new Date().toISOString()
        },
        geometry: {
          type: 'Point',
          coordinates: [latlng.lng, latlng.lat]
        }
      }
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
      const latlngs = layer.getLatLngs() as L.LatLng[]
      geoJson = {
        type: 'Feature',
        id: drawingId,
        properties: {
          type: 'line',
          drawingType: drawingType,
          createdAt: new Date().toISOString(),
          length: this.calculateTotalDistance(latlngs)
        },
        geometry: {
          type: 'LineString',
          coordinates: latlngs.map(latlng => [latlng.lng, latlng.lat])
        }
      }
    } else if (layer instanceof L.Polygon) {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[]
      geoJson = {
        type: 'Feature',
        id: drawingId,
        properties: {
          type: 'polygon',
          drawingType: drawingType,
          createdAt: new Date().toISOString(),
          area: this.calculatePolygonArea(latlngs)
        },
        geometry: {
          type: 'Polygon',
          coordinates: [latlngs.map(latlng => [latlng.lng, latlng.lat])]
        }
      }
    } else if (layer instanceof L.Rectangle) {
      const bounds = layer.getBounds()
      const coordinates = [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()],
        [bounds.getWest(), bounds.getNorth()],
        [bounds.getWest(), bounds.getSouth()]
      ]
      geoJson = {
        type: 'Feature',
        id: drawingId,
        properties: {
          type: 'rectangle',
          drawingType: drawingType,
          createdAt: new Date().toISOString()
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      }
    } else if (layer instanceof L.Circle) {
      const center = layer.getLatLng()
      const radius = layer.getRadius()
      geoJson = {
        type: 'Feature',
        id: drawingId,
        properties: {
          type: 'circle',
          drawingType: drawingType,
          createdAt: new Date().toISOString(),
          radius: radius,
          area: `${(Math.PI * radius * radius / 10000).toFixed(2)} 公顷`
        },
        geometry: {
          type: 'Point',
          coordinates: [center.lng, center.lat]
        }
      }
    }
    
    return geoJson
  }

  /**
   * 打印GeoJSON数据到控制台
   */
  private printGeoJSON(geoJson: any): void {
    console.group('🎨 绘制图形完成 - GeoJSON数据:')
    console.log('图形ID:', geoJson.id)
    console.log('图形类型:', geoJson.properties.type)
    console.log('绘制模式:', geoJson.properties.drawingType)
    console.log('创建时间:', geoJson.properties.createdAt)
    if (geoJson.properties.length) {
      console.log('长度:', geoJson.properties.length)
    }
    if (geoJson.properties.area) {
      console.log('面积:', geoJson.properties.area)
    }
    if (geoJson.properties.radius) {
      console.log('半径:', geoJson.properties.radius, '米')
    }
    console.log('完整GeoJSON:', JSON.stringify(geoJson, null, 2))
    console.groupEnd()
  }

  /**
   * 导出所有绘制图形的数据
   */
  public exportDrawings(): any[] {
    const drawingsData: any[] = []
    
    this.drawingItems.eachLayer((layer) => {
      const drawingId = (layer as any).drawingId || this.generateDrawingId()
      let drawingType = 'unknown'
      
      // 根据图层类型确定绘制类型
      if (layer instanceof L.Marker) {
        drawingType = 'point'
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        drawingType = 'line'
      } else if (layer instanceof L.Polygon) {
        drawingType = 'polygon'
      } else if (layer instanceof L.Rectangle) {
        drawingType = 'rectangle'
      } else if (layer instanceof L.Circle) {
        drawingType = 'circle'
      }
      
      const geoJson = this.layerToGeoJSON(layer, drawingType, drawingId)
      if (geoJson) {
        drawingsData.push(geoJson)
      }
    })
    
    console.log('导出绘制图形数据:', drawingsData.length, '个')
    return drawingsData
  }

  /**
   * 导入绘制图形数据
   */
  public importDrawings(drawingsData: any[]): void {
    if (!this.map) {
      console.warn('地图未初始化，无法导入绘制图形')
      return
    }

    console.log('开始导入绘制图形:', drawingsData.length, '个')
    
    drawingsData.forEach((geoJson, index) => {
      try {
        let layer: L.Layer | null = null
        
        switch (geoJson.properties.type) {
          case 'point':
            const coords = geoJson.geometry.coordinates
            layer = L.marker([coords[1], coords[0]], {
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
            break
            
          case 'line':
            const lineCoords = geoJson.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]])
            const color = geoJson.properties.drawingType === 'measure-distance' ? '#ff6600' : '#3388ff'
            layer = L.polyline(lineCoords, {
              color: color,
              weight: 3,
              opacity: 1
            })
            break
            
          case 'polygon':
            const polygonCoords = geoJson.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]])
            const polygonColor = geoJson.properties.drawingType === 'measure-area' ? '#ff6600' : '#3388ff'
            layer = L.polygon(polygonCoords, {
              color: polygonColor,
              weight: 3,
              opacity: 1,
              fillColor: polygonColor,
              fillOpacity: geoJson.properties.drawingType === 'measure-area' ? 0.3 : 0.2
            })
            break
            
          case 'rectangle':
            const rectCoords = geoJson.geometry.coordinates[0]
            const bounds = L.latLngBounds([
              [rectCoords[0][1], rectCoords[0][0]], // 西南角
              [rectCoords[2][1], rectCoords[2][0]]  // 东北角
            ])
            layer = L.rectangle(bounds, {
              color: '#3388ff',
              weight: 3,
              opacity: 1,
              fillColor: '#3388ff',
              fillOpacity: 0.2
            })
            break
            
          case 'circle':
            const centerCoords = geoJson.geometry.coordinates
            const radius = geoJson.properties.radius
            layer = L.circle([centerCoords[1], centerCoords[0]], {
              radius: radius,
              color: '#3388ff',
              weight: 3,
              opacity: 1,
              fillColor: '#3388ff',
              fillOpacity: 0.2
            })
            break
        }
        
        if (layer) {
          // 恢复图层ID
          ;(layer as any).drawingId = geoJson.id
          layer.addTo(this.drawingItems)
          
          // 如果是测量图形，添加标签
          if (geoJson.properties.drawingType === 'measure-distance' && geoJson.properties.length) {
            const lineCoords = geoJson.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]])
            const midPoint = this.getLineMiddlePoint(lineCoords.map((coord: number[]) => L.latLng(coord[0], coord[1])))
            const distanceLabel = L.marker(midPoint, {
              icon: L.divIcon({
                className: 'measure-label',
                html: `<div style="color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; font-weight: bold;">📏 ${geoJson.properties.length}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
              })
            })
            distanceLabel.addTo(this.drawingItems)
          } else if (geoJson.properties.drawingType === 'measure-area' && geoJson.properties.area) {
            const polygonCoords = geoJson.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]])
            const centroid = this.getPolygonCentroid(polygonCoords.map((coord: number[]) => L.latLng(coord[0], coord[1])))
            const areaLabel = L.marker(centroid, {
              icon: L.divIcon({
                className: 'measure-label',
                html: `<div style="background: rgba(255,102,0,0.9); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; font-weight: bold;">📐 ${geoJson.properties.area}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
              })
            })
            areaLabel.addTo(this.drawingItems)
          }
          
          console.log(`✅ 导入图形 ${index + 1}/${drawingsData.length}: ${geoJson.properties.type}`)
        }
      } catch (error) {
        console.error(`❌ 导入图形 ${index + 1} 失败:`, error, geoJson)
      }
    })
    
    console.log('绘制图形导入完成')
  }

  // ==================== 热力图功能 ====================

  /**
   * 添加热力图图层
   * @param id 热力图ID
   * @param data 热力图数据 [[lat, lng, intensity], ...]
   * @param options 热力图选项
   */
  public addHeatmapLayer(id: string, data: number[][], options: any = {}): any {
    if (!this.map) {
      console.warn('地图未初始化')
      return null
    }

    // 移除已存在的同ID热力图
    this.removeHeatmapLayer(id)

    // 默认热力图选项
    const defaultOptions = {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.4,
      ...options
    }

    // 创建热力图图层
    const heatLayer = (L as any).heatLayer(data, defaultOptions)
    heatLayer.addTo(this.map)
    
    // 存储热力图图层
    this.heatmapLayers.set(id, heatLayer)
    
    console.log(`✅ 热力图 ${id} 添加成功，数据点数: ${data.length}`)
    return heatLayer
  }

  /**
   * 移除热力图图层
   * @param id 热力图ID
   */
  public removeHeatmapLayer(id: string): void {
    const heatLayer = this.heatmapLayers.get(id)
    if (heatLayer && this.map) {
      this.map.removeLayer(heatLayer)
      this.heatmapLayers.delete(id)
      console.log(`🗑️ 热力图 ${id} 已移除`)
    }
  }

  /**
   * 清除所有热力图图层
   */
  public clearAllHeatmaps(): void {
    this.heatmapLayers.forEach((heatLayer, id) => {
      if (this.map) {
        this.map.removeLayer(heatLayer)
      }
    })
    this.heatmapLayers.clear()
    console.log('🗑️ 所有热力图已清除')
  }

  /**
   * 更新热力图数据
   * @param id 热力图ID
   * @param data 新的热力图数据
   */
  public updateHeatmapData(id: string, data: number[][]): void {
    const heatLayer = this.heatmapLayers.get(id)
    if (heatLayer) {
      heatLayer.setLatLngs(data)
      console.log(`🔄 热力图 ${id} 数据已更新，数据点数: ${data.length}`)
    }
  }

  /**
   * 获取热力图图层
   * @param id 热力图ID
   */
  public getHeatmapLayer(id: string): any {
    return this.heatmapLayers.get(id)
  }
}

// 创建地图服务单例
export const mapService = new MapService()

// 导出 Leaflet 相关类型供外部使用
export type { LatLng, LatLngBounds, Map, Marker, TileLayer, Icon, Circle, Polygon, Polyline } from 'leaflet'
export { L }
