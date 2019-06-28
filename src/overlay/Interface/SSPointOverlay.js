/*
 * 点的绘制
 */
import PointOverlay from '../PointOverlay';
import {
    isEmpty,
    detectmob,
} from '../../common/Util.js';
export default class SSPointOverlay extends PointOverlay {
    constructor(opts) {
        super(opts);
        let mouseOver = opts.style.mouseOver;
        if (mouseOver === undefined || mouseOver.show === false) {
            this._mouseOverShow = false;
        } else if (mouseOver.show === undefined || mouseOver.show === true) {
            this._mouseOverShow = true;
        }
    }
    _getMpp() {
        let mapCenter = this._map.getCenter();
        let assistValue = 1;
        let cpt = new BMap.Point(mapCenter.lng, mapCenter.lat + assistValue);
        let dpx = Math.abs(this._map.pointToPixel(mapCenter).y - this._map.pointToPixel(cpt).y);
        return this._map.getDistance(mapCenter, cpt) / dpx;
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