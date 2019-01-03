import {
    isString,
    isFunction,
    isArray,
    merge
} from '../common/Util';
export default class ToolTip {
    constructor(toolDom) {
        this._dom = this._create(toolDom);
        this._tooltipTemplate = null;
        this._opts = {};
        this.hide();
    }
    _create(toolDom) {
        let dom = document.createElement('div');
        dom.classList.add('inmap-tooltip');
        toolDom.appendChild(dom);
        return dom;
    }
    _compileTooltipTemplate(formatter) {
        //语法解析 先暂时不支持ie11
        let RexStr = /\{|\}/g;
        formatter = formatter.replace(RexStr, function(MatchStr) {
            switch (MatchStr) {
                case '{':
                    return 'overItem.';
                case '}':
                    return '';
                default:
                    break;
            }
        });
        this._tooltipTemplate = new Function('overItem', 'return ' + formatter);
    }
    show(x, y) {
        let {
            left,
            top
        } = this._opts.offsets;

        let pixelY = y + top;

        let leftX = this.getPixelX(x, left);

        this._dom.style.cssText = `
            left:0;
            top:0;
            transform:translate3d(${leftX}px, ${pixelY}px, 0px);
            visibility: visible;
            display: block;
        `;
    }
    getPixelX(pixelX, offsetLeft) {
        //弹出框边缘智能控制
        let obj = this._dom.getBoundingClientRect(),
            domWidth = obj.width,
            screenWidth = document.documentElement.clientWidth;
        if (pixelX > screenWidth - domWidth) {
            this._dom.classList.add('arrow-right');
            this._dom.classList.remove('arrow-left');
            return pixelX - domWidth - offsetLeft;
        } else {
            this._dom.classList.add('arrow-left');
            this._dom.classList.remove('arrow-right');
            return pixelX + offsetLeft;
        }
    }
    showCenterText(text, x, y) {
        this._dom.innerHTML = text;
        this._dom.style.display = 'block';
        this._dom.style.visibility = 'hidden';
        let width = this._dom.offsetWidth;
        this._dom.style.left = x - (width / 2) + 'px';
        this._dom.style.top = y + 'px';
        this._dom.style.visibility = 'visible';
    }
    showText(text, x, y) {
        this._dom.innerHTML = text;
        this._dom.style.left = x + 'px';
        this._dom.style.top = y + 'px';
        this._dom.style.display = 'block';
    }
    hide() {
        this._dom.style.visibility = 'hidden';
    }
    setOption(opts) {
        let result = merge(this._opts, opts);
        let {
            formatter,
            customClass
        } = result;

        if (isString(formatter)) { //编译字符串
            this._compileTooltipTemplate(result.formatter);
        }

        if (this._opts.customClass) {
            this._dom.classList.remove(this._opts.customClass);
        }

        this._dom.classList.add(customClass);
        this._opts = result;
    }
    render(event, overItem) {
        if (!this._opts.show) return;
        if (overItem) {
            let formatter = this._opts.formatter;
            if (isFunction(formatter)) {
                this._dom.innerHTML = formatter(overItem, this._dom, () => {
                    //回调函数
                    this.hide();
                });
            } else if (isString(formatter)) {
                this._dom.innerHTML = this._tooltipTemplate(overItem);
            }
            if (overItem.geometry) {
                if (isArray(overItem.geometry.pixels)) {
                    this.show(event.offsetX, event.offsetY);
                } else {
                    let pixel = overItem.geometry.pixel,
                        x = pixel.x,
                        y = pixel.y;
                    this.show(x, y);
                }
            } else {
                this.show(overItem.pixels.neX, overItem.pixels.neY);
            }
        } else {
            this.hide();
        }

    }
    dispose() {
        this._dom.parentNode.removeChild(this._dom);
        this._tooltipTemplate = null;
        this._opts = null;
        this._dom = null;
    }
}