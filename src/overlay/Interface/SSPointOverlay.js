/*
 * 点的绘制
 */
import PointOverlay from '../PointOverlay';
import {
    isEmpty
} from '../../common/Util.js';
import State from '../../config/OnStateConfig';
export default class SSPointOverlay extends PointOverlay {
    constructor(opts) {
        super(opts);
        let mouseOver = opts.style.mouseOver;
        if (mouseOver === undefined || mouseOver.show === false) {
            this._mouseOverShow = false;
        } else if (mouseOver.show === undefined || mouseOver.show === true) {
            this._mouseOverShow = true;
        }

        this._mouseLayer = null;
    }
    setZIndex(zIndex) {
        this._zIndex = zIndex;
        if (this._container) this._container.style.zIndex = this._zIndex;
    }
    _parameterInit() {
        this._initLegend();
    }
    _getMpp() {
        let mapCenter = this._map.getCenter();
        let assistValue = 1;
        let cpt = new BMap.Point(mapCenter.lng, mapCenter.lat + assistValue);
        let dpx = Math.abs(this._map.pointToPixel(mapCenter).y - this._map.pointToPixel(cpt).y);
        return this._map.getDistance(mapCenter, cpt) / dpx;
    }
    _drawMouseLayer() {
        let overArr = this._overItem ? [this._overItem] : [];
        if (this.getRenderData().length > 0) {
            this._loopDraw(this._ctx, this._selectItem.concat(overArr), true);
        }
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
        if (this._styleConfig.normal.label.show) {
            this._drawLabel(this._ctx, this._workerData);
        }
        this._drawMouseLayer();
        this._setState(State.drawAfter);
    }
    _Tdispose() {
        this._batchesData && this._batchesData.clear();
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