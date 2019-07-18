import ImgOverlay from '../ImgOverlay';
import {
    isString,
    isEmpty,
    merge,
    typeOf
} from '../../common/Util.js';
import State from '../../config/OnStateConfig';
/*
 * 点的绘制
 */
export default class SSImgOverlay extends ImgOverlay {
    constructor(opts) {
        super(opts);
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
            this._loopDraw(this._ctx, this._selectItem.concat(overArr), true);
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
    _tMouseClick(event) {}
    
}