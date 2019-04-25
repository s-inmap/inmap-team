import CanvasOverlay from './base/CanvasOverlay.js';
import Parameter from './base/Parameter';
import ImgConfig from './../config/ImgConfig';
import {
    isString,
    isEmpty,
    merge,
    typeOf
} from './../common/Util.js';
import State from './../config/OnStateConfig';
// import EV from './../common/ev'
/*
 * 点的绘制
 */
export default class ImgOverlay extends Parameter {
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
        if (this._mouseOverShow) {
            this._mouseLayer = new CanvasOverlay({
                zIndex: this._zIndex + 1
            });
        }
    }
    _toDraw() {
        this._drawMap();
    }
    setZIndex(zIndex) {
        this._zIndex = zIndex;
        if (this._container) this._container.style.zIndex = this._zIndex;
        if (this._mouseOverShow) {
            this._mouseLayer.setZIndex(this._zIndex + 1);
        }
    }
    setOptionStyle(ops) {
        this._setStyle(this._option, ops);
    }
    _parameterInit() {
        if (this._mouseOverShow) {
            this._map.addOverlay(this._mouseLayer);
        }
        // this._initLegend();
    }
    _setState(val) {
        this._state = val;
        this._eventConfig.onState.call(this, this._state);
    }
    _translation(distanceX, distanceY) {
        for (let i = 0; i < this._workerData.length; i++) {
            let pixel = this._workerData[i].geometry.pixel;
            pixel.x = pixel.x + distanceX;
            pixel.y = pixel.y + distanceY;
            pixel = null;
        }

        this.refresh();

    }
    _clearAll() {
        if (this._mouseOverShow) {
            this._mouseLayer._clearCanvas();
        }

        this._clearCanvas();
    }
    _drawMap() {
        this._clearAll();
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
                return val && val.lat == item.lat && val.lng == item.lng;
            });
        }

        return index;
    }
    refresh() {
        this._setState(State.drawBefore);
        this._clearCanvas();
        if (this._mouseOverShow) {
            this._mouseLayer._canvasResize();
        }
        if (this._batchesData) {
            this._batchesData.clear();
            this._batchesData.action(this._workerData, this._loopDraw, this._ctx);

        } else {
            this._loopDraw(this._ctx, this._workerData, false);
        }
        this._loopDraw(this._ctx, this._workerData, false);
        this._drawMouseLayer();
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
    /**
     * 根据用户配置，设置用户绘画样式
     * @param {*} item 
     */
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
    _loopDraw(ctx, pixels, otherMode) {
        let mapSize = this._map.getSize();
        for (let i = 0, len = pixels.length; i < len; i++) {
            let item = pixels[i];
            let pixel = item.geometry.pixel;
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
        }
    }
    _drawMouseLayer() {
        let overArr = this._overItem ? [this._overItem] : [];
        if (this._mouseOverShow) {
            this._mouseLayer._clearCanvas();
            this._loopDraw(this._mouseLayer._getContext(), this._selectItem.concat(overArr), true);
        }
    }
    _Tdispose() {
        this._batchesData && this._batchesData.clear();
        if (this._mouseOverShow) {
            this._map.removeOverlay(this._mouseLayer);
            this._mouseLayer.dispose();
        }
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
    // _setTooltip(event,item) {
    //     this.toolTip.render(event, item);
    // }
    _drawImage(ctx, img, x, y, width, height) {
        ctx.drawImage(img, x, y, width, height);
    }
}