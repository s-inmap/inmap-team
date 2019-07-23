import MiddleOverlay from './base/MiddleOverlay';
import ImgConfig from './../config/ImgConfig';
import {
    isString,
    isArray,
    merge,
    typeOf,
    isEmpty
} from './../common/Util';
import State from './../config/OnStateConfig';
/*
 * 点的绘制
 */
export default class PolygonImgOverlay extends MiddleOverlay {
    constructor(opts) {
        super(ImgConfig, opts);
        this._cacheImg = {}; //缓存图片对象
        this._state = null;

        let mouseOver = opts.style.mouseOver;
        if (mouseOver === undefined || mouseOver.show === false) {
            this._mouseOverShow = false;
        } else if (mouseOver.show === undefined || mouseOver.show === true) {
            this._mouseOverShow = true;
        }
    }
    setZIndex(zIndex) {
        this._zIndex = zIndex;
        if (this._container) this._container.style.zIndex = this._zIndex;
    }
    _toDraw(callback) {
        this._drawMap(callback);
    }
    setOptionStyle(ops, callback) {
        this._setStyle(this._option, ops, callback);
    }
    _setState(val) {
        this._state = val;
        this._eventConfig.onState(this._state, this);
    }
    _translation(distanceX, distanceY) {
        for (let i = 0; i < this._workerData.length; i++) {
            let geometry = this._workerData[i].geometry;
            let pixels = geometry.pixels;
            if (geometry.type == 'MultiPolygon') {
                for (let j = 0; j < pixels.length; j++) {
                    let pixelItem = pixels[j];
                    for (let k = 0, len = pixelItem.length; k < len; k++) {
                        let pixels = pixelItem[k];
                        for (let n = 0; n < pixels.length; n++) {
                            let pixel = pixels[n];
                            pixel[0] = pixel[0] + distanceX;
                            pixel[1] = pixel[1] + distanceY;
                        }
                    }
                }
            } else {
                for (let j = 0; j < pixels.length; j++) {
                    let pixelItem = pixels[j];
                    for (let k = 0, len = pixelItem.length; k < len; k++) {
                        let pixel = pixelItem[k];
                        pixel[0] = pixel[0] + distanceX;
                        pixel[1] = pixel[1] + distanceY;
                    }
                }
            }

            let labelPixels = geometry.labelPixels;
            for (let j = 0; j < labelPixels.length; j++) {
                let bestCell = labelPixels[j];
                if (bestCell) {
                    bestCell.x = bestCell.x + distanceX;
                    bestCell.y = bestCell.y + distanceY;
                }

            }

            let center = this._workerData[i].geometry.center;
            center.x = center.x + distanceX;
            center.y = center.y + distanceY;
            center = null;

        }
        this.refresh();
    }
    _drawMap(callback) {
        this._setState(State.computeBefore);
        let parameter = {
            data: this._getTransformData(),
            enable: this._styleConfig.normal.label.enable,
            centerType: this._styleConfig.normal.label.centerType,
            customZoom: this._customZoom
        };
        this._postMessage('PolygonOverlay.centerToPixels', parameter, (pixels, margin) => {
            if (this._eventType == 'onmoving') {
                return;
            }
            this._setState(State.conputeAfter);
            this._setWorkerData(pixels);
            this._translation(margin.left - this._margin.left, margin.top - this._margin.top);
            margin = null;
            pixels = null;
            callback && callback(this);
        });
    }
    _isMouseOver(x, y, imgX, imgY, imgW, imgH) {
        return !(x < imgX || x > imgX + imgW || y < imgY || y > imgY + imgH);
    }
    _getTarget(x, y) {
        let pixels = this._workerData;

        for (let i = 0, len = pixels.length; i < len; i++) {
            let item = pixels[i];
            let center = item.geometry.center;
            let style = this._setDrawStyle(item, false, i);
            let img;
            if (isString(img)) {
                img = this._cacheImg[style.icon];
            } else {
                img = style.icon;
            }

            //img  Not Loaded return 
            if (!img) break;
            if (style.width && style.height) {
                let xy = this._getDrawXY(center, style.offsets.left, style.offsets.top, style.width, style.height, 1);

                if (this._isMouseOver(x, y, xy.x, xy.y, style.width, style.height)) {
                    return {
                        index: i,
                        item: item
                    };
                }
            } else {

                let xy = this._getDrawXY(center, style.offsets.left, style.offsets.top, style.width, style.height);
                if (this._isMouseOver(x, y, xy.x, xy.y, img.width, img.height)) {

                    return {
                        index: i,
                        item: item
                    };
                }

            }

        }
        return {
            index: -1,
            item: null
        };
    }
    _setDrawStyle(item, otherMode, i) {
        let normal = this._styleConfig.normal, //正常样式
            mouseOverStyle = this._styleConfig.mouseOver,
            selectedStyle = this._styleConfig.selected; //选中样式
        let result;
        if (otherMode) {
            result = merge({}, mouseOverStyle);
        } else {
            result = merge({}, normal);
        }
        let count = parseFloat(item.count);

        //区间样式
        let splitList = this._styleConfig.splitList,
            len = splitList.length;
        len = splitList.length;
        if (len > 0 && typeOf(count) !== 'number') {
            throw new TypeError(`inMap: data index Line ${i}, The property count must be of type Number! about geoJSON, visit http://inmap.talkingdata.com/#/docs/v2/Geojson`);
        }

        for (let i = 0; i < len; i++) {
            let condition = splitList[i];
            if (condition.end == null) {
                if (count >= condition.start) {
                    if (otherMode) {
                        Object.assign(result, mouseOverStyle, condition);
                    } else {
                        Object.assign(result, normal, condition);
                    }
                    break;
                }
            } else if (count >= condition.start && count < condition.end) {
                if (otherMode) {
                    Object.assign(result, mouseOverStyle, condition);
                } else {
                    Object.assign(result, normal, condition);
                }
                break;
            }
        }
        if (otherMode && selectedStyle && this._selectItemContains(item)) {
            result = merge(result, selectedStyle);
        }
        return result;
    }
    _findIndexSelectItem(item) {
        let index = -1;
        if (item) {
            index = this._selectItem.findIndex(function(val) {
                let itemCenter = item.center;
                let valCenter = val.center;
                return val && itemCenter[0] == valCenter[0] && itemCenter[1] == valCenter[1];
            });
        }
        return index;
    }
    _drawData(pixelItem) {
        if (pixelItem.length == 0)
            return;
        let pixel = pixelItem[0];
        this._ctx.moveTo(pixel[0], pixel[1]);
        for (let k = 1, len = pixelItem.length; k < len; k++) {
            let item = pixelItem[k];
            if (pixel[0] != item[0] || pixel[1] != item[1]) {
                this._ctx.lineTo(pixelItem[k][0], pixelItem[k][1]);
                pixel = item;
            }
        }
    }
    _drawPath(pixels, style) {
        for (let j = 0; j < pixels.length; j++) {
            this._ctx.save();
            this._ctx.beginPath();
            if (style.borderStyle == 'dashed') {
                if (style.dashed) {
                    this._ctx.setLineDash(style.dashed);
                } else {
                    this._ctx.setLineDash([style.borderWidth * 10, style.borderWidth * 3]);
                }
            }
            let pixelItem = pixels[j];
            if (j == 0) {
                this._drawData(pixelItem);
                this._ctx.closePath();
                this._ctx.fill();
            } else {
                this._drawData(pixelItem);
                this._ctx.clip();
                this._clearCanvas();
            }

            let borderStyle = style.borderStyle;

            if (isString(borderStyle) && borderStyle === 'dashed') {
                this._ctx.setLineDash([style.borderWidth * 2, style.borderWidth]);
            }
            if (isString(borderStyle) && borderStyle === 'dotted') {
                this._ctx.setLineDash([style.borderWidth]);
            }
            if (isArray(borderStyle)) {
                this._ctx.setLineDash(borderStyle);
            }

            this._ctx.strokeStyle = style.borderColor;
            this._ctx.lineWidth = style.borderWidth;
            this._ctx.stroke();
            this._ctx.restore();
            pixelItem = null;
        }
    }
    _drawPolygon(data, otherMode) {
        this._ctx.lineCap = 'round';
        this._ctx.lineJoin = 'round';
        this._ctx.miterLimit = 4;
        for (let i = 0; i < data.length; i++) {
            let item = data[i];
            let geometry = item.geometry;
            let pixels = geometry.pixels;
            let style = this._setDrawStyle(item, otherMode, i);
            this._ctx.beginPath();
            this._ctx.shadowColor = style.shadowColor || 'transparent';
            this._ctx.shadowBlur = style.shadowBlur || 0;
            this._ctx.shadowOffsetX = 0;
            this._ctx.shadowOffsetY = 0;
            this._ctx.fillStyle = style.backgroundColor;
            if (geometry.type == 'MultiPolygon') {
                for (let k = 0; k < pixels.length; k++) {
                    this._drawPath(pixels[k], style);
                }

            } else {
                this._drawPath(pixels, style);
            }
            style = null, pixels = null, geometry = null, item = null;
            this._ctx.closePath();
        }

        if (this._styleConfig.normal.label.show) {
            for (let i = 0; i < data.length; i++) {
                let item = data[i];
                let geometry = item.geometry;
                let pixels = geometry.pixels;
                let style = this._setDrawStyle(item, otherMode, i);
                let labelPixels = geometry.labelPixels;
                this._ctx.shadowBlur = 0;
                this._ctx.lineWidth = style.label.lineWidth;
                this._ctx.font = style.label.font;
                this._ctx.fillStyle = style.label.color;
                for (let j = 0; j < labelPixels.length; j++) {
                    let bestCell = labelPixels[j];
                    this._ctx.beginPath();
                    let width = this._ctx.measureText(item.name).width;
                    if (geometry.type == 'MultiPolygon') {
                        let maxPixels = [];
                        for (let k = 0; k < pixels.length; k++) {
                            let item = pixels[k][0];
                            if (item.length > maxPixels.length) {
                                maxPixels = item;
                                bestCell = labelPixels[k];
                            }
                            item = null;
                        }
                        if (bestCell && item.name && this._getMaxWidth(maxPixels) > width) {
                            this._ctx.fillText(item.name, bestCell.x - width / 2, bestCell.y);
                        }
                        maxPixels = null;
                    } else {
                        if (bestCell && item.name && this._getMaxWidth(pixels[j]) > width) {
                            this._ctx.fillText(item.name, bestCell.x - width / 2, bestCell.y);
                        }
                    }
                    bestCell = null, width = null;
                }
                labelPixels = null;
            }

        }

    }
    refresh() {
        this._setState(State.drawBefore);
        this._clearCanvas();
        this._drawPolygon(this._workerData);
        this._loopDraw(this._ctx, this._workerData);
        this._setState(State.drawAfter);
    }
    _loadImg(img, fun) {
        let me = this;
        if (isString(img)) {
            let image = me._cacheImg[img];
            if (!image) {
                let image = new Image();
                image.src = img;
                image.onload = function() {
                    me._cacheImg[img] = image;
                    fun(image);
                };
            } else {
                fun(image);
            }

        } else {
            fun(img);
        }
    }
    _isPercent(val) {
        if (val.toString().indexOf('%') > -1) {
            return true;
        } else {
            return false;
        }

    }
    _getDrawXY(pixel, offsetL, offsetT, width, height) {
        let x = 0,
            y = 0;
        let scaleW = width;
        let scaleH = height;
        let offsetLeft = parseFloat(offsetL);
        let offsetTop = parseFloat(offsetT);

        if (this._isPercent(offsetL)) {
            x = pixel.x + scaleW * offsetLeft / 100;
        } else {
            x = pixel.x + offsetLeft;
        }
        if (this._isPercent(offsetT)) {
            y = pixel.y + scaleH * offsetTop / 100;
        } else {
            y = pixel.y + offsetTop;
        }
        return {
            x: x,
            y: y
        };
    }
    _loopDraw(ctx, pixels, otherMode) {
        let mapSize = this._map.getSize();
        for (let i = 0, len = pixels.length; i < len; i++) {
            let item = pixels[i];
            let center = item.geometry.center;
            let style = this._setDrawStyle(item, otherMode, i);
            if (center.x > -style.width && center.y > -style.height && center.x < mapSize.width + style.width && center.y < mapSize.height + style.height) {
                this._loadImg(style.icon, (img) => {
                    if (style.width && style.height) {
                        let xy = this._getDrawXY(center, style.offsets.left, style.offsets.top, style.width, style.height);
                        this._drawImage(this._ctx, img, xy.x, xy.y, style.width, style.height);

                    } else {
                        let xy = this._getDrawXY(center, style.offsets.left, style.offsets.top, img.width, img.height, 1);
                        this._drawImage(this._ctx, img, xy.x, xy.y, img.width, img.height);
                    }
                });
            }
        }
    }
    _drawMousePolygon() {
        let overArr = this._overItem ? [this._overItem] : [];
        if (this._mouseOverShow) {
            // this._selectItem.splice(0);
            this._drawPolygon(this._selectItem.concat(overArr), true);
        }
    }
    _drawMouseLayer() {
        let overArr = this._overItem ? [this._overItem] : [];
        if (this._mouseOverShow) {
            // this._selectItem.splice(0);
            this._loopDraw(this._ctx, this._selectItem.concat(overArr), true);
        }
    }
    _drawImage(ctx, img, x, y, width, height) {
        ctx.drawImage(img, x, y, width, height);
    }
    _tMousemove(event) {
        if (this._eventType == 'onmoving') {
            return;
        }
        if (!this._tooltipConfig.show && isEmpty(this._styleConfig.mouseOver)) {
            return;
        }
        let result = this._getTarget(event.pixel.x, event.pixel.y);
        let temp = result.item;

        if (temp != this._overItem) { //防止过度重新绘画
            this._overItem = temp;
            this._eventType = 'mouseover';
            if (!isEmpty(this._styleConfig.mouseOver)) {
                this.refresh();
                this._drawMousePolygon();
                this._drawMouseLayer();
                if (this._eventConfig.onMouseOver) {
                    this._eventConfig.onMouseOver.call(this, this._overItem, event);
                }
            }
            this._setTooltip(event);
        }
        if (temp) {
            this._map.setDefaultCursor('pointer');
        } else {
            this._map.setDefaultCursor('default');
        }
        if (this._overItem !== null && this._eventConfig.onMouseEnter) {
            this._eventType = 'mouseenter';
            this._eventConfig.onMouseEnter.call(this, this._overItem, event);
        }
        if (this._overItem === null && this._eventConfig.onMouseLeave) {
            this._eventType = 'mouseleave';
            this._eventConfig.onMouseLeave.call(this, this._overItem, event);
        }
    }
    _tMouseClick(event) {}
    /**
     * 设置选中
     * @param {Array} 经纬度数组
     * @param {Number} zoom 需要放大的地图级别
     */
    setSelectd(lnglat, zoomValue = 16) {
        let point = new BMap.Point(lnglat[0], lnglat[1]);
        let center = this._map.getCenter();
        let zoom = this._map.getZoom();
        if (zoom !== zoomValue || center.lng !== point.lng) {
            this._map.centerAndZoom(point, zoomValue);
            this._clearCanvas();
            this._canvasResize();

            setTimeout(() => {
                this.setSelectedMessage(lnglat);
            }, 1000);
            return;
        } else {
            this.setSelectedMessage(lnglat);
            return;
        }
    }
    setSelectedMessage(lnglat) {
        let parameter = {
            data: this._getTransformData(),
            filterData: lnglat
        };
        this._postMessage('PolygonOverlay.setSelected', parameter, (postObj) => {
            let selectItem = postObj['selectItems'] || {};
            this._selectItem.splice(0);
            this._selectItem = [selectItem];
            
            this.refresh(); 
            this._drawMouseLayer();
            this._selectItem.splice(0);
        });
    }
}