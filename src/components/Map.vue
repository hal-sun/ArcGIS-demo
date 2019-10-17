<template>
    <div id="map" class="map"></div>
</template>
<script>
    import getArcGIS from '@/utils/map/ArcGIS'
    export default {
      name: 'Map',
      data () {
        return {}
      },
      async created () {
        // let p = await getArcGIS()
        // console.log(p)
        getArcGIS()
          .then(arcGIS => {
            // console.log(arcGIS)
            new arcGIS.Map('map', {
              basemap: 'topo', // For full list of pre-defined basemaps, navigate to http://arcg.is/1JVo6Wd
              center: [-122.45, 37.75], // longitude, latitude
              zoom: 13
            })
          })
      }
    }
</script>
<style lang="less" scoped>
    .map {
        height: 100%;
    }
</style>