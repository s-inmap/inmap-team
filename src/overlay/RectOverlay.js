import {
    Parameter
} from './base/Parameter.js';
import {
    isArray,
    detectmob,
    isEmpty,
    isFunction,
    isString,
    merge
} from './../common/util';
import RectConfig from './../config/RectConfig.js';
import State from './../config/OnState';
let isMobile = detectmob();
export class RectOverlay extends Parameter {
    constructor(ops) {
        super(RectConfig, ops);
        // this.delteOption();
    }
    TInit() {

    }
    setOptionStyle(ops) {
        this._setStyle(this.baseConfig, ops);
        this.TInit();
        this.refresh();
    }
    delteOption() {
        this.style['selected'] = null;
    }
    refresh() {
        this.drawMap();
    }
    resize() {
        this.drawMap();
    }
    drawMap() {
        if (this.lock) {
            return;
        }
        let {
            normal,
            type
        } = this.style;
        let zoom = this.map.getZoom();
        let zoomUnit = Math.pow(2, 18 - zoom);
        let mercatorProjection = this.map.getMapType().getProjection();
        let mcCenter = mercatorProjection.lngLatToPoint(this.map.getCenter());
        let size = normal.size * zoomUnit;
        let nwMcX = mcCenter.x - this.map.getSize().width / 2 * zoomUnit;
        let nwMc = new BMap.Pixel(nwMcX, mcCenter.y + this.map.getSize().height / 2 * zoomUnit);
        let params = {
            points: this.points,
            size: size,
            nwMc: nwMc,
            zoomUnit: zoomUnit,
            mapSize: this.map.getSize(),
            mapCenter: this.map.getCenter(),
            zoom: zoom
        };

        this.event.onState(State.computeBefore);

        this.postMessage('RectOverlay.pointsToPixels', params, (gridsObj) => {
            if (this.eventType == 'onmoving') {
                return;
            }

            let grids = gridsObj.points;
            this.event.onState(State.conputeAfter);

            //清除
            this.clearCanvas();
            this.canvasResize();

            this.setWorkerData({
                size: size,
                zoomUnit: zoomUnit,
                grids: []
            });
            this.event.onState(State.drawBefore);

            this.createColorSplit(grids);
            this.drawRec(size, zoomUnit, grids);
            this.event.onState(State.drawAfter);


        });
    }
    /**
     * 根据用户配置，设置用户绘画样式
     * @param {*} item 
     */
    setDrawStyle(item) {
        let normal = this.style.normal, //正常样式
            mouseOverStyle = this.style.mouseOver, //悬浮样式
            selectedStyle = this.style.selected; //选中样式
        let result = {};
        result = merge(result, normal);
        //区间样式
        let splitList = this.style.splitList;
        for (let i = 0; i < splitList.length; i++) {
            let condition = splitList[i];
            if (i == splitList.length - 1) {
                if (condition.end == null) {
                    if (item.count >= condition.start) {
                        result = this.mergeCondition(result, condition);
                        break;
                    }
                } else if (item.count >= condition.start && item.count <= condition.end) {
                    result = this.mergeCondition(result, condition);
                    break;
                }
            } else {
                if (item.count >= condition.start && item.count < condition.end) {
                    result = this.mergeCondition(result, condition);
                    break;
                }
            }
        }
        result = merge(result, item.style || {});

        if (mouseOverStyle && this.overItem && (JSON.stringify(this.overItem) == JSON.stringify(item))) {
            result = merge(result, mouseOverStyle, {
                backgroundColor: mouseOverStyle.backgroundColor || this.brightness(result.backgroundColor, 0.1)
            });
        }
        if (selectedStyle && this.selectItemContains(item)) {
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

        if (!isArray(points)) {
            throw new TypeError('data must be a Array');
        }
        this.points = points;

        this.drawMap();
    }
    getTarget(x, y) {
        let data = this.workerData;
        let zoomUnit = data.zoomUnit;

        let grids = data.grids || [];

        let style = this.style.normal;
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
        let colors = this.style.splitList.length ? this.style.splitList : this.style.colors;
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
        // if (!this.style.splitList.length) {
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
        //     split=this.style.splitList;
        // }

        this.style.splitList = split;
        this.setlegend(this.legend, this.style.splitList);
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

            if (this.style.splitList.length > 0 || this.style.colors.length > 0) {
                this.compileSplitList(data);
            }

        }
    }
    setlegendParams() {

    }
    getColor(item) {
        let color = null;
        if (item.count == 0) {
            color = 'rgba(255,255,255,0)';
        } else {
            let style = this.setDrawStyle(item);
            color = style.backgroundColor;
        }
        return color;
    }
    drawRec(size, zoomUnit, grids) {
        this.workerData.grids = [];
        let gridStep = size / zoomUnit;

        let style = this.style.normal;
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
            this.ctx.fillStyle = color;
            this.ctx.fillRect(item.pixel.swX, item.pixel.neY, item.pixel.neX - item.pixel.swX - style.padding, item.pixel.swY - item.pixel.neY - style.padding);
            if (count > 0) {
                this.workerData.grids.push(_item);
            }
        }
        // console.timeEnd("绘制矩形");

    }
    findIndexSelectItem(item) {
        let index = -1;
        if (item) {
            index = this.selectItem.findIndex(function(val) {
                return item && val && JSON.stringify(val) == JSON.stringify(item);
            });
        }
        return index;
    }
    tMouseClick(event) {
        if (this.eventType == 'onmoving') return;
        this.eventType = event.type;
        let {
            multiSelect
        } = this.event;
        let result = this.getTarget(event.pixel.x, event.pixel.y);
        if (result.index == -1) {
            return;
        }
        let item = result.item;
        //判断是否二次点击表示取消选中
        const _item = this.selectItemContains(item);
        if (_item) {
            this.deleteSelectItem(item); //二次点击取消选中
        } else {
            if (multiSelect) {
                if (this.selectItemContains(item)) {
                    this.deleteSelectItem(item); //二次点击取消选中
                } else {
                    this.selectItem.push(result.item);
                }

            } else {
                this.selectItem = [result.item];
            }
        }


        this.swopData(result.index, item);
        this.event.onMouseClick(this.selectItem, event);

        this.refresh();
        if (isMobile) {
            this.overItem = item;
            this.setTooltip(event);
        }
    }
    tMouseleave() {
        if (this.tooltipDom) {
            this.tooltipDom.style.display = 'none';
        }
        this.event.onMouseLeave();

    }
    tMousemove(event) {
        if (this.eventType == 'onmoving') {
            return;
        }
        if (!this.tooltip.show && isEmpty(this.style.mouseOver)) {

            return;
        }

        let result = this.getTarget(event.pixel.x, event.pixel.y);
        let temp = result.item;

        if (temp != this.overItem) { //防止过度重新绘画
            this.overItem = temp;
            if (temp) {
                this.swopData(result.index, result.item);
            }
            this.eventType = 'mousemove';
            if (!isEmpty(this.style.mouseOver)) {
                this.refresh();
            }
        }
        if (temp) {
            this.map.setDefaultCursor('pointer');
        } else {
            this.map.setDefaultCursor('default');
        }

        this.setTooltip(event);
        this.event.onMouseOver(temp, event);
    }
    /**
     * 设置选中
     * @param {*} exp  表达式
     */
    setSelectd(exp) {
        if (this.points.length > 0) {

            let filterFun = new Function('item', 'with(item){ if(item.data){return item.data.' + exp + '}else{ return item.' + exp + '} }');
            let temp = this.points.filter(filterFun);
            if (temp.length > 0 && this.workerData.grids.length > 0) {

                const selectItems = this.workerData.grids.filter(filterFun);
                const selectItem = selectItems[0] || {};
                const item = this.selectItemContains(selectItem);
                if (item) {
                    this.deleteSelectItem(selectItem); //二次点击取消选中
                } else {
                    if (this.event.multiSelect) {
                        if (item) {
                            this.deleteSelectItem(selectItem); //二次点击取消选中
                        } else {
                            this.selectItem.push(selectItem);
                        }

                    } else {
                        this.selectItem = [selectItem];
                    }
                }
                this.refresh();

            }
        }
    }

}