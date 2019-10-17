import _ from 'lodash'
// import { ProvinceMapType } from '../AndMap/AndMapConfig'
import { extractResCode } from '@/utils/res/BaseUtil'
import PointIcon from '@/config/map/icon/Point'
import { ResType, TypeJudge } from '@/utils/res/TypeEnum'
import { DefaultShowPoints } from '@/config/map/common/MapShowRules'
import BaseUtil from '@/utils/map/BaseUtil'
// 和地图坐标转换
import { WebMercator2lonLatExtent, WebMercator2lonLat } from '@/utils/map/AndMap/AndMapUtil'
import { getLocalStorageItem, setLocalStorageItem } from '@/utils/common/StorageUtil'
import BaseMapUtil from '@/utils/map/BaseMapUtil'
import { MapConstant } from '@/config/map/common/MapConstant'
import { lineSymbolColor, ArcGISConfig } from '@/config/arcgis/ArcGISConfig'
import { TileServerURL } from '../../../utils/map/AndMap/AndMapConfig'
// import { lineSymbolColor, getPointSymbolSize } from '@/config/arcgis/arcGISConfig'

export class ArcGISUtil {
  arcGIS
  map
  arcGISDynamicMapServiceLayer
  identifyTask
  queryTask
  simpleRenderer
  // identifyResult
  drawTool
  overlayMap = {} // 地图覆盖物缓存，以键值对的形式存在，key值为生成的ID，当前直接就是资源的resID
  relatedIdMap = {} // 资源ID与地图上的覆盖物ID的对应关系，可能存在多对一关系
  focusIntervals = {} // 正在聚焦的覆盖物的闪烁定时器
  focusedOverlays = [] // 正在聚焦的覆盖物

  constructor (arcGIS, el, options) {
    this.arcGIS = arcGIS
    this.map = new arcGIS.Map(el, options)
    // this.arcGISDynamicMapServiceLayer = new this.arcGIS.ArcGISDynamicMapServiceLayer('https://10.154.2.13:6443/arcgis/rest/services/hebei/hebeimap06/MapServer')
    this.identifyTask = new this.arcGIS.IdentifyTask(ArcGISConfig.mapServerUrl)
    this.queryTask = new this.arcGIS.QueryTask(ArcGISConfig.mapServerUrl)
    // this.identifyParameters = new this.arcGIS.IdentifyParameters()
    if (getLocalStorageItem('maptype') === null) {
      setLocalStorageItem('maptype', 'heditu')
      console.log('zszs')
    }
    if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
      // 和地图
      this.map.addLayer(this.getBaseMap(arcGIS, options))
      // this.map.addLayer(this.getBaseMapMarker(arcGIS))
    }
    this.drawTool = new arcGIS.Draw(this.map)
    window.map = this.map
    window.arcGIS = this
  }

  getMap () {
    return this.map
  }
  setQueryTask (event, layerIds) {
    // 传入空间几何范围，可以不设置
    // 合法的geometry类型是Extent, Point, Multipoint, Polyline, Polygon
    let query = new this.arcGIS.Query()
    query.geometry = event.mapPoint
    // query.spatialRelationship = this.arcGIS.Query.SPATIAL_REL_CONTAINS
    query.outFields = ['*']
    // query.objectIds = [0, 1]
    query.returnGeometry = true
    let queryTask = new this.arcGIS.QueryTask('https://10.154.2.13:6443/arcgis/rest/services/hebei/hebeimap04/MapServer/' + layerIds)
    queryTask.execute(query, response => {
      console.log('query', response)
    })
  }

  /**
   * layerOption: LAYER_OPTION_VISIBLE (所有可见图层)
   *              LAYER_OPTION_ALL（所有图层）
   *              LAYER_OPTION_TOP（最上层图层）
   * @param event
   * @param map
   * @param layerIds
   */
  setIdentifyTask (event, map, layerIds, type, polygonGeometry, callback) {
    if (type === 'chaxun') {
      let identifyParameters = new this.arcGIS.IdentifyParameters()
      identifyParameters.geometry = event.mapPoint
      identifyParameters.mapExtent = map.extent
      identifyParameters.width = map.width
      identifyParameters.height = map.height
      identifyParameters.mapExtent = map.extent
      identifyParameters.layerOption = this.arcGIS.IdentifyParameters.LAYER_OPTION_VISIBLE
      identifyParameters.layerIds = layerIds
      identifyParameters.returnGeometry = true
      // 点资源的经纬度 容差范围
      identifyParameters.tolerance = 10
      this.identifyTask.execute(identifyParameters, response => {
        let filterResponseList = []
        layerIds.forEach(id => {
          let filterResponse = _.filter(response, val => {
            return val.layerId === id
          })
          filterResponseList.push(...filterResponse)
        })
        console.log('filterResponseList', filterResponseList)
        callback && callback(filterResponseList)
      })
    } else if (type === 'kancha') {
      let identifyParameters = new this.arcGIS.IdentifyParameters()
      identifyParameters.geometry = polygonGeometry
      identifyParameters.mapExtent = map.extent
      identifyParameters.width = map.width
      identifyParameters.height = map.height
      identifyParameters.mapExtent = map.extent
      identifyParameters.layerOption = this.arcGIS.IdentifyParameters.LAYER_OPTION_VISIBLE
      identifyParameters.layerIds = layerIds
      identifyParameters.returnGeometry = true
      // 点资源的经纬度 容差范围
      identifyParameters.tolerance = 10
      this.identifyTask.execute(identifyParameters, queryResult => {
        console.log('zs', queryResult)
        for (let i = 0; i < queryResult.features.length; i++) {
          let graphic = queryResult.features[i]
          graphic.setSymbol()
          map.graphics.add(graphic)
        }
      })
      // let query = new this.arcGIS.Query()
      // query.geometry = map
      // query.outFields = ['*']
      // query.outSpatialReference = map.spatialReference
      // query.spatialRelationship = this.arcGIS.Query.SPATIAL_REL_INTERSECTS
      // this.queryTask.execute(query, response => {
      //   console.log('queryTask', response)
      // })
    }
  }
  getIdentifyResult () {
    return this.identifyResult
  }
  getArcGISDynamicMapServiceLayer () {
    return this.arcGISDynamicMapServiceLayer
  }
  // 墨卡托坐标系的点 转换成  wgs84坐标系的点
  webMercatorToWGS84 (point) {
    return this.arcGIS.WebMercatorUtils.webMercatorToGeographic(point)
  }
  // wgs84坐标系的点 转换成墨卡托坐标系的点
  WGS84ToWebMercator (point) {
    return this.arcGIS.WebMercatorUtils.geographicToWebMercator(point)
  }
  /**
   * 地图上测距
   * @param geometry 绘图事件结束后传入的图形对象
   * @param callback 异步请求数据返回
   */
  measurePolyLineDistance (geometry, callback) {
    let lengthParams = new this.arcGIS.LengthsParameters()
    let GeometryService = new this.arcGIS.GeometryService('https://10.154.2.13:6443/arcgis/rest/services/Utilities/Geometry/GeometryServer')
    lengthParams.polylines = [geometry]
    lengthParams.lengthUnit = this.arcGIS.GeometryService.UNIT_METER
    lengthParams.calculationType = 'preserveShape'
    lengthParams.geodesic = true
    lengthParams.polylines[0].spatialReference = new this.arcGIS.SpatialReference(4326)
    GeometryService.lengths(lengthParams, distance => {
      console.log('计算总长度', distance)
      callback(distance.lengths[0])
    })
    // GeometryService.on('onLengthsComplete', result => {
    //   console.log('计算出来的长度', result)
    // })
  }

  /**
   * 获取线资源的symbol对象
   * @param id
   * @returns {*}
   */
  setLineSimpleRender (id) {
    let simpleRenderer = new this.arcGIS.SimpleRenderer(new this.arcGIS.SimpleLineSymbol().setWidth(3).setColor(new this.arcGIS.Color(lineSymbolColor[id])))
    return simpleRenderer
  }

  /**
   * 根据id名称生成对应的simbol对象
   * @param id 线资源的id
   * @returns {*}
   */
  setLineSimple (id) {
    let simple = new this.arcGIS.SimpleLineSymbol().setWidth(3).setColor(new this.arcGIS.Color(lineSymbolColor[id]))
    return simple
  }
  getTextSymbol (info, Point) {
    let startFont = new this.arcGIS.Font('12px').setWeight(this.arcGIS.Font.WEIGHT_BOLD)
    let textSymbol = new this.arcGIS.TextSymbol(info, startFont, new this.arcGIS.Color([204, 102, 51]))
    textSymbol.setOffset(40, -15)
    let graphic = new this.arcGIS.Graphic(Point, textSymbol)
    return graphic
  }
  getTextSymbolNew (info, point) {
    let startFont = new this.arcGIS.Font('12px').setWeight(this.arcGIS.Font.WEIGHT_BOLD)
    let textSymbol = new this.arcGIS.TextSymbol(info, startFont, new this.arcGIS.Color([204, 102, 51]))
    let mapPoint = new this.arcGIS.Point(point.longitude, point.latitude)
    let graphic = new this.arcGIS.Graphic(mapPoint, textSymbol)
    return graphic
  }
  /**
   * 获取点的symbol对象
   * @param id, Well,CableLink,Pole等
   * @returns {*}
   */
  setPointSimpleRender (id) {
    let icon = BaseMapUtil.getPointIconFeature(id)
    // 获取不同层级的 icon 的size = {width:'',height: ''},但是对于已经渲染过的icon的size不能进行更改
    // let size = getPointSymbolSize(this.map.getZoom())
    // 根据icon路径与宽度高度生成arcGIS的图标
    let picSymbol = new this.arcGIS.PictureMarkerSymbol(icon, 15, 15)
    let simpleRenderer = new this.arcGIS.SimpleRenderer(picSymbol)
    return simpleRenderer
  }

  /**
   * 生成点资源的symbol对象
   * @param id
   * @returns {*}
   */
  setPointSimple (id) {
    let icon = BaseMapUtil.getPointIconFeature(id)
    // 获取不同层级的 icon 的size = {width:'',height: ''},但是对于已经渲染过的icon的size不能进行更改
    // let size = getPointSymbolSize(this.map.getZoom())
    // 根据icon路径与宽度高度生成arcGIS的图标
    let picSymbol = new this.arcGIS.PictureMarkerSymbol(icon, 15, 15)
    return picSymbol
  }
  getFeatureLayer () {
    return this.featureLayer
  }
  getLayerById (id) {
    return this.map.getLayer(id)
  }

  /**
   * 要素服务根据feature的id获取资源的graphics
   * @param id
   * @returns {Array}
   */
  getExtentResById (id) {
    let featureLayer = this.map.getLayer(id)
    let graphics = featureLayer.graphics
    return graphics
  }

  /**
   * 要素服务 获取当前视图窗口内的资源数据
   * @param extent
   */
  getExtentAllRes (extent) {
    let layerIdsArr = this.map.graphicsLayerIds
    let res = []
    layerIdsArr.forEach(item => {
      let graphics = this.getExtentResById(item)
      let obj = {}
      let filterGraphics = graphics.filter(val => {
        if (val.geometry.x > extent.xmin && val.geometry.x < extent.xmax && val.geometry.y > extent.ymin && val.geometry.y < extent.ymax) {
          return val
        }
      })
      obj[item] = filterGraphics
      res.push(obj)
    })
    console.log('当前可视区域的数据集合', res)
  }
  /**
   * 生成不同资源的id对象的featureLayer对象
   * MODE_AUTO：用于缓存
   * MODE_SNAPSHOT：一次性缓存所有资源
   * MODE_ONDEMAND: 按需加载，返回视野内的数据
   * @param url
   * @param id
   * @returns {*}
   */
  setFeatureLayer (url, id) {
    let render = {}
    if (id === 'CableLink' || id === 'CableSegment' || id === 'LayingSegment' || id === 'WellSeg' || id === 'PoleSeg' || id === 'StoneSeg' || id === 'WallSeg' || id === 'UpSeg' || id === 'LineSeg') {
      render = this.setLineSimpleRender(id)
    } else {
      render = this.setPointSimpleRender(id)
    }
    let featureLayer = new this.arcGIS.FeatureLayer(url, {
      mode: this.arcGIS.FeatureLayer.MODE_SNAPSHOT,
      outFields: ['*'],
      id: id
    })
    featureLayer.setRenderer(render)
    featureLayer.setWebGLEnabled(true)
    // console.log('featureLayer', featureLayer)
    return featureLayer
  }

  /**
   * 地图比例尺
   * @param map 地图对象
   * @returns {比例尺对象}
   */
  setScalebar (map) {
    let scalebar = new this.arcGIS.Scalebar({
      map: map,
      scalebarUnit: 'dual'
    })
    return scalebar
  }
  getDrawTool () {
    return this.drawTool
  }

  /**
   * 通过筛选的资源类别和当前的图层级别生成显示的资源类型列表
   * @param resTypes 当前用户选择显示的资源类别
   */
  getAvailableResType (mapShowRules, resTypes) {
    let currentLevelShownTypes = mapShowRules[this.map.getZoom()]
    if (!currentLevelShownTypes) {
      return []
    }
    if (!resTypes) {
      resTypes = DefaultShowPoints
    } else if (typeof resTypes === 'string') {
      resTypes = resTypes.split(',')
    }
    let searchResTypes = resTypes.filter(resType => {
      return currentLevelShownTypes.indexOf(resType) > -1
    })
    if (searchResTypes.length === 0) {
      return ''
    } else {
      return searchResTypes.join(',')
    }
  }

  /**
   * 获取地图展示的四个点坐标，形成闭包的多边形
   * @returns {string} xx,xx;xx,xx形式的字符串
   */
  getViewPoints (extent) {
    if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
      // 和地图
      !extent && (extent = WebMercator2lonLatExtent(this.map.extent))
      // !extent && (extent = this.map.extent)
    }
    return '' + extent.xmax + ',' + extent.ymax + ';' + extent.xmax + ',' + extent.ymin + ';' +
      extent.xmin + ',' + extent.ymin + ';' + extent.xmin + ',' + extent.ymax + ';' + extent.xmax + ',' + extent.ymax
  }

  /**
   * 设置中心点以及地图层级
   * @param center 中心点经纬度
   * @param level 地图层级
   */
  setCenterAndZoom (center, level) {
    if (center.longitude) {
      center = new this.arcGIS.Point({
        x: center.longitude,
        y: center.latitude,
        spatialReference: {
          wkid: 4326
        }
      })
    }
    this.map.centerAndZoom(center, level)
  }
  setCenterAt (center) {
    this.map.centerAt(center)
  }
  /**
   * 设置地图显示级别
   * @param level
   */
  setLevel (level) {
    this.map.setZoom(level)
  }

  /**
   * 检测id是否已存在
   *
   * @param id 需要检测的id
   * @return {boolean} 存在返回真
   */
  hasId (id) {
    return !!this.overlayMap[this.relatedIdMap[id]]
  }

  /**
   * 设置Id映射表
   * <p>
   * 用来存储实际资源标识与覆盖物id的映射关系
   *
   * @param id 覆盖物id
   * @param arr 资源数组
   */
  setRelatedId (id, arr) {
    if (!_.isArray(arr)) {
      this.relatedIdMap[arr.resID] = id
    } else {
      _.each(arr, (item) => {
        this.relatedIdMap[item.resID] = id
      })
    }
  }
  /**
   * 获取点击的缓冲区域（主要是为了解决聚合点和聚合线的问题）
   * @param mapPoint 点击的点
   * @param tolerance 精度，值越大，缓冲区域越大
   * @returns {*}
   */
  getClickAreaBuffer (mapPoint, tolerance) {
    let map = this.map
    let screenPoint = map.toScreen(mapPoint)
    let minScreenPoint = this.arcGIS.ScreenPoint(screenPoint.x - tolerance, screenPoint.y + tolerance)
    let maxScreenPoint = this.arcGIS.ScreenPoint(screenPoint.x + tolerance, screenPoint.y - tolerance)
    let minMapPoint = WebMercator2lonLat(map.toMap(minScreenPoint))
    let maxMapPoint = WebMercator2lonLat(map.toMap(maxScreenPoint))
    let extent = this.arcGIS.Extent(minMapPoint.x, minMapPoint.y, maxMapPoint.x, maxMapPoint.y)
    return this.arcGIS.Polygon.fromExtent(extent)
  }

  /**
   * 获取附近的资源信息
   * @param polygon 缓冲区
   * @param resType 资源类别，1：点；2：线。为空时两个都查
   * @returns {Array}
   */
  getNearGraphics (polygon, resType) {
    let graphics = []
    this.map.graphics.graphics.forEach(g => {
      if (g.attributes && g.attributes.resID) {
        let resCode = extractResCode(g.attributes.resID)
        let isContains = this.arcGIS.GeometryEngine.contains(polygon, g.geometry)
        let isCrosses = this.arcGIS.GeometryEngine.crosses(polygon, g.geometry)
        if (resType === 1 && isContains && !TypeJudge.isLink(resCode)) {
          graphics.push(g)
        } else if (resType === 2 && isCrosses && TypeJudge.isLink(resCode)) {
          graphics.push(g)
        } else if (!resType && (isContains || isCrosses)) {
          graphics.push(g)
        }
      }
    })
    let obj = {}
    graphics = graphics.reduce((cur, next) => {
      if (!obj[next.attributes.resID]) {
        obj[next.attributes.resID] = true
        cur.push(next)
      }
      return cur
    }, [])
    return graphics
  }

  /**
   * 设置地图合适的视图
   * @param graphics 需要完全呈现的图形
   * @param expand 缩放比率
   */
  setViewport (graphics, expand = 1.7) {
    graphics = graphics.filter(item => {
      return item.attributes && item.attributes.resID
    })
    let extent = this.arcGIS.GraphicsUtils.graphicsExtent(graphics)
    extent = extent.expand(expand)
    this.map.setExtent(extent)
  }

  setViewportByResIDs (resIDs, expand = 1.7) {
    let graphics = this.map.graphics.graphics.filter(item => {
      return item.attributes && item.attributes.resID && resIDs.indexOf(item.attributes.resID) > -1
    })
    let extent = this.arcGIS.GraphicsUtils.graphicsExtent(graphics)
    extent = extent.expand(expand)
    this.map.setExtent(extent)
  }

  /**
   * 批量新增光缆段
   * @param graphics 通过resID查找图形数据
   * @param expand 缩放比率
   */
  setMultiple (points) {
    let mapGraphic = []
    for (let i = 0; i < points.length; i++) {
      this.map.graphics.graphics.forEach(item => {
        if (points[i] === item.attributes.resID) {
          mapGraphic.push(item)
        }
      })
    }
    return mapGraphic
  }
  /**
   * 定位到资源，呈现资源的合适视图
   * @param graphic 需要定位呈现的资源（支持resID或图形对象）
   * @param expand 缩放比率
   */
  locatedGraphic (graphic, expand = 2.2) {
    if (typeof graphic === 'string') {
      for (let item of this.map.graphics.graphics) {
        if (item.attributes && item.attributes.resID === graphic) {
          graphic = item
          break
        }
      }
    }
    if (graphic) {
      let extent = this.arcGIS.GraphicsUtils.graphicsExtent([graphic])
      extent = extent.expand(expand)
      this.map.setExtent(extent)
    }
  }
  locatedGraphicAndFocusOver (graphic, expand = 2.2) {
    if (typeof graphic === 'string') {
      for (let item of this.map.graphics.graphics) {
        if (item.attributes && item.attributes.resID === graphic) {
          graphic = item
          break
        }
      }
    }
    if (graphic) {
      let extent = this.arcGIS.GraphicsUtils.graphicsExtent([graphic])
      extent = extent.expand(expand)
      this.map.setExtent(extent)
    }
    setTimeout(() => {
      this.focusOverlay(graphic, false, 2)
    }, 500)
  }

  /**
   * 绘制默认的点
   * @param point 点坐标
   */
  appendDefaultPoint (point) {
    let mapPoint = new this.arcGIS.Point(point.longitude, point.latitude)
    let picSymbol = new this.arcGIS.PictureMarkerSymbol(PointIcon.markerSelect, 9, 12)
    let picGraphic = new this.arcGIS.Graphic(mapPoint, picSymbol)
    this.map.graphics.add(picGraphic)
  }

  appendDrawGraphic (points, point) {
    let _this = this
    let paths = []
    let pointGraphics = []
    let symbol = new this.arcGIS.PictureMarkerSymbol(BaseMapUtil.getPointIcon(point), 15, 15)
    points.forEach(point => {
      paths.push([point.longitude, point.latitude])
      let mapPoint = new _this.arcGIS.Point(point.longitude, point.latitude)
      pointGraphics.push(new _this.arcGIS.Graphic(mapPoint, symbol, {isBatchAddGraphic: true}))
    })

    let polyLineJson = {
      paths: [paths],
      spatialReference: {
        wkid: 4326
      }
    }
    let polyLine = new this.arcGIS.Polyline(polyLineJson)
    let linkStyle = this.arcGIS.SimpleLineSymbol.STYLE_SOLID
    let sls = new this.arcGIS.SimpleLineSymbol(linkStyle, new this.arcGIS.Color('#ff0000'), MapConstant.LINK_WIDTH_COMMON)
    let lineGraphic = new this.arcGIS.Graphic(polyLine, sls, {isBatchAddGraphic: true})
    _this.map.graphics.add(lineGraphic)

    pointGraphics.forEach(graphic => {
      _this.map.graphics.add(graphic)
    })
  }

  /**
   * 绘制圆
   * @param option 包含中心点的经纬度与半径
   */
  appendCircle (option, isReturn) {
    let point = new this.arcGIS.Point(option.longitude, option.latitude, new this.arcGIS.SpatialReference({ wkid: 4326 }))
    let xyPoint = this.arcGIS.WebMercatorUtils.geographicToWebMercator(point)
    let circleGeometry = new this.arcGIS.Circle({
      center: xyPoint,
      // center: [120.304406, 31.573656],
      radius: option.distance * 1.1,
      radiusUnits: this.arcGIS.Units.METERS
    })
    // let symbol = new this.arcGIS.SimpleFillSymbol().setColor(null).outline.setColor('#e71208')
    let symbol = new this.arcGIS.SimpleFillSymbol()
    symbol.setColor(new this.arcGIS.Color([130, 247, 110, 0.3]))
    symbol.outline.setColor(new this.arcGIS.Color([81, 242, 58, 1]))
    let picGraphic = new this.arcGIS.Graphic(circleGeometry, symbol)
    // this.graphicsLayer.add(picGraphic)
    // this.map.addLayer(this.graphicsLayer)
    this.map.graphics.add(picGraphic)
    if (isReturn) {
      // 返回圆的图形
      return circleGeometry
    }
  }

  /**
   * 绘制多条线
   * @param geometry
   * @param type measure: 测距使用
   */
  appendPolyline (geometry, type) {
    if (type === 'measure') {
      let symbol = new this.arcGIS.SimpleLineSymbol()
      symbol.setColor(new this.arcGIS.Color(MapConstant.LINK_COLOR_MEASUREDISTANCE))
      symbol.setWidth(2)
      let graphic = new this.arcGIS.Graphic(geometry, symbol)
      this.map.graphics.add(graphic)
      return graphic
    } else {
      let symbol = new this.arcGIS.SimpleLineSymbol()
      symbol.setColor(new this.arcGIS.Color(MapConstant.LINK_COLOR_SELECTED))
      symbol.setWidth(4)
      let graphic = new this.arcGIS.Graphic(geometry, symbol)
      this.map.graphics.add(graphic)
      return graphic
    }
  }
  /**
   * 绘制多边形
   * @param option
   */
  appendPolygon (geometry, fillColor = [190, 221, 238, 0.3], lineColor = [42, 109, 255, 1], type) {
    // let polygon = new this.arcGIS.Polygon(new this.arcGIS.SpatialReference({ wkid: 4326 }))
    // polygon.addRing(option)
    let symbol = new this.arcGIS.SimpleFillSymbol()
    symbol.setColor(new this.arcGIS.Color(fillColor))
    symbol.outline.setColor(new this.arcGIS.Color(lineColor))
    let graphic = new this.arcGIS.Graphic(geometry, symbol, {type: type})
    this.map.graphics.add(graphic)
  }

  /**
   * 绘制多边形
   * @param data = {
                rings: rings,
                data: {
                  name: resource.name,
                  resID: resource.resID,
                  href: resource.href,
                  lifecycleStatus: 2
                }
   * @param fillColor
   * @param lineColor
   */
  drawPolygonByRings (data, fillColor = [190, 221, 238, 0.3], lineColor = [42, 109, 255, 1]) {
    let polygon = new this.arcGIS.Polygon(new this.arcGIS.SpatialReference({ wkid: 4326 }))
    polygon.addRing(data.rings)
    let symbol = new this.arcGIS.SimpleFillSymbol()
    symbol.setColor(new this.arcGIS.Color(fillColor))
    symbol.outline.setColor(new this.arcGIS.Color(lineColor))
    let graphic = new this.arcGIS.Graphic(polygon, symbol, data.data)
    this.map.graphics.add(graphic)
  }

  /**
   * 在地图上追加一个点
   *
   * @param point 需要追加的点
   * @param lifecycleStatus 生命周期状态
   */
  appendPoint (point, lifecycleStatus, icon) {
    if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
      // point = WGS84toGCJ02(point)
    }
    if (lifecycleStatus === undefined && point.lifecycleStatus !== undefined) {
      lifecycleStatus = point.lifecycleStatus
    }
    if (this.hasId(point.id)) {
      this.setRelatedId(point.id, point)
      return
    }
    let mapPoint = new this.arcGIS.Point(point.longitude, point.latitude)
    let size = BaseMapUtil.getTransoSymbolSize(point.resID, this.map.getZoom())
    if (!icon) {
      icon = BaseMapUtil.getPointIcon(Object.assign(point, {lifecycleStatus}))
    }
    // 根据icon路径与宽度高度生成arcGIS的图标
    let picSymbol = new this.arcGIS.PictureMarkerSymbol(icon, size.width, size.height)
    // arcGIS图形
    let simpleData = {
      name: point.name,
      resID: point.resID,
      href: point.href,
      lifecycleStatus: point.lifecycleStatus
    }
    // 可视化容量的点闪烁时，两种icon切换
    if (point.rate !== undefined) {
      simpleData.rate = point.rate
    }
    let picGraphic = new this.arcGIS.Graphic(mapPoint, picSymbol, simpleData)
    picGraphic.setFocus = () => {
      let data = picGraphic.attributes
      if (data && data.resID) {
        let currentGraphic = this.focusedOverlays.filter(g => {
          return g && g.attributes && g.attributes.resID && g.attributes.resID === data.resID
        })
        if (this.focusIntervals[data.resID] && currentGraphic.length > 0) {
          return
        }
        this.focusedOverlays.push(picGraphic)

        clearInterval(this.focusIntervals[data.resID])
        delete this.focusIntervals[data.resID]
        this.focusIntervals[data.resID] = setInterval(() => {
          let size = BaseMapUtil.getTransoSymbolSize(data.resID, this.map.getZoom())
          if (!picGraphic.attributes.twinkle) {
            picGraphic.setSymbol(new this.arcGIS.PictureMarkerSymbol(PointIcon.marker, size.width, size.height))
            picGraphic.attributes.twinkle = true
            this.removeGraphicByResID(picGraphic.attributes.resID)
            this.map.graphics.add(picGraphic)
          } else {
            picGraphic.setSymbol(new this.arcGIS.PictureMarkerSymbol(BaseMapUtil.getPointIcon(data), size.width, size.height))
            picGraphic.attributes.twinkle = false
            this.removeGraphicByResID(picGraphic.attributes.resID)
            this.map.graphics.add(picGraphic)
          }
        }, 500)
      }
    }
    picGraphic.clearFocus = () => {
      if (picGraphic && picGraphic.attributes) {
        let data = picGraphic.attributes
        let resID = data.resID
        let size = BaseMapUtil.getTransoSymbolSize(data.resID, this.map.getZoom())
        let picSymbol = new this.arcGIS.PictureMarkerSymbol(BaseMapUtil.getPointIcon(data), size.width, size.height)
        picGraphic.setSymbol(picSymbol)
        picGraphic.attributes.twinkle = false
        clearInterval(this.focusIntervals[data.resID])
        delete this.focusIntervals[data.resID]
        this.focusedOverlays = this.focusedOverlays.filter(g => {
          if (g && g.attributes && g.attributes.resID && g.attributes.resID === resID) {
            return false
          } else {
            return true
          }
        })
      }
    }
    this.map.graphics.add(picGraphic)
    this.saveOverlayCache(picGraphic)
  }

  /**
   * 在地图上绘制传输外线资源
   * 该方法不做任务过滤
   * @param data 数据结构为{links: [], points: []}
   */
  appendTransOData (data) {
    if (data.links) {
      let points = []
      data.links.forEach(link => {
        link = BaseUtil.formatLink(link)
        this.appendLink(link, 5)
        let startPoint = BaseUtil.formatPoint(link.startPoint)
        let endPoint = BaseUtil.formatPoint(link.endPoint)
        points.push(startPoint)
        points.push(endPoint)
      })
      // 点单独最后添加是为了点的icon不被线覆盖
      points.forEach(point => {
        this.appendPoint(point, 5)
      })
    }
    if (data.points) {
      data.points.forEach(point => {
        let pointNode = BaseUtil.formatPoint(point)
        this.appendPoint(pointNode, 5)
      })
    }
  }

  appendPointNew (point) {
    let pointTMp = _.clone(point)
    if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
      // 和地图
      // pointTMp = WGS84toGCJ02(pointTMp)
    }
    let mapPoint = new this.arcGIS.Point(pointTMp.longitude, pointTMp.latitude)
    let size = 21
    let center = new this.arcGIS.Point({
      x: pointTMp.longitude,
      y: pointTMp.latitude,
      spatialReference: {
        wkid: 4326
      }
    })
    this.map.centerAt(center)
    let picSymbol = new this.arcGIS.PictureMarkerSymbol(BaseMapUtil.getPointIcon(pointTMp), size, size)
    let picGraphic = new this.arcGIS.Graphic(mapPoint, picSymbol, {resID: pointTMp.resID, href: pointTMp.href})
    this.map.graphics.add(picGraphic)
  }

  /**
   *
   * @param type geometry new Point () 后的; common {longitude: '', latitude: ''}
   * @param point 图形位置点
   * @param icon 图形icon，默认为圆形红色的icon
   * @param size 图形大小，默认10*10
   */
  appendMarkerPoint (type, point, icon = PointIcon.marker, size = {width: 10, height: 10}, pointData) {
    if (type === 'geometry') {
      let picSymbol = new this.arcGIS.PictureMarkerSymbol(icon, size.width, size.height)
      let picGraphic = new this.arcGIS.Graphic(point, picSymbol, pointData)
      this.map.graphics.add(picGraphic)
      return picGraphic
    } else if (type === 'common') {
      let newPoint = new this.arcGIS.Point(point.longitude, point.latitude, new this.arcGIS.SpatialReference({wkid: 4326}))
      let picSymbol = new this.arcGIS.PictureMarkerSymbol(icon, size.width, size.height)
      let picGraphic = new this.arcGIS.Graphic(this.WGS84ToWebMercator(newPoint), picSymbol, pointData)
      this.map.graphics.add(picGraphic)
      return picGraphic
    }
  }
  /**
   * 批量添加点
   * @param points 批量点
   */
  appendPoints (points) {
    points.forEach(point => {
      this.appendPoint(point)
    })
  }

  /**
   * 在地图上追加一段线
   *
   * @param link 需要追加的线
   * @param lifecycleStatus 生命周期状态
   */
  appendLink (link, lifecycleStatus) {
    if (this.hasId(link.id)) {
      this.setRelatedId(link.id, link.data)
      return
    }
    let linkPoints = []
    link.points.forEach(point => {
      if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
        // point = WGS84toGCJ02(point)
      }
      linkPoints.push(BaseMapUtil.generateLinkPoint(point))
    })

    let polyLineJson = {
      paths: [linkPoints],
      spatialReference: {
        wkid: 4326
      }
    }
    let polyLine = new this.arcGIS.Polyline(polyLineJson)
    let linkColor = BaseMapUtil.getLinkColor({resID: link.data.resID, lifecycleStatus})
    let linkStyle = this.arcGIS.SimpleLineSymbol.STYLE_SOLID

    let resCode = extractResCode(link.data.resID)
    // 未完整敷设的光缆段和局向光缆呈现虚线
    if (undefined !== link.data.isFullyLaying && !link.data.isFullyLaying && (resCode === ResType.CableSegment || resCode === ResType.CableLink)) {
      linkStyle = this.arcGIS.SimpleLineSymbol.STYLE_DASH
    }

    let sls = new this.arcGIS.SimpleLineSymbol(linkStyle, new this.arcGIS.Color(linkColor), MapConstant.LINK_WIDTH_COMMON)
    let simpleData = {resID: link.data.resID, href: link.data.href, name: link.data.name, originColor: linkColor}
    let graphic = new this.arcGIS.Graphic(polyLine, sls, simpleData)

    graphic.setFocus = () => {
      if (graphic.attributes && graphic.attributes.resID) {
        this.removeGraphicByResID(graphic.attributes.resID)
        this.map.graphics.add(graphic)
        let linkColor = MapConstant.LINK_COLOR_SELECTED
        let sls = new this.arcGIS.SimpleLineSymbol(linkStyle, new this.arcGIS.Color(linkColor), MapConstant.LINK_WIDTH_SELECTED)
        graphic.setSymbol(sls)
      }

      let currentGraphic = this.focusedOverlays.filter(g => {
        return g && g.attributes && g.attributes.resID
      })
      if (!currentGraphic || currentGraphic.length === 0) {
        this.focusedOverlays.push(graphic)
      }
    }

    graphic.clearFocus = () => {
      if (graphic && graphic.attributes && graphic.attributes.resID) {
        let resID = graphic.attributes.resID
        let linkColor = graphic.attributes.originColor
        let sls = new this.arcGIS.SimpleLineSymbol(linkStyle, new this.arcGIS.Color(linkColor), MapConstant.LINK_WIDTH_COMMON)
        graphic.setSymbol(sls)
        this.focusedOverlays = this.focusedOverlays.filter(g => {
          if (g && g.attributes && g.attributes.resID && g.attributes.resID === resID) {
            return false
          } else {
            return true
          }
        })
      }
    }
    this.map.graphics.add(graphic)
    this.saveOverlayCache(graphic)
  }

  /**
   * 给图层加入infoTempalte提示弹框
   * @param graphic
   * @param title
   * @param info
   */
  addInfoTemplate (graphic, title, info) {
    let infoTemplate = new this.arcGIS.InfoTemplate(title, info)
    graphic.setInfoTemplate(infoTemplate)
  }

  /**
   * 直接将 两个 点及其 中间的link 连接起来
   * 用于资源详情页 对等关系  上下级关系的打点连线操作
   */
  appendLinkImd (link, color) {
    if (this.hasId(link.id)) {
      this.setRelatedId(link.id, link.data)
      return
    }
    let linkPoints = []
    link.points.forEach(point => {
      if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
        // point = WGS84toGCJ02(point)
      }
      linkPoints.push(BaseMapUtil.generateLinkPoint(point))
    })

    let polyLineJson = {
      paths: [linkPoints],
      spatialReference: {
        wkid: 4326
      }
    }
    let polyLine = new this.arcGIS.Polyline(polyLineJson)
    let sls = new this.arcGIS.SimpleLineSymbol(this.arcGIS.SimpleLineSymbol.STYLE_SOLID, new this.arcGIS.Color(color), 2.5)
    let graghic = new this.arcGIS.Graphic(polyLine, sls, {resID: link.resID, href: link.href})
    this.map.graphics.add(graghic)
    this.saveOverlayCache(graghic)
  }
  appendDeleteLink (link, color) {
    let linkPoints = []
    linkPoints.push(BaseMapUtil.generateLinkPoint(link.startPoint))
    linkPoints.push(BaseMapUtil.generateLinkPoint(link.endPoint))
    let polyLineJson = {
      paths: [linkPoints],
      spatialReference: {
        wkid: 4326
      }
    }
    let polyLine = new this.arcGIS.Polyline(polyLineJson)
    let sls = new this.arcGIS.SimpleLineSymbol(this.arcGIS.SimpleLineSymbol.STYLE_SHORTDOT, new this.arcGIS.Color(color), 2.5)
    let graghic = new this.arcGIS.Graphic(polyLine, sls, {resID: link.resID, href: link.href})
    this.map.graphics.add(graghic)
    this.saveOverlayCache(graghic)
  }
  /**
   * 拐点连线, links= [{longitude:'',latitude:''},{longitude:'',latitude:''},{longitude:'',latitude:''}]
   */
  appendLinksByPoints (link, color, lineSize) {
    let linkPoints = []

    link.forEach(point => {
      if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
        // point = WGS84toGCJ02(point)
      }
      linkPoints.push(BaseMapUtil.generateLinkPoint(point))
    })
    let polyLineJson = {
      paths: [linkPoints],
      spatialReference: {
        wkid: 4326
      }
    }
    let polyLine = new this.arcGIS.Polyline(polyLineJson)
    // let linkColor = this.getLinkColor(link.data)
    let sls = new this.arcGIS.SimpleLineSymbol(this.arcGIS.SimpleLineSymbol.STYLE_SOLID, new this.arcGIS.Color(color), lineSize)
    let graghic = new this.arcGIS.Graphic(polyLine, sls)
    this.map.graphics.add(graghic)
    // this.saveOverlayCache(graghic)
  }

  /**
   *  根据经纬度单独地打印拐点
   */
  appendInflectionPoint (point) {
    let mapPoint = new this.arcGIS.Point(point.latitude, point.longitude)
    // let tableCode = extractResCode(point.resID) || extractResCode(point.resCode)
    // 人手井、电杆、撑点、标石较多，调小防止过度密集
    let size = 22
    // let center = new this.arcGIS.Point({
    //   x: point.longitude,
    //   y: point.latitude,
    //   spatialReference: {
    //     wkid: 4326
    //   }
    // })
    // this.map.centerAt(center)
    let picSymbol = new this.arcGIS.PictureMarkerSymbol(PointIcon.complexPoint, size, size)
    let picGraphic = new this.arcGIS.Graphic(mapPoint, picSymbol)
    this.map.graphics.add(picGraphic)
    window.localStorage.removeItem('kipMapData')
  }
  /**
   * 切换线时候，将线的颜色置成红色
   */
  drawLinkByRed (link, events) {
    let linkPoints = []

    link.points.forEach(point => {
      if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
        // point = WGS84toGCJ02(point)
      }
      linkPoints.push(BaseMapUtil.generateLinkPoint(point))
    })
    let polyLineJson = {
      paths: [linkPoints],
      spatialReference: {
        wkid: 4326
      }
    }
    let polyLine = new this.arcGIS.Polyline(polyLineJson)
    let sls = new this.arcGIS.SimpleLineSymbol(this.arcGIS.SimpleLineSymbol.STYLE_SOLID, new this.arcGIS.Color('#e71208'), 2.5)
    let graghic = new this.arcGIS.Graphic(polyLine, sls, {resID: link.resID, href: link.href})
    this.map.graphics.add(graghic)
    this.saveOverlayCache(graghic)
  }

  /**
   * 获取当前地图中心点以及地图层级
   * @returns {Object|*}
   */
  getViewPort () {
    let viewport = this.map.extent.getCenter()
    viewport.level = this.map.getZoom()
    return viewport
  }

  /**
   * 图层发生变化后，继续高亮之前的高亮的点
   */
  focusCurrentFocusOverlays () {
    this.focusedOverlays.forEach(overlay => {
      overlay && overlay.setFocus && overlay.setFocus()
    })
  }

  /**
   * 设置覆盖物聚焦
   * @param graphic 覆盖物图形对象
   * @param keep 是否保持当前聚焦的覆盖物
   * @param focusType 聚焦的方式 1：点资源为闪烁，线资源为加粗2：点、线资源都是标红
   */
  focusOverlay (graphic, keep, focusType) {
    if (!keep) {
      this.clearAllFocusOverlay()
    }
    if (typeof graphic === 'string') {
      let graph = _.find(this.map.graphics.graphics, {attributes: {resID: graphic}}) || this.overlayMap[graphic]

      if (graph) {
        // this.locatedGraphic(graphic)
        graph.setFocus(focusType)
        this.focusedOverlays.push(graph)
      }
    } else if (graphic) {
      // this.locatedGraphic(graphic)
      graphic.setFocus(focusType)
      this.focusedOverlays.push(graphic)
    }
  }

  /**
   * 清除部分节点的聚焦状态
   */
  clearFocusOverlay (graphic) {
    if (typeof graphic === 'string') {
      let graphics = this.map.graphics.graphics
      for (let g of graphics) {
        if (g && g.attributes && g.attributes.resID === graphic) {
          g.clearFocus()
          break
        }
      }
    } else {
      graphic.clearFocus()
    }
  }

  /**
   * 清除所有覆盖物的聚焦状态
   */
  clearAllFocusOverlay () {
    this.focusedOverlays.forEach(overlay => {
      overlay && overlay.clearFocus && overlay.clearFocus()
    })
    this.focusIntervals = {}
    this.focusedOverlays = []
  }

  /**
   * 开启绘图模式
   * @param type 绘图类型
   */
  startDraw (type, options) {
    if (type === 'circle') {
      let symbol = new this.arcGIS.SimpleFillSymbol()
      symbol.setColor(new this.arcGIS.Color([251, 255, 0, 0.3]))
      symbol.outline.setColor(new this.arcGIS.Color([255, 255, 0, 1]))
      this.drawTool.setFillSymbol(symbol)
      this.drawTool.activate(this.arcGIS.Draw.CIRCLE)
    } else if (type === 'point') {
      this.drawTool.activate(this.arcGIS.Draw.POINT)
    } else if (type === 'multiPoint') {
      let icon = BaseMapUtil.getPointIcon({batchAdd: true, tableCode: options.resCode})
      let symbol = new this.arcGIS.PictureMarkerSymbol(icon, 15, 15)
      console.log('绘制多点', symbol)
      this.drawTool.setMarkerSymbol(symbol)
      this.drawTool.activate(this.arcGIS.Draw.MULTI_POINT)
    } else if (type === 'polygon') {
      let symbol = new this.arcGIS.SimpleFillSymbol()
      symbol.setColor(new this.arcGIS.Color([190, 221, 238, 0.3]))
      symbol.outline.setColor(new this.arcGIS.Color([42, 109, 255, 1]))
      this.drawTool.setFillSymbol(symbol)
      this.drawTool.activate(this.arcGIS.Draw.POLYGON)
    } else if (type === 'polyline') {
      let symbol = new this.arcGIS.SimpleLineSymbol()
      symbol.setWidth(4)
      symbol.setColor(new this.arcGIS.Color(MapConstant.LINK_COLOR_SELECTED))
      this.drawTool.setLineSymbol(symbol)
      this.drawTool.activate(this.arcGIS.Draw.POLYLINE)
    } else if (type === 'polyline-measureDistance') {
      let symbol = new this.arcGIS.SimpleLineSymbol()
      symbol.setWidth(2)
      symbol.setColor(new this.arcGIS.Color(MapConstant.LINK_COLOR_MEASUREDISTANCE))
      this.drawTool.setLineSymbol(symbol)
      this.drawTool.activate(this.arcGIS.Draw.POLYLINE)
    }
  }

  /**
   * 根据四个点坐标获取中心点
   * @param extent
   */
  getGraphicsCenter (extent) {
    return {
      longitude: (extent.xmax + extent.xmin) / 2,
      latitude: (extent.ymax + extent.ymin) / 2
    }
  }

  /**
   * 根据两个资源点的经纬度设置地图的extent
   * @param
   */
  setExtentByPoints (point, point1) {
    if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
      // point = WGS84toGCJ02(point)
      // point1 = WGS84toGCJ02(point1)
    }
    let extent = new this.arcGIS.Extent({
      'xmin': '',
      'ymin': '',
      'xmax': '',
      'ymax': '',
      'spatialReference': {
        'wkid': 4326
      }
    })
    if (point.longitude > point1.longitude) {
      extent.xmin = point1.longitude
      extent.xmax = point.longitude
    } else {
      extent.xmin = point.longitude
      extent.xmax = point1.longitude
    }
    if (point.latitude > point1.latitude) {
      extent.ymin = point1.latitude
      extent.ymax = point.latitude
    } else {
      extent.ymin = point.latitude
      extent.ymax = point1.latitude
    }
    this.map.setExtent(extent)
  }

  /**
   * 根据两个点的经纬度计算距离
   * @param startPoint 第一个点的经纬度
   * @param endPoint 第二个点的经纬度
   * @returns {number} 距离，单位：km
   */
  getDistance (startPoint, endPoint) {
    let radLat1 = (startPoint.latitude) * Math.PI / 180.0
    let radLat2 = (endPoint.latitude) * Math.PI / 180.0

    let a = radLat1 - radLat2
    let b = startPoint.longitude * Math.PI / 180.0 - endPoint.longitude * Math.PI / 180.0

    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
    s = s * 6378137.0
    s = Math.round(s * 10000) / 10000.0

    return s / 1000.0
  }

  /**
   * 关闭绘图模式
   */
  closeDraw () {
    this.drawTool.deactivate()
  }

  /**
   * 清除地图上所有覆盖物
   */
  clearMap () {
    console.log('清除地图覆盖物')
    this.map.graphics.clear()
    this.overlayMap = {}
    this.relatedIdMap = {}
    // this.clearAllFocusOverlay()
  }

  /**
   * 根据resID删除地图覆盖物
   * @param resID 资源唯一标识符
   */
  removeGraphicByResID (resID) {
    this.map.graphics.remove(this.overlayMap[resID])
    delete this.overlayMap[resID]
    delete this.relatedIdMap[resID]
  }
  removeResidentialGraphicByResID (resID) {
    let data = this.map.graphics.graphics.filter((item, itemIndex) => {
      return item.attributes.resID === resID
    })
    console.log('待删除的小区边界图形', data)
    data.forEach(val => {
      this.map.graphics.remove(val)
    })
  }

  /**
   * 根据resID删除地图覆盖物
   * @param resID 资源唯一标识符
   */
  removeGraphicByResID2 (resID) {
    let data = this.map.graphics.graphics.filter((item, itemIndex) => {
      return item.attributes.resID === resID
    })
    if (data.length === 1) {
      data[0].clearFocus()
      this.map.graphics.remove(data[0])
      delete this.overlayMap[resID]
      delete this.relatedIdMap[resID]
    }
  }

  /**
   * 删除地图覆盖物
   * @param graphic 即将删除的图形
   */
  removeGraphic (graphic) {
    this.map.graphics.remove(graphic)
    if (graphic.attributes && graphic.attributes.resID) {
      let resID = graphic.attributes.resID
      if (resID) {
        delete this.overlayMap[resID]
        delete this.relatedIdMap[resID]
      }
    }
  }

  removeBatchAddGraphic () {
    let delGraphics = []
    this.map.graphics.graphics.forEach(g => {
      if (g.attributes && g.attributes.isBatchAddGraphic) {
        delGraphics.push(g)
      }
    })
    this.removeGraphics(delGraphics)
  }
  removePolygonAddGraphic () {
    let delGraphics = []
    this.map.graphics.graphics.forEach(g => {
      if (g.attributes && g.attributes.type === 'drawBorder') {
        delGraphics.push(g)
      }
    })
    this.removeGraphics(delGraphics)
  }

  removeGraphics (graphics) {
    graphics && graphics.forEach(graphic => {
      this.removeGraphic(graphic)
    })
  }

  /**
   * 根据类型编码删除地图覆盖物（批量）
   * @param delResCode 要删除的资源类型编码
   */
  removeGraphicByResCode (delResCode) {
    for (let key in this.overlayMap) {
      let resID = this.overlayMap[key].attributes.resID
      let resCode = extractResCode(resID)
      if (resCode === delResCode) {
        this.removeGraphicByResID(resID)
      }
    }
  }

  /**
   * 存储覆盖物缓存
   * <p>
   * 将覆盖物以id为索引存储起来
   *
   * @param overlay 覆盖物
   */
  saveOverlayCache (overlay) {
    let data = {
      id: overlay.attributes.resID,
      resID: overlay.attributes.resID,
      href: overlay.attributes.href
    }
    this.overlayMap[data.id] = overlay
    this.relatedIdMap[data.id] = data.id
    // if (_.isArray(data.data)) {
    //   this.setRelatedId(data.id, data.data)
    // }
  }

  /**
   * 获取点的图标
   *
   * @param point 点对象
   * @param isSelected 是否选中
   */
  getPointIcon (point, isSelected) {
    if (point.data.length > 1) {
      return PointIcon.complexPoint
    } else {
      let tableCode = extractResCode(point.data[0].resID)
      if (point.defaultMarker) {
        return PointIcon.marker
      }
      if (tableCode === '') {
        return PointIcon.markerError
      }

      let icon = PointIcon.markerError
      if (PointIcon[tableCode]) {
        icon = PointIcon[tableCode].common
      }

      if (tableCode === '0102') {
        /* 检查是不是含机房的位置点 */
        icon = point.data[0].type === 0 ? icon.withEquipRoom : icon.other
      } else if (point.data[0].extend && icon.low) {
        /* 检查资源是否有利用率 */
        let usedRate = _.find(point.data[0].extend, (val, key) => { return /UsedRate$/.test(key) })

        if (usedRate !== undefined) {
          usedRate = parseFloat(usedRate)

          if (usedRate <= 0.3) {
            icon = icon.low
          } else if (usedRate > 0.3 && usedRate <= 0.7) {
            icon = icon.half
          } else {
            icon = icon.high
          }
        }
      }

      if (icon.high) {
        icon = icon.high
      }

      if (tableCode === '0000003' || tableCode === '0000004') {
        if (isSelected) {
          icon = icon.selected
        } else {
          icon = icon.common
        }
      }
      return icon
    }
  }
  getPointIconNew (point) {
    // 使用6位的resCode获取点的图标
    if (!_.isEmpty(point.resCode)) {
      let icon = PointIcon[point.resCode] || PointIcon.markerError

      if (icon.high) {
        icon = icon.high
      }
      return icon
    } else {
      // 使用多位的resID获取点的图标，需要进行预处理
      let tableCode = extractResCode(point.resID || point.resCode)
      if (point.defaultMarker) {
        return PointIcon.marker
      }
      if (tableCode === '') {
        return PointIcon.markerError
      }
      let icon = PointIcon[tableCode] || PointIcon.markerError

      if (icon.high) {
        icon = icon.high
      } else {
        icon = icon.common
      }
      return icon
    }
  }

  /**
   * 获取地图对象
   * @param arcGIS
   * @returns {*}
   */
  // 和地图加载配置
  getBaseMap (arcGIS, options) {
    // let mapType = ProvinceMapType[options.currentProvince] || '25'
    // TODO 当前省端地图，和地图未完成全省视图，所以先改用全国地图
    let mapType = '25'
    if (getLocalStorageItem('maptype') === MapConstant.MAP_TYPE_HE_MAP) {
      return new arcGIS.WebTiledLayer(TileServerURL() + `/tileServer?x={col}&y={row}&z={level}&maptype=${mapType}&key=vk372t5hlzk1l75gf1440cpz52j597ss&number=123456789`,
        {
          'copyright': 'Heditu',
          'id': 'baseMap'
        })
    } else if (getLocalStorageItem('maptype') === 'heditu-weixing') {
      return new arcGIS.WebTiledLayer(TileServerURL() + `/tileServer?x={col}&y={row}&z={level}&maptype=12&key=vk372t5hlzk1l75gf1440cpz52j597ss&number=123456789`,
        {
          'copyright': 'Heditu',
          'id': 'baseMap'
        })
    }
  }

}

export default {
  ArcGISUtil: ArcGISUtil
}
