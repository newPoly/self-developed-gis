/**
 * @Description: 地图配置加载工具
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2025-09-13
 * @Copyright: All rights reserved.
 */

// 地图配置接口
export interface TileLayerConfig {
  name: string
  url: string
  attribution: string
  maxZoom: number
  subdomains?: string[]
  visible: boolean
  // WMS 特有属性
  type?: string
  layers?: string
  format?: string
  transparent?: boolean
  version?: string
}

export interface IconConfig {
  iconUrl: string
  iconRetinaUrl: string
  shadowUrl: string
  iconSize: [number, number]
  iconAnchor: [number, number]
  popupAnchor: [number, number]
  shadowSize: [number, number]
}

export interface MapConfigData {
  defaultCenter: [number, number]
  defaultZoom: number
  minZoom: number
  maxZoom: number
  tileLayers: Record<string, TileLayerConfig>
  icons: Record<string, IconConfig>
}

// 天地图 API Key
const TIANDITU_KEY = '17763402f97aa5d363379927f5ce70a6'

let mapConfig: MapConfigData | null = null

/**
 * 加载地图配置
 */
export async function loadMapConfig(): Promise<MapConfigData> {
  if (mapConfig) {
    return mapConfig
  }

  const response = await fetch('/map-config.json')
  
  if (!response.ok) {
    throw new Error(`地图配置文件加载失败: ${response.status} ${response.statusText}`)
  }
  
  const config = await response.json() as MapConfigData
  
  // 处理天地图 URL 中的 key 占位符
  Object.values(config.tileLayers).forEach(layer => {
    if (layer.url.includes('{tianditu_key}')) {
      layer.url = layer.url.replace('{tianditu_key}', TIANDITU_KEY)
    }
  })
  
  mapConfig = config
  console.log('✅ 地图配置加载完成，图层数量:', Object.keys(config.tileLayers).length)
  
  return mapConfig
}

/**
 * 获取当前配置
 */
export function getMapConfig(): MapConfigData {
  if (!mapConfig) {
    throw new Error('地图配置未加载，请先调用 loadMapConfig()')
  }
  return mapConfig
}

/**
 * 获取瓦片图层配置
 * @param layerId 图层ID
 */
export function getTileLayerConfig(layerId: string): TileLayerConfig | null {
  const currentConfig = getMapConfig()
  const config = currentConfig.tileLayers[layerId]
  if (!config) return null
  
  // 处理天地图 key 替换
  if (config.url.includes('{tianditu_key}')) {
    return {
      ...config,
      url: config.url.replace('{tianditu_key}', TIANDITU_KEY)
    }
  }
  
  return config
}

/**
 * 获取默认可见的瓦片图层配置
 */
export function getDefaultTileLayerConfig(): TileLayerConfig {
  const currentConfig = getMapConfig()
  
  // 查找 visible 为 true 的图层
  const visibleLayer = Object.entries(currentConfig.tileLayers).find(([_, config]) => config.visible)
  
  let layerConfig: TileLayerConfig
  if (visibleLayer) {
    layerConfig = visibleLayer[1]
  } else {
    // 如果没有可见图层，返回第一个图层
    const firstLayerId = Object.keys(currentConfig.tileLayers)[0]
    layerConfig = currentConfig.tileLayers[firstLayerId]
  }
  
  // 处理天地图 key 替换
  if (layerConfig.url.includes('{tianditu_key}')) {
    return {
      ...layerConfig,
      url: layerConfig.url.replace('{tianditu_key}', TIANDITU_KEY)
    }
  }
  
  return layerConfig
}



/**
 * 获取图标配置
 * @param iconId 图标ID
 */
export function getIconConfig(iconId: string = 'default'): IconConfig {
  const currentConfig = getMapConfig()
  return currentConfig.icons[iconId] || currentConfig.icons.default
}

