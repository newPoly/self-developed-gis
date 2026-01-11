declare module 'leaflet.heat' {
  import * as L from 'leaflet'

  interface HeatLatLngTuple extends Array<number> {
    0: number // latitude
    1: number // longitude
    2?: number // intensity
  }

  interface HeatMapOptions {
    minOpacity?: number
    maxZoom?: number
    max?: number
    radius?: number
    blur?: number
    gradient?: { [key: number]: string }
  }

  declare module 'leaflet' {
    function heatLayer(
      latlngs: HeatLatLngTuple[],
      options?: HeatMapOptions
    ): L.Layer

    namespace L {
      function heatLayer(
        latlngs: HeatLatLngTuple[],
        options?: HeatMapOptions
      ): L.Layer
    }
  }
}