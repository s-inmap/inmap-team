 /**
  * 获取一个扩展的视图范围，把上下左右都扩大一样的像素值。
  * @param {Map} map BMap.Map的实例化对象
  * @param {BMap.Bounds} bounds BMap.Bounds的实例化对象
  * @param {Number} gridSize 要扩大的像素值
  *
  * @return {BMap.Bounds} 返回扩大后的视图范围。
  */
 let getExtendedBounds = function(map, bounds, gridSize) {
     bounds = cutBoundsInRange(bounds);
     let pixelNE = map.pointToPixel(bounds.getNorthEast());
     let pixelSW = map.pointToPixel(bounds.getSouthWest());
     pixelNE.x += gridSize;
     pixelNE.y -= gridSize;
     pixelSW.x -= gridSize;
     pixelSW.y += gridSize;
     let newNE = map.pixelToPoint(pixelNE);
     let newSW = map.pixelToPoint(pixelSW);
     return new BMap.Bounds(newSW, newNE);
 };
 /**
  * 对单个值进行边界处理。
  * @param {Number} i 要处理的数值
  * @param {Number} min 下边界值
  * @param {Number} max 上边界值
  * 
  * @return {Number} 返回不越界的数值
  */
 let getRange = function(i, mix, max) {
     mix && (i = Math.max(i, mix));
     max && (i = Math.min(i, max));
     return i;
 };
 /**
  * 按照百度地图支持的世界范围对bounds进行边界处理
  * @param {BMap.Bounds} bounds BMap.Bounds的实例化对象
  *
  * @return {BMap.Bounds} 返回不越界的视图范围
  */
 let cutBoundsInRange = function(bounds) {
     let maxX = getRange(bounds.getNorthEast().lng, -180, 180);
     let minX = getRange(bounds.getSouthWest().lng, -180, 180);
     let maxY = getRange(bounds.getNorthEast().lat, -74, 74);
     let minY = getRange(bounds.getSouthWest().lat, -74, 74);
     return new BMap.Bounds(new BMap.Point(minX, minY), new BMap.Point(maxX, maxY));
 };
 /**
  * @ignore
  * Cluster
  * @class 表示一个聚合对象，该聚合，包含有N个标记，这N个标记组成的范围，并有予以显示在Map上的TextIconOverlay等。
  * @constructor
  * @param {MarkerClusterer} markerClusterer 一个标记聚合器示例。
  */
 export default class Cluster {
     constructor(markerClusterer) {
         this._markerClusterer = markerClusterer;
         this._map = markerClusterer.getMap();
         this._minClusterSize = markerClusterer.getMinClusterSize();
         this._isAverageCenter = markerClusterer.isAverageCenter();
         this._center = null; //落脚位置
         this._markers = []; //这个Cluster中所包含的markers
         this._gridBounds = null; //以中心点为准，向四边扩大gridSize个像素的范围，也即网格范围
         this._isReal = false; //真的是个聚合
     }
     addMarker(marker) {
         if (this.isMarkerInCluster(marker)) {
             return false;
         } //也可用marker.isInCluster判断,外面判断OK，这里基本不会命中

         if (!this._center) {
             this._center = marker.getPosition();
             this.updateGridBounds(); //
         } else {
             if (this._isAverageCenter) {
                 let l = this._markers.length + 1;
                 let lat = (this._center.lat * (l - 1) + marker.getPosition().lat) / l;
                 let lng = (this._center.lng * (l - 1) + marker.getPosition().lng) / l;
                 this._center = new BMap.Point(lng, lat);
                 this.updateGridBounds();
             } //计算新的Center
         }

         marker.isInCluster = true;
         this._markers.push(marker);

         //注释以下
         // let len = this._markers.length;
         // if(len < this._minClusterSize ){     
         //     this._map.addOverlay(marker);
         //     //this.updateClusterMarker();
         //     return true;
         // } else if (len === this._minClusterSize) {
         //     for (let i = 0; i < len; i++) {
         //         this._markers[i].getMap() && this._map.removeOverlay(this._markers[i]);
         //     }

         // } 
         // this._map.addOverlay(this._clusterMarker);
         // this._isReal = true;
         // this.updateClusterMarker();
         // return true;
     }
     /**
      * 判断一个标记是否在该聚合中。
      * @param {Marker} marker 要判断的标记。
      * @return {Boolean} true或false。
      */
     isMarkerInCluster(marker) {
         if (this._markers.indexOf) {
             return this._markers.indexOf(marker) != -1;
         } else {
             for (let i = 0, m; m = this._markers[i]; i++) {
                 if (m === marker) {
                     return true;
                 }
             }
         }
         return false;
     }
     /**
      * 判断一个标记是否在该聚合网格范围中。
      * @param {Marker} marker 要判断的标记。
      * @return {Boolean} true或false。
      */
     isMarkerInClusterBounds(marker) {
         return this._gridBounds.containsPoint(marker.getPosition());
     }
     isReal(marker) {
         return this._isReal;
     }
     /**
      * 更新该聚合的网格范围。
      * @return 无返回值。
      */
     updateGridBounds() {
         let bounds = new BMap.Bounds(this._center, this._center);
         this._gridBounds = getExtendedBounds(this._map, bounds, this._markerClusterer.getGridSize());
     }
     /**
      * 删除该聚合。
      * @return 无返回值。
      */
     remove() {
         for (let i = 0, m; m = this._markers[i]; i++) {
             let tmplabel = this._markers[i].getLabel();
             this._markers[i].getMap() && this._map.removeOverlay(this._markers[i]);
             this._markers[i].setLabel(tmplabel)
         } //清除散的标记点
         this._map.removeOverlay(this._clusterMarker);
         this._markers.length = 0;
         delete this._markers;
     }
     /**
      * 获取该聚合所包含的所有标记的最小外接矩形的范围。
      * @return {BMap.Bounds} 计算出的范围。
      */
     getBounds() {
         let bounds = new BMap.Bounds(this._center, this._center);
         for (let i = 0, marker; marker = this._markers[i]; i++) {
             bounds.extend(marker.getPosition());
         }
         return bounds;
     }
     /**
      * 获取该聚合的落脚点。
      * @return {BMap.Point} 该聚合的落脚点。
      */
     getCenter() {
         return this._center;
     }
 }