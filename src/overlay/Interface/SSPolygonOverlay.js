import PolygonOverlay from '../PolygonOverlay.js';
import {
    isString,
    isArray,
    isEmpty,
    merge,
    typeOf
} from '../../common/Util.js';

export default class SSPolygonOverlay extends PolygonOverlay {
    constructor(ops) {
        super(ops);
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
    _drawPolygon(data) {
        this._ctx.lineCap = 'round';
        this._ctx.lineJoin = 'round';
        this._ctx.miterLimit = 4;
        for (let i = 0; i < data.length; i++) {
            let item = data[i];
            let geometry = item.geometry;
            let pixels = geometry.pixels;
            let style = this._setDrawStyle(item, true, i);
            this._ctx.beginPath();
            this._ctx.shadowColor = style.shadowColor || 'transparent';
            this._ctx.shadowBlur = style.shadowBlur || 10;
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
                let style = this._setDrawStyle(item, true, i);
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
    _tMousemove(event) {
        if (this._eventType == 'onmoving') {
            return;
        }
        if (!this._tooltipConfig.show && isEmpty(this._styleConfig.mouseOver)) {
            return;
        }

        //核心逻辑是同一pixel下找到一次就不会再找
        // if(EV.getEV() === null){
        //     EV.setEV(event)
        // }
        // else{
        //     if(event.pixel.x === EV.getEV().pixel.x && event.pixel.y === EV.getEV().pixel.y){
        //         if(EV.getIsFind())
        //             return
        //     }
        //     else{
        //         EV.setEV(event)
        //         EV.setIsFind(false)
        //     }
        // }

        let result = this._getTarget(event.pixel.x, event.pixel.y);
        let temp = result.item;

        // if(EV.getIsFind()){
        //     return
        // }
        // if(temp){
        //     EV.setIsFind(true)
        // }
        if (temp != this._overItem) { //防止过度重新绘画
            this._overItem = temp;
            if (temp) {
                this._swopData(result.index, result.item);
            }
            this._eventType = 'mouseover';
            if (!isEmpty(this._styleConfig.mouseOver)) {
                this.refresh();
                if (this._eventConfig.onMouseOver) {
                    this._eventConfig.onMouseOver.call(this, this._overItem, event);
                }
            }
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
        this._setTooltip(event);
    }

    /**
     * 根据用户配置，设置用户绘画样式
     * @param {*} item 数据行
     * @param {*} otherMode  是否返回选中数据集的样式
     */
    _setDrawStyle(item, otherMode, i) {
        let normal = this._styleConfig.normal, //正常样式
            mouseOverStyle = this._styleConfig.mouseOver, //悬浮样式
            selectedStyle = this._styleConfig.selected; //选中样式
        let result = merge({}, normal);
        let count = parseFloat(item.count);
        //区间样式
        let splitList = this._styleConfig.splitList,
            len = splitList.length;
        if (len > 0 && typeOf(count) !== 'number') {
            throw new TypeError(`inMap: data index Line ${i}, The property count must be of type Number! about geoJSON, visit http://inmap.talkingdata.com/#/docs/v2/Geojson`);
        }

        for (let i = 0; i < len; i++) {
            let condition = splitList[i];
            if (i == splitList.length - 1) {
                if (condition.end == null) {
                    if (count >= condition.start) {
                        result = this._mergeCondition(result, condition);
                        break;
                    }
                } else if (count >= condition.start && count <= condition.end) {
                    result = this._mergeCondition(result, condition);
                    break;
                }
            } else {
                if (count >= condition.start && count < condition.end) {
                    result = this._mergeCondition(result, condition);
                    break;
                }
            }
        }
        result = merge(result, item.style || {});
        //支持正常状态单个围栏颜色自定义
        if(item.normalColor)
            result.backgroundColor = item.normalColor;
        if(mouseOverStyle){
            if (this._overItem == item) {
                result = merge(result, mouseOverStyle, {
                    backgroundColor: mouseOverStyle.backgroundColor || this._brightness(result.backgroundColor, 0.1)
                });
                if(item.mouseOverColor)
                    result.backgroundColor = item.mouseOverColor;
            }
        }
        
        if (otherMode && selectedStyle && this._selectItemContains(item)) {
            result = merge(result, selectedStyle);
        }
        //如果设置了shadowBlur的范围长度，并且也没有设置shadowColor，则shadowColor默认取backgroundColor值
        if (result.shadowBlur != null && result.shadowColor == null) {
            result['shadowColor'] = (new Color(result.backgroundColor)).getValue();
        }
        if (result.opacity) {
            let color = new Color(result.backgroundColor);
            result.backgroundColor = color.getRgbaValue(result.opacity);
        }
        if (result.borderOpacity) {
            let color = new Color(result.borderColor);
            result.borderColor = color.getRgbaValue(result.borderOpacity);
        }
     
        return result;
    }
}