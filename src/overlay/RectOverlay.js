import Parameter from './base/Parameter.js';
import Color from '../common/Color.js';
import {
    isArray,
    detectmob,
    isEmpty,
    merge,
    clearPushArray
} from '../common/util.js';
import RectConfig from '../config/RectConfig.js';
import State from '../config/OnStateConfig.js';


export default class RectOverlay extends Parameter {
    constructor(ops) {
        super(RectConfig, ops);
        this._state = null;
    }
    _setState(val) {
        this._state = val;
        this._eventConfig.onState.call(this, this._state);
    }
    draw() {
        this._toDraw();
    }
    _toDraw() {
        this._drawMap();
    }
    TInit() {

    }
    setOptionStyle(ops) {
        this._setStyle(this._baseConfig, ops);
        this.TInit();
        this.refresh();
    }
    refresh() {
        this._drawMap();
    }
    _drawMap() {
        this._clearData();
        if (this.lock) {
            return;
        }
        let {
            normal,
            type
        } = this._styleConfig;

        let zoom, mapType, mapSize, center;
        zoom = this._map.getZoom();
        mapType = this._map.getMapType();
        center = this._map.getCenter();
        mapSize = this._map.getSize();

        let zoomUnit = Math.pow(2, 18 - zoom);
        let mercatorProjection = mapType.getProjection();
        let mcCenter = mercatorProjection.lngLatToPoint(center);
        let size = normal.size * zoomUnit;
        let nwMcX = mcCenter.x - mapSize.width / 2 * zoomUnit;
        let nwMc = new BMap.Pixel(nwMcX, mcCenter.y + mapSize.height / 2 * zoomUnit);
        let params = {
            points: this._data,
            size: size,
            nwMc: nwMc,
            zoomUnit: zoomUnit,
            mapSize: mapSize,
            mapCenter: center,
            zoom: zoom
        };
        this._setState(State.computeBefore);

        this._postMessage('RectOverlay.pointsToPixels', params, (gridsObj) => {
            
            if (this._eventType == 'onmoving') {
                return;
            }
            let grids = gridsObj.points;
            this._setState(State.conputeAfter);

            //清除
            this._clearCanvas();
            this._canvasResize();

            this._setState(State.drawBefore);

            this.createColorSplit(grids);
            this.drawRec(size, zoomUnit, grids);
            this._setState(State.drawAfter);


        });
    }
    /**
     * 根据用户配置，设置用户绘画样式
     * @param {*} item 
     */
    setDrawStyle(item) {
        let normal = this._styleConfig.normal, //正常样式
            mouseOverStyle = this._styleConfig.mouseOver, //悬浮样式
            selectedStyle = this._styleConfig.selected; //选中样式
        let result = {};
        result = merge(result, normal);
        //区间样式
        let splitList = this._styleConfig.splitList;
        for (let i = 0; i < splitList.length; i++) {
            let condition = splitList[i];
            if (i == splitList.length - 1) {
                if (condition.end == null) {
                    if (item.count >= condition.start) {
                        result = this._mergeCondition(result, condition);
                        break;
                    }
                } else if (item.count >= condition.start && item.count <= condition.end) {
                    result = this._mergeCondition(result, condition);
                    break;
                }
            } else {
                if (item.count >= condition.start && item.count < condition.end) {
                    result = this._mergeCondition(result, condition);
                    break;
                }
            }
        }
        result = merge(result, item.style || {});

        if (mouseOverStyle && this._overItem && (JSON.stringify(this._overItem) == JSON.stringify(item))) {
            result = merge(result, mouseOverStyle, {
                backgroundColor: mouseOverStyle.backgroundColor || this.brightness(result.backgroundColor, 0.1)
            });
        }
        if (selectedStyle && this._selectItemContains(item)) {
            result = merge(result, selectedStyle);
        }
        //如果设置了shadowBlur的范围长度，并且也没有设置shadowColor，则shadowColor默认取backgroundColor值
        if (result.shadowBlur != null && result.shadowColor == null) {
            result['shadowColor'] = (new Color(result.backgroundColor)).getStyle();
        }
        if (result.opacity) {
            let color = new Color(result.backgroundColor);
            result.backgroundColor = color.getRgbaStyle(result.opacity);
        }
        if (result.borderOpacity) {
            let color = new Color(result.borderColor);
            result.borderColor = color.getRgbaStyle(result.borderOpacity);
        }
        return result;
    }
    setPoints(points) {
        if (points) {
            if (!isArray(points)) {
                throw new TypeError('inMap: data must be a Array');
            }
            this._data = points;
        } else {
            this._data = [];
        }
        clearPushArray(this._workerData, []);
        this._map && this._drawMap();
    }
    _getTarget(x, y) {
        let data = this._workerData;

        let grids = data.grids || [];

        let style = this._styleConfig.normal;
        let obj = {
            index: -1,
            item: null
        }
        for (let i = 0, len = grids.length; i < len; i++) {
            const item = grids[i],
                pixel = item.pixels;
            const x1 = pixel.swX - style.padding,
                y1 = pixel.neY - style.padding,
                x2 = pixel.neX - style.padding,
                y2 = pixel.swY - style.padding;
            //证明>=0证明在当前页面,并且在矩形范围内
            if (x1 >= 0 && y1 >= 0 && x2 >= 0 && y2 >= 0 && (x1 <= x && x <= x2 && y1 <= y && y <= y2)) {
                obj.index = i;
                obj.item = item;
                break;
            }
        }

        return obj;
    }

    compileSplitList(data) {
        let colors = this._styleConfig.splitList.length ? this._styleConfig.splitList : this._styleConfig.colors;
        if (colors.length < 0 || data.length <= 0) return;
        data = data.sort((a, b) => {
            return parseFloat(a.count) - parseFloat(b.count);
        });
        let mod = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];


        let colorMod = mod.slice(0, colors.length).reverse();
        let sunMod = colorMod.reduce((sum, val) => {
            return sum + val;
        }, 0);
        let split = [];
        let star = 0,
            end = 0,
            sign = 0,
            length = data.length;
        //开启自动配色
        // if (!this._styleConfig.splitList.length) {
        for (let i = 0; i < colorMod.length; i++) {
            if (split.length == 0) {
                star = data[0].count;
            } else {
                star = split[i - 1].end;
            }
            if (i == colorMod.length - 1) {
                end = null;
            } else {
                sign = parseInt((colorMod[i] / sunMod) * length) + sign;
                end = data[sign].count;
            }

            split.push({
                start: star,
                end: end,
                backgroundColor: typeof colors[i] === 'string' ? colors[i] : colors[i].backgroundColor,

            });

        }
        // }
        //  else {
        //     split=this._styleConfig.splitList;
        // }

        this._styleConfig.splitList = split;
        this._setlegend(this.legend, this._styleConfig.splitList);
    }
    createColorSplit(grids) {
        let data = [];
        for (let i = 0, len = grids.length; i < len; i++) {
            let count = grids[i]['count'];

            if (count > 0) {
                data.push({
                    name: '',
                    count: count
                });
            }
        }
        if (this._styleConfig.splitList.length > 0 || this._styleConfig.colors.length > 0) {
            this.compileSplitList(data);
        }
    }
    setlegendParams() {

    }
    getColor(item) {
        let color = null;
        if (item.count == 0) {
            color = 'rgba(255,255,255,0)';
        } else {
            let style = this._setDrawStyle(item,true);
            color = style.backgroundColor;
        }
        return color;
    }
    drawRec(size, zoomUnit, grids) {
        this._workerData.grids = [];
        let gridStep = size / zoomUnit;

        let style = this._styleConfig.normal;
        // console.time("绘制矩形");
        for (let i = 0, len = grids.length; i < len; i++) {
            const item = grids[i];
            const count = item.count;
            const _item = {
                pixels: item.pixel,
                count: count,
                data: item
            };
            const color = this.getColor(_item);
            this._ctx.fillStyle = color;
            this._ctx.fillRect(item.pixel.swX, item.pixel.neY, item.pixel.neX - item.pixel.swX - style.padding, item.pixel.swY - item.pixel.neY - style.padding);
            if (count > 0) {
                this._workerData.grids.push(_item);
            }
        }
        // console.timeEnd("绘制矩形");

    }
    _findIndexSelectItem(item) {
        let index = -1;
        if (item) {
            index = this._selectItem.findIndex(function(val) {
                return item && val && JSON.stringify(val) == JSON.stringify(item);
            });
        }
        return index;
    }
    // tMouseClick(event) {
    //     if (this._eventType == 'onmoving') return;
    //     this._eventType = event.type;
    //     let {
    //         multiSelect
    //     } = this._eventConfig;
    //     let result = this._getTarget(event.pixel.x, event.pixel.y);
    //     if (result.index == -1) {
    //         return;
    //     }
    //     let item = result.item;
    //     //判断是否二次点击表示取消选中
    //     const _item = this._selectItemContains(item);
    //     if (_item) {
    //         this._deleteSelectItem(item); //二次点击取消选中
    //     } else {
    //         if (multiSelect) {
    //             if (this._selectItemContains(item)) {
    //                 this._deleteSelectItem(item); //二次点击取消选中
    //             } else {
    //                 this._selectItem.push(result.item);
    //             }

    //         } else {
    //             this._selectItem = [result.item];
    //         }
    //     }


    //     this._swopData(result.index, item);
    //     this._eventConfig.onMouseClick(this._selectItem, event);

    //     this.refresh();
    //     if (isMobile) {
    //         this._overItem = item;
    //         this._setTooltip(event);
    //     }
    // }
    tMouseleave() {
        if (this.tooltipDom) {
            this.tooltipDom.style.display = 'none';
        }
        this._eventConfig.onMouseLeave();

    }
    // tMousemove(event) {
    //     if (this._eventType == 'onmoving') {
    //         return;
    //     }
    //     if (!this.tooltip.show && isEmpty(this._styleConfig.mouseOver)) {

    //         return;
    //     }

    //     let result = this._getTarget(event.pixel.x, event.pixel.y);
    //     let temp = result.item;

    //     if (temp != this._overItem) { //防止过度重新绘画
    //         this._overItem = temp;
    //         if (temp) {
    //             this._swopData(result.index, result.item);
    //         }
    //         this._eventType = 'mousemove';
    //         if (!isEmpty(this._styleConfig.mouseOver)) {
    //             this.refresh();
    //         }
    //     }
    //     if (temp) {
    //         this._map.setDefaultCursor('pointer');
    //     } else {
    //         this._map.setDefaultCursor('default');
    //     }

    //     this._setTooltip(event);
    //     this._eventConfig.onMouseOver(temp, event);
    // }
    /**
     * 设置选中
     * @param {*} exp  表达式
     */
    setSelectd(exp) {
        if (this._data.length > 0) {

            let filterFun = new Function('item', 'with(item){ if(item.data){return item.data.' + exp + '}else{ return item.' + exp + '} }');
            let temp = this._data.filter(filterFun);
            if (temp.length > 0 && this._workerData.grids.length > 0) {

                const selectItems = this._workerData.grids.filter(filterFun);
                const selectItem = selectItems[0] || {};
                const item = this._selectItemContains(selectItem);
                if (item) {
                    this._deleteSelectItem(selectItem); //二次点击取消选中
                } else {
                    if (this._eventConfig.multiSelect) {
                        if (item) {
                            this._deleteSelectItem(selectItem); //二次点击取消选中
                        } else {
                            this._selectItem.push(selectItem);
                        }

                    } else {
                        this._selectItem = [selectItem];
                    }
                }
                this.refresh();

            }
        }
    }
}