/**
 * @Description: 百度地图工具类 - 支持百度地图坐标系统和投影
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2025-09-13
 * @Copyright: All rights reserved.
 */

import L from 'leaflet'
import proj4 from 'proj4'
// @ts-ignore - proj4leaflet 没有官方类型定义
import 'proj4leaflet'

// 扩展 Leaflet 的类型定义
declare module 'leaflet' {
  namespace Proj {
    interface CRS extends L.CRS {}
    interface CRSConstructor {
      new (code: string, proj4def: string, options?: any): CRS
    }
    const CRS: CRSConstructor
  }
  
  interface CRSStatic {
    Baidu?: L.CRS
  }
}

/**
 * 初始化全局百度地图CRS（与用户示例代码一致）
 */
export function initGlobalBaiduCRS(): void {
  // 检查是否已经初始化
  if ((L.CRS as any).Baidu) {
    return
  }

  // 检查 proj4 和 L.Proj 是否可用
  if (!proj4 || !(L as any).Proj) {
    console.error('proj4 或 proj4leaflet 库未正确加载，无法初始化百度CRS')
    return
  }

  try {
    // 与用户示例代码完全一致的实现
    const level = 19
    const resolutions = function() {
      const res: number[] = []
      res[0] = Math.pow(2, 18)
      for (let i = 1; i < level; i++) {
        res[i] = Math.pow(2, (18 - i))
      }
      return res
    }()

    // 创建百度地图CRS
    ;(L.CRS as any).Baidu = new (L as any).Proj.CRS('EPSG:900913', 
      '+proj=merc +a=6378206 +b=6356584.314245179 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs', 
      {
        resolutions: resolutions,
        origin: [0, 0],
        bounds: L.bounds([20037508.342789244, 0], [0, 20037508.342789244])
      }
    )

    console.log('全局百度地图CRS初始化成功')
  } catch (error) {
    console.error('全局百度地图CRS初始化失败:', error)
  }
}

/**
 * 百度地图投影配置
 */
export class BaiduMapProjection {
  private static instance: BaiduMapProjection
  private crs: L.CRS | null = null

  private constructor() {}

  public static getInstance(): BaiduMapProjection {
    if (!BaiduMapProjection.instance) {
      BaiduMapProjection.instance = new BaiduMapProjection()
    }
    return BaiduMapProjection.instance
  }

  /**
   * 初始化百度地图投影
   */
  public initBaiduCRS(): L.CRS {
    if (this.crs) {
      return this.crs
    }

    // 检查 proj4 和 L.Proj 是否可用
    if (!proj4 || !(L as any).Proj) {
      throw new Error('proj4 或 proj4leaflet 库未正确加载')
    }

    // 百度地图投影参数 - 与你的示例代码一致
    const baiduProjection = '+proj=merc +a=6378206 +b=6356584.314245179 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs'
    
    // 创建百度地图的分辨率数组
    const resolutions = this.generateResolutions()
    
    // 创建百度地图 CRS - 使用与示例代码一致的边界配置
    const crs = new (L as any).Proj.CRS('EPSG:900913', baiduProjection, {
      resolutions: resolutions,
      origin: [0, 0],
      // 与用户示例代码一致的边界配置
      bounds: L.bounds([20037508.342789244, 0], [0, 20037508.342789244])
    })

    this.crs = crs as L.CRS
    console.log('百度地图投影系统初始化完成')
    return this.crs
  }

  /**
   * 生成百度地图分辨率数组
   * 使用与示例代码一致的分辨率计算方式
   */
  private generateResolutions(): number[] {
    const level = 19
    const resolutions: number[] = []
    // 与用户示例代码一致的分辨率计算方式
    resolutions[0] = Math.pow(2, 18)
    for (let i = 1; i < level; i++) {
      resolutions[i] = Math.pow(2, (18 - i))
    }
    console.log('百度地图分辨率数组:', {
      总级别: resolutions.length,
      前5级: resolutions.slice(0, 5),
      后5级: resolutions.slice(-5)
    })
    return resolutions
  }

  /**
   * 获取百度地图 CRS
   */
  public getBaiduCRS(): L.CRS | null {
    return this.crs
  }
}

/**
 * 百度地图瓦片图层配置
 */
export interface BaiduTileLayerOptions extends L.TileLayerOptions {
  tms?: boolean
}

/**
 * 创建百度地图瓦片图层
 */
export class BaiduTileLayer extends L.TileLayer {
  private _firstTileChecked: boolean = false

  constructor(urlTemplate: string, options?: BaiduTileLayerOptions) {
    const defaultOptions: BaiduTileLayerOptions = {
      maxZoom: 19,         // 百度地图支持到19级
      minZoom: 3,          // 百度地图最小级别调整为3
      subdomains: ['0', '1', '2'],
      tms: false,
      attribution: '© 百度地图',
      crossOrigin: false,
      opacity: 1.0,
      zIndex: 1,
      // 优化瓦片加载性能
      keepBuffer: 2,
      updateWhenIdle: true,
      updateWhenZooming: false,
      ...options
    }

    super(urlTemplate, defaultOptions)
    
    // 只监听关键错误，提升性能
    this.on('tileerror', (e: any) => {
      console.warn('百度瓦片加载失败:', e.coords?.z, e.coords?.x, e.coords?.y)
    })
  }

  /**
   * 重写瓦片 URL 生成方法以适配百度地图
   */
  getTileUrl(coords: L.Coords): string {
    const data = {
      r: L.Browser.retina ? '@2x' : '',
      s: (this as any)._getSubdomain(coords),
      x: coords.x,
      y: coords.y,
      z: coords.z
    }

    // 百度地图使用TMS坐标系统，需要Y轴翻转
    const numTiles = Math.pow(2, coords.z)
    data.y = numTiles - coords.y - 1
    
    // 调试信息：随机输出部分瓦片坐标转换
    if (Math.random() < 0.01) { // 1%概率输出，避免日志过多
      console.log(`百度瓦片坐标 (z=${coords.z}):`, {
        原始: { x: coords.x, y: coords.y },
        转换后: { x: data.x, y: data.y },
        总瓦片数: numTiles
      })
    }
    
    const url = L.Util.template((this as any)._url, L.Util.extend(data, this.options))
    
    // 测试第一个瓦片URL
    if (coords.x === 0 && coords.y === 0 && !this._firstTileChecked) {
      this._firstTileChecked = true
      this.testTileUrl(url, coords)
    }
    
    return url
  }

  /**
   * 测试瓦片URL是否有效
   */
  private testTileUrl(url: string, coords: L.Coords) {
    console.log(`测试百度瓦片URL (${coords.z}/${coords.x}/${coords.y}):`, url)
    
    fetch(url)
      .then(response => {
        const status = response.ok ? '✅' : '❌'
        console.log(`${status} 百度瓦片响应:`, {
          url: url.substring(0, 100) + '...',
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        })
        
        if (!response.ok) {
          console.error('百度瓦片请求失败，可能需要更换URL格式')
        }
      })
      .catch(error => {
        console.error('❌ 百度瓦片请求错误:', error)
      })
  }

}

/**
 * 百度地图图层工厂函数（基于用户示例代码）
 */
export interface BaiduLayerOptions {
  layer?: 'vec' | 'img_d' | 'img_z' | 'custom' | 'time' | 'img'
  name?: string
  bigfont?: boolean
  customid?: string
}

export function createBaiduTileLayer(options: BaiduLayerOptions = {}): L.TileLayer | L.LayerGroup {
  const subdomains = '0123456789'
  let layer: L.TileLayer | L.LayerGroup

  switch (options.layer) {
    case "vec":
    default:
      // 百度电子地图
      layer = L.tileLayer('http://online{s}.map.bdimg.com/onlinelabel/?qt=tile&x={x}&y={y}&z={z}&styles=' + (options.bigfont ? 'ph' : 'pl') + '&scaler=1&p=1', {
        attribution: options.name || '© 百度地图',
        subdomains: subdomains,
        tms: true
      })
      break

    case "img_d":
      // 百度影像底图
      layer = L.tileLayer('http://shangetu{s}.map.bdimg.com/it/u=x={x};y={y};z={z};v=009;type=sate&fm=46', {
        attribution: options.name || '© 百度地图',
        subdomains: subdomains,
        tms: true
      })
      break

    case "img_z":
      // 百度影像注记
      layer = L.tileLayer('http://online{s}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=' + (options.bigfont ? 'sh' : 'sl') + '&v=020', {
        attribution: options.name || '© 百度地图',
        subdomains: subdomains,
        tms: true
      })
      break

    case "custom":
      // 自定义样式地图
      const customid = options.customid || 'midnight'
      layer = L.tileLayer('http://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid=' + customid, {
        attribution: options.name || '© 百度地图',
        subdomains: "012",
        tms: true
      })
      break

    case "time":
      // 实时路况
      const time = new Date().getTime()
      layer = L.tileLayer('http://its.map.baidu.com:8002/traffic/TrafficTileService?x={x}&y={y}&level={z}&time=' + time + '&label=web2D&v=017', {
        attribution: options.name || '© 百度地图',
        subdomains: subdomains,
        tms: true
      })
      break

    case "img":
      // 影像地图（底图+注记）
      layer = L.layerGroup([
        createBaiduTileLayer({ name: "影像底图", layer: 'img_d', bigfont: options.bigfont }) as L.TileLayer,
        createBaiduTileLayer({ name: "影像注记", layer: 'img_z', bigfont: options.bigfont }) as L.TileLayer
      ])
      break
  }

  return layer
}

/**
 * 百度地图工具类
 */
export class BaiduMapUtils {
  private static projection = BaiduMapProjection.getInstance()

  /**
   * 创建支持百度地图的地图实例（使用全局百度CRS）
   */
  public static createBaiduMap(container: string | HTMLElement, options: L.MapOptions = {}): L.Map {
    try {
      // 初始化全局百度CRS
      initGlobalBaiduCRS()
      
      // 检查百度CRS是否初始化成功
      const baiduCRS = (L.CRS as any).Baidu
      if (!baiduCRS) {
        throw new Error('百度地图CRS初始化失败')
      }
      
      // 使用甘肃省中心坐标
      const center: [number, number] = options.center as [number, number] || [37.5, 102.5]
      
      const mapOptions: L.MapOptions = {
        crs: baiduCRS,
        center: center,
        zoom: options.zoom || 13,
        minZoom: options.minZoom || 3,  // 百度地图最小级别调整为3
        maxZoom: options.maxZoom || 19, // 百度地图最大级别为19
        zoomControl: options.zoomControl !== false,
        attributionControl: options.attributionControl !== false,
        // 性能优化选项
        preferCanvas: false,
        ...options
      }

      const map = L.map(container, mapOptions)
      console.log('百度地图实例创建成功，使用全局百度CRS')
      return map
    } catch (error) {
      console.error('创建百度地图失败:', error)
      throw error
    }
  }

  /**
   * 添加百度电子地图图层（使用优化的工厂函数）
   */
  public static addBaiduVectorLayer(map: L.Map): L.TileLayer {
    const vectorLayer = createBaiduTileLayer({ 
      layer: 'vec', 
      name: '百度电子地图' 
    }) as L.TileLayer
    
    // 优化图层选项以提升性能
    vectorLayer.options.maxZoom = 19
    vectorLayer.options.minZoom = 3
    vectorLayer.options.keepBuffer = 2
    vectorLayer.options.updateWhenIdle = true
    vectorLayer.options.updateWhenZooming = false
    
    vectorLayer.addTo(map)
    console.log('百度电子地图图层添加成功')
    return vectorLayer
  }

  /**
   * 添加百度影像地图图层（使用优化的工厂函数）
   */
  public static addBaiduSatelliteLayer(map: L.Map): L.LayerGroup {
    const satelliteLayer = createBaiduTileLayer({ 
      layer: 'img', 
      name: '百度影像地图' 
    }) as L.LayerGroup
    
    satelliteLayer.addTo(map)
    console.log('百度影像地图图层添加成功')
    return satelliteLayer
  }

  /**
   * 添加百度地图注记图层（用于影像地图）
   */
  public static addBaiduAnnotationLayer(map: L.Map): L.TileLayer {
    const annotationLayer = createBaiduTileLayer({ 
      layer: 'img_z', 
      name: '百度地图注记' 
    }) as L.TileLayer
    
    // 优化注记图层选项
    annotationLayer.options.maxZoom = 19
    annotationLayer.options.minZoom = 1
    annotationLayer.options.pane = 'overlayPane' // 确保注记在影像之上
    
    annotationLayer.addTo(map)
    console.log('百度地图注记图层添加成功')
    return annotationLayer
  }

  /**
   * 坐标转换：WGS84 转 BD09
   */
  public static wgs84ToBd09(lng: number, lat: number): [number, number] {
    // 先将WGS84转换为GCJ02（火星坐标系）
    const [gcjLng, gcjLat] = this.wgs84ToGcj02(lng, lat)
    // 再将GCJ02转换为BD09
    return this.gcj02ToBd09(gcjLng, gcjLat)
  }

  /**
   * 坐标转换：BD09 转 WGS84
   */
  public static bd09ToWgs84(lng: number, lat: number): [number, number] {
    // 先将BD09转换为GCJ02
    const [gcjLng, gcjLat] = this.bd09ToGcj02(lng, lat)
    // 再将GCJ02转换为WGS84
    return this.gcj02ToWgs84(gcjLng, gcjLat)
  }

  /**
   * WGS84 转 GCJ02（火星坐标系）
   */
  private static wgs84ToGcj02(lng: number, lat: number): [number, number] {
    const a = 6378245.0
    const ee = 0.00669342162296594323
    
    let dLat = this.transformLat(lng - 105.0, lat - 35.0)
    let dLng = this.transformLng(lng - 105.0, lat - 35.0)
    
    const radLat = (lat / 180.0) * Math.PI
    let magic = Math.sin(radLat)
    magic = 1 - ee * magic * magic
    const sqrtMagic = Math.sqrt(magic)
    
    dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI)
    dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI)
    
    return [lng + dLng, lat + dLat]
  }

  /**
   * GCJ02 转 WGS84
   */
  private static gcj02ToWgs84(lng: number, lat: number): [number, number] {
    const [gcjLng, gcjLat] = this.wgs84ToGcj02(lng, lat)
    return [lng * 2 - gcjLng, lat * 2 - gcjLat]
  }

  /**
   * GCJ02 转 BD09
   */
  private static gcj02ToBd09(lng: number, lat: number): [number, number] {
    const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * Math.PI * 3000.0 / 180.0)
    const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * Math.PI * 3000.0 / 180.0)
    const bdLng = z * Math.cos(theta) + 0.0065
    const bdLat = z * Math.sin(theta) + 0.006
    return [bdLng, bdLat]
  }

  /**
   * BD09 转 GCJ02
   */
  private static bd09ToGcj02(lng: number, lat: number): [number, number] {
    const x = lng - 0.0065
    const y = lat - 0.006
    const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0)
    const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0)
    const gcjLng = z * Math.cos(theta)
    const gcjLat = z * Math.sin(theta)
    return [gcjLng, gcjLat]
  }

  /**
   * 纬度转换辅助函数
   */
  private static transformLat(lng: number, lat: number): number {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0
    ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0
    ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0
    return ret
  }

  /**
   * 经度转换辅助函数
   */
  private static transformLng(lng: number, lat: number): number {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
    ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0
    ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0
    ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0
    return ret
  }

  /**
   * 检查百度地图支持库是否已加载
   */
  public static checkBaiduMapSupport(): boolean {
    const hasProj4 = !!proj4
    const hasLeafletProj = !!(L as any).Proj
    const isSupported = hasProj4 && hasLeafletProj
    
    console.log('BaiduMapUtils: 支持库检查', {
      hasProj4,
      hasLeafletProj,
      isSupported,
      proj4Version: proj4?.version,
      leafletProjAvailable: typeof (L as any).Proj
    })
    
    return isSupported
  }
}

// 注：类和接口已在定义时导出，无需重复导出
