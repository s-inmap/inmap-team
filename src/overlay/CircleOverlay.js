import MiddleOverlay from './base/MiddleOverlay';
import ImgConfig from './../config/ImgConfig';
import BatchesData from './base/BatchesData';
import {
    isString,
    isEmpty,
    merge,
    typeOf
} from './../common/Util';
import State from './../config/OnStateConfig';
/*
 * 点的绘制
 */
export default class CircleOverlay extends MiddleOverlay {
    constructor(opts) {
        super(ImgConfig, opts);

        if (!isEmpty(this._option.draw)) {
            this._batchesData = new BatchesData(this._option.draw);
            this.emitEvent = this._eventConfig.emitEvent = false;
        }
        let mouseOver = opts.style.mouseOver;
        if (mouseOver === undefined || mouseOver.show === false) {
            this._mouseOverShow = false;
        } else if (mouseOver.show === undefined || mouseOver.show === true) {
            this._mouseOverShow = true;
        }

        this._cacheImg = {}; //缓存图片对象
        this._state = null;
        this._mpp = {};

        this._rangeShow = this._styleConfig.normal.rangeShow;
    }
    _toDraw(callback) {
        this._drawMap(callback);
    }
    _calculateMpp(size) {
        let normal = this._styleConfig.normal,
            result;
        if (normal.unit == 'px') {
            result = size;
        } else if (normal.unit == 'm') {
            let zoom = this._map.getZoom();
            let mpp;
            if (this._mpp[zoom]) {
                mpp = this._mpp[zoom];
            } else {
                this._mpp[zoom] = this._getMpp();
                mpp = this._mpp[zoom];
            }
            if (mpp == 0 || isNaN(mpp)) {
                return;
            }
            result = size / mpp;
        } else {
            throw new TypeError('inMap: style.normal.unit must be is "m" or "px" .');
        }
        return result;
    }
    /**
     * 获得每个像素对应多少米
     */
    _getMpp() {
        let mapCenter = this._map.getCenter();
        let assistValue = 1;
        let cpt = new BMap.Point(mapCenter.lng, mapCenter.lat + assistValue);
        let dpx = Math.abs(this._map.pointToPixel(mapCenter).y - this._map.pointToPixel(cpt).y);
        return this._map.getDistance(mapCenter, cpt) / dpx;
    }
    setOptionStyle(ops, callback) {
        this._setStyle(this._option, ops, callback);

        if (!isEmpty(this._option.draw)) {
            this._batchesData = new BatchesData(this._option.draw);
        } else {
            this._batchesData = null;
        }
    }
    _setState(val) {
        this._state = val;
        this._eventConfig.onState(this._state, this);
    }
    _translation(distanceX, distanceY) {
        if (this._batchesData && !this._batchesData.usable) return;
        for (let i = 0; i < this._workerData.length; i++) {
            let pixel = this._workerData[i].geometry.pixel;
            pixel.x = pixel.x + distanceX;
            pixel.y = pixel.y + distanceY;
            pixel = null;
        }

        this.refresh();

    }
    _drawMap(callback) {
        this._setState(State.computeBefore);
        this._postMessage('HeatOverlay.pointsToPixels', this._getTransformData(), (pixels, margin) => {
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
            let pixel = item.geometry.pixel;
            let style = this._setDrawStyle(item, i, false);
            let img;
            if (isString(img)) {
                img = this._cacheImg[style.icon];
            } else {
                img = style.icon;
            }

            //img  Not Loaded return 
            if (!img) break;
            if (style.width && style.height) {
                let xy = this._getDrawXY(pixel, style.offsets.left, style.offsets.top, style.width, style.height, 1);

                if (this._isMouseOver(x, y, xy.x, xy.y, style.width, style.height)) {
                    return {
                        index: i,
                        item: item
                    };
                }
            } else {

                let xy = this._getDrawXY(pixel, style.offsets.left, style.offsets.top, style.width, style.height);
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
    _findIndexSelectItem(item) {
        let index = -1;
        if (item) {
            index = this._selectItem.findIndex(function(val) {
                let itemCoordinates = item.geometry.coordinates;
                let valCoordinates = val.geometry.coordinates;
                return val && itemCoordinates[0] == valCoordinates[0] && itemCoordinates[1] == valCoordinates[1] && val.count == item.count;
            });
        }
        return index;
    }

    _clearAll() {
        this._clearCanvas();
    }
    refresh() {
        this._setState(State.drawBefore);
        this._clearCanvas();
        if (this._batchesData) {
            this._batchesData.clear();
            this._batchesData.action(this._workerData, this._loopDraw, this._ctx);

        } else {
            this._loopDraw(this._ctx, this._workerData, false);
        }
        this._drawMouseLayer();
        this._setState(State.drawAfter);
    }
    _drawMouseLayer() {
        let overArr = this._overItem ? [this._overItem] : [];
        if (this._mouseOverShow) {
            this._loopDraw(this._ctx, this._selectItem.concat(overArr), true);
        }
    }
    _Tdispose() {
        this._batchesData && this._batchesData.clear();
    }
    _setDrawStyle(item, i, otherMode) {
        let normal = this._styleConfig.normal, //正常样式
            mouseOverStyle = this._styleConfig.mouseOver;
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

        return result;
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
            let pixel = item.geometry.pixel;
            let {
                x,
                y
            } = pixel;
            let style = this._setDrawStyle(item, i, otherMode);
            if (pixel.x > -style.width && pixel.y > -style.height && pixel.x < mapSize.width + style.width && pixel.y < mapSize.height + style.height) {
                this._loadImg(style.icon, (img) => {
                    if (style.width && style.height) {
                        let xy = this._getDrawXY(pixel, style.offsets.left, style.offsets.top, style.width, style.height);
                        this._drawImage(this._ctx, img, xy.x, xy.y, style.width, style.height);

                    } else {
                        let xy = this._getDrawXY(pixel, style.offsets.left, style.offsets.top, img.width, img.height, 1);
                        this._drawImage(this._ctx, img, xy.x, xy.y, img.width, img.height);
                    }
                });
            }

            let size = this._calculateMpp(style.size);
            if (this._styleConfig.normal.label.show) {
                pixel['radius'] = size;
            }
            if (x > -size && y > -size && x < mapSize.width + size && y < mapSize.height + size) {
                if (style.shadowColor) {
                    ctx.shadowColor = style.shadowColor || 'transparent';
                    ctx.shadowBlur = style.shadowBlur || 10;
                } else {
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                }
                if (style.globalCompositeOperation) {
                    ctx.globalCompositeOperation = style.globalCompositeOperation;
                }
                if (this._rangeShow) {
                    this._drawCircle(ctx, x, y, size, style.backgroundColor, style.borderWidth, style.borderColor);
                }
            }
        }
    }
    _drawImage(ctx, img, x, y, width, height) {
        ctx.drawImage(img, x, y, width, height);
    }
    _drawCircle(ctx, x, y, radius, color, lineWidth, strokeStyle) {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
        ctx.fill();
        if (lineWidth) {
            ctx.lineWidth = lineWidth;
            if (strokeStyle) {
                ctx.strokeStyle = strokeStyle;
            }
            ctx.stroke();
        }
    }
    setRangeIsShow(val) {
        if (this._rangeShow !== val) {
            this._rangeShow = val;
            this.refresh();
        }
    }
    setRange(ops) {
        this._setStyle(this._option, {
            style: {
                normal: {
                    unit: ops.unit,
                    size: ops.size
                }
            }
        });
        this.refresh();
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
}