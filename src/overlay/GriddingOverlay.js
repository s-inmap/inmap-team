import {
    Parameter
} from './base/Parameter.js';
import {
    isArray
} from './../common/util';
import GriddingConfig from './../config/GriddingConfig.js';
import State from './../config/OnState';
export class GriddingOverlay extends Parameter {
    constructor(ops) {
        super(GriddingConfig, ops);
        this.state = null;
        this._drawSize = 0;
        this.delteOption();
    }
    parameterInit() {

    }
    setOptionStyle(ops) {
        this._setStyle(this.baseConfig, ops);
        this.drawMap();
    }
    setState(val) {
        this.state = val;
        this.eventConfig.onState(this.state);
    }
    delteOption() {
        this.styleConfig['selected'] = null;
    }
    refresh() {
        this.drawMap();
    }
    resize() {
        this.drawMap();
    }
    /**
     * 获得每个像素对应多少米	
     */
    getMpp() {
        let mapCenter = this.map.getCenter();
        let assistValue = 10;
        let cpt = new BMap.Point(mapCenter.lng, mapCenter.lat + assistValue);
        let dpx = Math.abs(this.map.pointToPixel(mapCenter).y - this.map.pointToPixel(cpt).y);
        return this.map.getDistance(mapCenter, cpt) / dpx;
    }
    drawMap() {

        let {
            normal,
            type
        } = this.styleConfig;
        let zoom = this.map.getZoom();
        let mapCenter = this.map.getCenter();
        let mapSize = this.map.getSize();

        let zoomUnit = Math.pow(2, 18 - zoom);
        let mercatorProjection = this.map.getMapType().getProjection();
        let mcCenter = mercatorProjection.lngLatToPoint(mapCenter);

        let nwMcX = mcCenter.x - mapSize.width / 2 * zoomUnit;
        let nwMc = new BMap.Pixel(nwMcX, mcCenter.y + mapSize.height / 2 * zoomUnit);
        let size = 0;
        if (normal.unit == 'px') {
            size = normal.size * zoomUnit;
        } else if (normal.unit == 'm') {
            let mpp = this.getMpp();
            if (mpp == 0 || isNaN(mpp)) {
                return;
            }
            size = (normal.size / mpp) * zoomUnit;
        } else {
            throw new TypeError('inMap: style.normal.unit must be is "meters" or "px" .');
        }

        let params = {
            points: this.points,
            size: size,
            type: type,
            nwMc: nwMc,
            zoomUnit: zoomUnit,
            mapSize: mapSize,
            mapCenter: mapCenter,
            zoom: zoom
        };
        this.setState(State.computeBefore);

        this.postMessage('GriddingOverlay.toRecGrids', params, (gridsObj) => {
            if (this.eventType == 'onmoving') {
                return;
            }
            let grids = gridsObj.grids;
            this.setState(State.conputeAfter);

            //清除
            this.clearCanvas();
            this.canvasResize();
            this.workerData = grids;
            this.setState(State.drawBefore);

            this.createColorSplit(grids);
            this.drawRec(size, zoomUnit, grids);
            this.setState(State.drawAfter);


        });
    }

    setPoints(points) {

        if (!isArray(points)) {
            throw new TypeError('inMap: data must be a Array');
        }
        this.points = points;

        this.drawMap();
    }
    _isMouseOver(mouseX, mouseY, x, y, w, h) {
        return !(mouseX < x || mouseX > x + w || mouseY < y || mouseY > y + h);
    }
    getTarget(x, y) {

        let grids = this.workerData;
        let gridStep = this._drawSize;
        let mapSize = this.map.getSize();
        for (let i in grids) {
            let sp = i.split('_');
            let item = grids[i];
            let x1 = parseFloat(sp[0]);
            let y1 = parseFloat(sp[1]);
            if (x > -gridStep && y > -gridStep && x < mapSize.width + gridStep && y < mapSize.height + gridStep) {
                if (this._isMouseOver(x, y, x1, y1, gridStep, gridStep)) {
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

    compileSplitList(data) {

        let colors = this.styleConfig.colors;
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
                backgroundColor: colors[i],

            });

        }

        this.styleConfig.splitList = split;
        this.setlegend(this.legendConfig, this.styleConfig.splitList);
    }
    createColorSplit(grids) {

        let data = [];
        for (let key in grids) {
            let count = grids[key].count;
            if (count > 0) {
                data.push({
                    name: key,
                    count: count
                });
            }

        }

        if (this.styleConfig.colors.length > 0) {
            this.compileSplitList(data);
        }

    }
    setlegendParams() {

    }
    setTooltip(event) {
        let item = this.overItem && this.overItem.list.length > 0 ? this.overItem : null;
        this.toolTip.render(event, item);
    }
    getColor(count) {
        let color = null;
        if (count == 0) {
            color = 'rgba(255,255,255,0)';
        } else {
            let style = this.setDrawStyle({
                count: count
            });
            color = style.backgroundColor;
        }
        return color;
    }
    drawRec(size, zoomUnit, grids) {

        let gridStep = this._drawSize = size / zoomUnit;
        let style = this.styleConfig.normal;
        let mapSize = this.map.getSize();

        for (let i in grids) {
            let sp = i.split('_');
            let x = sp[0];
            let y = sp[1];
            if (x > -gridStep && y > -gridStep && x < mapSize.width + gridStep && y < mapSize.height + gridStep) {
                let count = grids[i].count;

                let color = this.getColor(count);
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, gridStep - style.padding, gridStep - style.padding);

            }

        }
    }
}