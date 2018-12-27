 import Cluster from './Cluster.js';


 /**
  * 判断给定的对象是否为数组
  * @param {Object} source 要测试的对象
  *
  * @return {Boolean} 如果是数组返回true，否则返回false
  */
 let isArray = function(source) {
     return '[object Array]' === Object.prototype.toString.call(source);
 };

 /**
  * 返回item在source中的索引位置
  * @param {Object} item 要测试的对象
  * @param {Array} source 数组
  *
  * @return {Number} 如果在数组内，返回索引，否则返回-1
  */
 let indexOf = function(item, source) {
     let index = -1;
     if (isArray(source)) {
         if (source.indexOf) {
             index = source.indexOf(item);
         } else {
             for (let i = 0, m; m = source[i]; i++) {
                 if (m === item) {
                     index = i;
                     break;
                 }
             }
         }
     }
     return index;
 };
 export default class MarkerClusterer {
     constructor(map, options) {
         if (!map) {
             return;
         }
         this._map = map;
         this._markers = [];
         this._clusters = [];

         let opts = options || {};
         this._gridSize = opts["gridSize"] || 60;
         this._maxZoom = opts["maxZoom"] || 18;
         this._minClusterSize = opts["minClusterSize"] || 1;
         this._isAverageCenter = false;
         if (opts['isAverageCenter'] != undefined) {
             this._isAverageCenter = opts['isAverageCenter'];
         }
         this._styles = opts["styles"] || [];

         let that = this;
         this._map.addEventListener("zoomend", function() {
             that._redraw();
         });

         // this._map.addEventListener("moveend", function() {
         //     that._redraw();
         // });

         let mkrs = opts["markers"];
         isArray(mkrs) && this.addMarkers(mkrs);
     }
     /**
      * 添加要聚合的标记数组。
      * @param {Array<Marker>} markers 要聚合的标记数组
      *
      * @return 无返回值。
      */
     addMarkers(markers) {
         for (let i = 0, len = markers.length; i < len; i++) {
             this._pushMarkerTo(markers[i]);
         }
         this._createClusters();
     }
     /**
      * 把一个标记添加到要聚合的标记数组中
      * @param {BMap.Marker} marker 要添加的标记
      *
      * @return 无返回值。
      */
     _pushMarkerTo(marker) {
         let index = indexOf(marker, this._markers);
         if (index === -1) {
             marker.isInCluster = false;
             this._markers.push(marker); //Marker拖放后enableDragging不做变化，忽略
         }
     }
     /**
      * 添加一个聚合的标记。
      * @param {BMap.Marker} marker 要聚合的单个标记。
      * @return 无返回值。
      */
     addMarker(marker) {
         this._pushMarkerTo(marker);
         this._createClusters();
     }
     /**
      * 根据所给定的标记，创建聚合点
      * @return 无返回值
      */
     _createClusters() {

         // let mapBounds = this._map.getBounds();
         // let extendedBounds = getExtendedBounds(this._map, mapBounds, this._gridSize);
         for (let i = 0, marker; marker = this._markers[i]; i++) {
             // if (!marker.isInCluster && extendedBounds.containsPoint(marker.getPosition())) {
             if (!marker.isInCluster) {
                 this._addToClosestCluster(marker);
             }
         }
     }
     /**
      * 根据标记的位置，把它添加到最近的聚合中
      * @param {BMap.Marker} marker 要进行聚合的单个标记
      *
      * @return 无返回值。
      */
     _addToClosestCluster(marker) {
         let distance = 4000000;
         let clusterToAddTo = null;
         let position = marker.getPosition();
         for (let i = 0, cluster; cluster = this._clusters[i]; i++) {
             let center = cluster.getCenter();
             if (center) {
                 let d = this._map.getDistance(center, marker.getPosition());
                 if (d < distance) {
                     distance = d;
                     clusterToAddTo = cluster;
                 }
             }
         }

         if (clusterToAddTo && clusterToAddTo.isMarkerInClusterBounds(marker)) {
             clusterToAddTo.addMarker(marker);
         } else {
             let cluster = new Cluster(this);
             cluster.addMarker(marker);
             this._clusters.push(cluster);
         }
     }
     /**
      * 清除上一次的聚合的结果
      * @return 无返回值。
      */
     _clearLastClusters() {
         for (let i = 0, cluster; cluster = this._clusters[i]; i++) {
             cluster.remove();
         }
         this._clusters = []; //置空Cluster数组
         this._removeMarkersFromCluster(); //把Marker的cluster标记设为false
     }
     /**
      * 清除某个聚合中的所有标记
      * @return 无返回值
      */
     _removeMarkersFromCluster() {
         for (let i = 0, marker; marker = this._markers[i]; i++) {
             marker.isInCluster = false;
         }
     }
     /**
      * 把所有的标记从地图上清除
      * @return 无返回值
      */
     _removeMarkersFromMap() {
         for (let i = 0, marker; marker = this._markers[i]; i++) {
             marker.isInCluster = false;
             this._map.removeOverlay(marker);
         }
     }
     /**
      * 删除单个标记
      * @param {BMap.Marker} marker 需要被删除的marker
      *
      * @return {Boolean} 删除成功返回true，否则返回false
      */
     _removeMarker(marker) {
         let index = indexOf(marker, this._markers);
         if (index === -1) {
             return false;
         }
         this._map.removeOverlay(marker);
         this._markers.splice(index, 1);
         return true;
     }
     /**
      * 删除单个标记
      * @param {BMap.Marker} marker 需要被删除的marker
      *
      * @return {Boolean} 删除成功返回true，否则返回false
      */
     removeMarker(marker) {
         let success = this._removeMarker(marker);
         if (success) {
             this._clearLastClusters();
             this._createClusters();
         }
         return success;
     }
     /**
      * 删除一组标记
      * @param {Array<BMap.Marker>} markers 需要被删除的marker数组
      *
      * @return {Boolean} 删除成功返回true，否则返回false
      */
     removeMarkers(markers) {
         let success = false;
         for (let i = 0; i < markers.length; i++) {
             let r = this._removeMarker(markers[i]);
             success = success || r;
         }

         if (success) {
             this._clearLastClusters();
             this._createClusters();
         }
         return success;
     }
     /**
      * 从地图上彻底清除所有的标记
      * @return 无返回值
      */
     clearMarkers() {
         this._clearLastClusters();
         this._removeMarkersFromMap();
         this._markers = [];
     }
     /**
      * 重新生成，比如改变了属性等
      * @return 无返回值
      */
     _redraw() {
         this._clearLastClusters();
         this._createClusters();
     }
     /**
      * 获取网格大小
      * @return {Number} 网格大小
      */
     getGridSize() {
         return this._gridSize;
     }
     /**
      * 设置网格大小
      * @param {Number} size 网格大小
      * @return 无返回值
      */
     setGridSize(size) {
         this._gridSize = size;
         this._redraw();
     }
     /**
      * 获取聚合的最大缩放级别。
      * @return {Number} 聚合的最大缩放级别。
      */
     getMaxZoom() {
         return this._maxZoom;
     }

     /**
      * 设置聚合的最大缩放级别
      * @param {Number} maxZoom 聚合的最大缩放级别
      * @return 无返回值
      */
     setMaxZoom(maxZoom) {
         this._maxZoom = maxZoom;
         this._redraw();
     }
     /**
      * 获取聚合的样式风格集合
      * @return {Array<IconStyle>} 聚合的样式风格集合
      */
     getStyles() {
         return this._styles;
     }
     /**
      * 设置聚合的样式风格集合
      * @param {Array<IconStyle>} styles 样式风格数组
      * @return 无返回值
      */
     setStyles(styles) {
         this._styles = styles;
         this._redraw();
     }
     /**
      * 获取单个聚合的最小数量。
      * @return {Number} 单个聚合的最小数量。
      */
     getMinClusterSize() {
         return this._minClusterSize;
     }
     /**
      * 设置单个聚合的最小数量。
      * @param {Number} size 单个聚合的最小数量。
      * @return 无返回值。
      */
     setMinClusterSize(size) {
         this._minClusterSize = size;
         this._redraw();
     }
     /**
      * 获取单个聚合的落脚点是否是聚合内所有标记的平均中心。
      * @return {Boolean} true或false。
      */
     isAverageCenter() {
         return this._isAverageCenter;
     }
     /**
      * 获取聚合的Map实例。
      * @return {Map} Map的示例。
      */
     getMap() {
         return this._map;
     }
     /**
      * 获取所有的标记数组。
      * @return {Array<Marker>} 标记数组。
      */
     getMarkers() {
         return this._markers;
     }
     /**
      * 获取聚合的总数量。
      * @return {Number} 聚合的总数量。
      */
     getClustersCount() {
         let count = 0;
         for (let i = 0, cluster; cluster = this._clusters[i]; i++) {
             cluster.isReal() && count++;
         }
         return count;
     }
     /**
      * 获取所有聚合信息。
      * @return {[cluster]} 所有cluster信息。
      */
     getClusters() {
         return this._clusters;
     }
 }