import {
    CanvasOverlay
} from './base/CanvasOverlay';
import {
    merge,
    isArray
} from './../common/util';

import HeatConfig from './../config/HeatConfig';
import State from './../config/OnState';
export class HeatOverlay extends CanvasOverlay {
    constructor(ops) {
        super(ops);
        this.points = [];
        this._setStyle(HeatConfig, ops);
        this.delteOption();
        this.state = null;
    }
    resize() {
        this.drawMap();
    }
    _setStyle(config, ops) {
        ops = ops || {};
        let option = merge(config, ops);
        this.style = option.style;
        this.event = option.event;
        this.gradient = option.style.gradient;
        this.points = ops.data ? option.data : this.points;
        this.tMapStyle(option.skin);

    }
    setOptionStyle(ops) {
        this._setStyle(HeatConfig, ops);
        this.delteOption();
        this.drawMap();
    }
    setState(val) {
        this.state = val;
        this.event.onState(this.state);
    }
    /**
     * 屏蔽参数
     */
    delteOption() {
        this.tooltip = {
            show: false
        };
        this.legend = {
            show: false
        };
    }
    setPoints(points) {
        if (!isArray(points)) {
            throw new TypeError('inMap :data must be a Array');
        }
        this.points = points;
        this.drawMap();
    }
    getMax() {
        let normal = this.style.normal;
        normal.maxValue = 0;
        for (let i = 0, len = this.points.length; i < len; i++) {
            if (this.points[i].count > normal.maxValue) {
                normal.maxValue = this.points[i].count;
            }
        }
    }
    drawMap() {
        this.setState(State.computeBefore);

        this.postMessage('HeatOverlay.pointsToPixels', this.points, (pixels) => {

            if (this.eventType == 'onmoving') {
                return;
            }
            this.setState(State.conputeAfter);

            this.clearCanvas();
            this.canvasResize();
            this.setState(State.drawBefore);

            this.workerData = pixels;
            this.refresh();
            this.setState(State.drawAfter);


        });
    }
    refresh() {
        let normal = this.style.normal;
        let container = this.container;
        if (normal.maxValue == 0) {
            this.getMax();
        }
        if (container.width <= 0) {
            return;
        }

        let ctx = this.ctx;
        for (let i = 0, len = this.workerData.length; i < len; i++) {
            let item = this.workerData[i];
            let opacity = (item.count - normal.minValue) / (normal.maxValue - normal.minValue);
            opacity = opacity > 1 ? 1 : opacity;
            this.drawPoint(item.pixel.x, item.pixel.y, normal.radius, opacity);
        }

        let palette = this.getColorPaint();

        let img = ctx.getImageData(0, 0, container.width, container.height);
        let imgData = img.data;


        let max_opacity = normal.maxOpacity * 255;
        let min_opacity = normal.minOpacity * 255;
        //权重区间
        let max_scope = (normal.maxScope > 1 ? 1 : normal.maxScope) * 255;
        let min_scope = (normal.minScope < 0 ? 0 : normal.minScope) * 255;
        let len = imgData.length;
        for (let i = 3; i < len; i += 4) {
            let alpha = imgData[i];
            let offset = alpha * 4;
            if (!offset) {
                continue;
            }
            imgData[i - 3] = palette[offset];
            imgData[i - 2] = palette[offset + 1];
            imgData[i - 1] = palette[offset + 2];

            // 范围区间
            if (imgData[i] > max_scope) {
                imgData[i] = 0;
            }
            if (imgData[i] < min_scope) {
                imgData[i] = 0;
            }

            // 透明度
            if (imgData[i] > max_opacity) {
                imgData[i] = max_opacity;
            }
            if (imgData[i] < min_opacity) {
                imgData[i] = min_opacity;
            }
        }


        ctx.putImageData(img, 0, 0, 0, 0, container.width, container.height);
    }
    drawPoint(x, y, radius, opacity) {
        let ctx = this.ctx;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        let gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
    }

    getColorPaint() {
        let gradientConfig = this.gradient;
        let paletteCanvas = document.createElement('canvas');
        let paletteCtx = paletteCanvas.getContext('2d');

        paletteCanvas.width = 256;
        paletteCanvas.height = 1;

        let gradient = paletteCtx.createLinearGradient(0, 0, 256, 1);
        for (let key in gradientConfig) {
            gradient.addColorStop(key, gradientConfig[key]);
        }

        paletteCtx.fillStyle = gradient;
        paletteCtx.fillRect(0, 0, 256, 1);
        return paletteCtx.getImageData(0, 0, 256, 1).data;
    }

}