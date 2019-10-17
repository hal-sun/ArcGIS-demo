import esriLoader from 'esri-loader'
const {loadModules} = esriLoader

// 在你需要使用地图服务的页面定义变量
const options = {
  url: '/static/third/map/ArcGIS/3.14/init.js' //这是你搭建好离线部署后的文件地址
}
esriLoader.loadCss('/static/third/map/ArcGIS/3.14/esri/css/esri.css')

// esriLoader.loadScript ({ // 加载js
//   url: 'https://js.arcgis.com/3.24/dojo/dojo.js'
// })
// esriLoader.loadCss('https://js.arcgis.com/3.24/esri/css/esri.css')

const getArcGIS = function () {
  let arcGIS = {}
  return new Promise((resolve, reject) => {
    loadModules([
      'esri/map',
      'esri/layers/ArcGISDynamicMapServiceLayer',
      'esri/layers/FeatureLayer',
      'esri/graphicsUtils',
      'esri/InfoTemplate',
      'esri/tasks/IdentifyTask',
      'esri/tasks/IdentifyParameters',
      'esri/tasks/QueryTask',
      'esri/tasks/query',
      'esri/symbols/SimpleLineSymbol',
      'esri/symbols/SimpleMarkerSymbol',
      'esri/symbols/SimpleFillSymbol',
      'esri/Color',
      'esri/units',
      'esri/graphic',
      'esri/geometry/Point',
      'esri/geometry/geometryEngine',
      'esri/geometry/ScreenPoint',
      'esri/layers/GraphicsLayer',
      'esri/toolbars/draw',
      'esri/geometry/Circle',
      'esri/layers/WebTiledLayer',
      'esri/SpatialReference',
      'esri/symbols/PictureMarkerSymbol',
      'esri/geometry/Extent',
      'esri/geometry/webMercatorUtils',
      'esri/geometry/Polyline',
      'esri/layers/TileInfo',
      'esri/geometry/mathUtils',
      'esri/dijit/Measurement',
      'esri/geometry/Polygon',
      'esri/renderers/SimpleRenderer',
      'esri/dijit/Scalebar',
      'esri/tasks/RouteTask',
      'esri/tasks/RouteParameters',
      'esri/tasks/LengthsParameters',
      'esri/tasks/GeometryService',
      'esri/tasks/FeatureSet',
      'esri/symbols/TextSymbol',
      'esri/symbols/Font',
      'dojo/on'
    ], options)
      .then(([
               Map,
               ArcGISDynamicMapServiceLayer,
               FeatureLayer,
               GraphicsUtils,
               InfoTemplate,
               IdentifyTask,
               IdentifyParameters,
               QueryTask,
               query,
               SimpleLineSymbol,
               SimpleMarkerSymbol,
               SimpleFillSymbol,
               Color,
               Units,
               Graphic,
               Point,
               GeometryEngine,
               ScreenPoint,
               GraphicsLayer,
               Draw,
               Circle,
               WebTiledLayer,
               SpatialReference,
               PictureMarkerSymbol,
               Extent,
               WebMercatorUtils,
               Polyline,
               TileInfo,
               MathUtils,
               Measurement,
               Polygon,
               SimpleRenderer,
               Scalebar,
               RouteTask,
               RouteParameters,
               LengthsParameters,
               GeometryService,
               FeatureSet,
               TextSymbol,
               Font,
               on
             ]) => {
        arcGIS.Map = Map
        arcGIS.ArcGISDynamicMapServiceLayer = ArcGISDynamicMapServiceLayer
        arcGIS.FeatureLayer = FeatureLayer
        arcGIS.GraphicsUtils = GraphicsUtils
        arcGIS.InfoTemplate = InfoTemplate
        arcGIS.IdentifyTask = IdentifyTask
        arcGIS.IdentifyParameters = IdentifyParameters
        arcGIS.QueryTask = QueryTask
        arcGIS.Query = query
        arcGIS.SimpleLineSymbol = SimpleLineSymbol
        arcGIS.SimpleMarkerSymbol = SimpleMarkerSymbol
        arcGIS.SimpleFillSymbol = SimpleFillSymbol
        arcGIS.Color = Color
        arcGIS.Units = Units
        arcGIS.Graphic = Graphic
        arcGIS.Point = Point
        arcGIS.GeometryEngine = GeometryEngine
        arcGIS.ScreenPoint = ScreenPoint
        arcGIS.GraphicsLayer = GraphicsLayer
        arcGIS.Draw = Draw
        arcGIS.Circle = Circle
        arcGIS.WebTiledLayer = WebTiledLayer
        arcGIS.SpatialReference = SpatialReference
        arcGIS.PictureMarkerSymbol = PictureMarkerSymbol
        arcGIS.Extent = Extent
        arcGIS.WebMercatorUtils = WebMercatorUtils
        arcGIS.Polyline = Polyline
        arcGIS.TileInfo = TileInfo
        arcGIS.MathUtils = MathUtils
        arcGIS.Measurement = Measurement
        arcGIS.Polygon = Polygon
        arcGIS.SimpleRenderer = SimpleRenderer
        arcGIS.Scalebar = Scalebar
        arcGIS.RouteTask = RouteTask
        arcGIS.RouteParameters = RouteParameters
        arcGIS.LengthsParameters = LengthsParameters
        arcGIS.GeometryService = GeometryService
        arcGIS.FeatureSet = FeatureSet
        arcGIS.TextSymbol = TextSymbol
        arcGIS.Font = Font
        arcGIS.on = on
        resolve(arcGIS)
      })
      .catch((err) => {
        reject(err)
        // console.error(err)
      })
  })
}

export default getArcGIS
