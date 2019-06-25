import {
    // isNumber,
    // detectmob,
    isEmpty,
    // merge,
    // typeOf,
    // checkGeoJSON,
    // clearPushArray
} from '../../common/Util';
import Parameter from './Parameter';
// import Color from './../../common/Color';
// import EV from '../../common/ev'
// let isMobile = detectmob();
/**
 * 接头定义 参数解析类
 */
export default class MiddleOverlay extends Parameter {
    constructor(baseConfig, ops) {
        super(baseConfig,ops);
       
    }
    _tMouseleave() {
        this.tooltip.hide();
    }
    _tMousemove(event) {
        console.log('father _tMousemove')
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
            if (temp && this._overItem) {
                return;
            }
            this._overItem = temp;
            if (temp) {
                this._swopData(result.index, result.item);
            }
            this._eventType = 'mousemove';
            if (!isEmpty(this._styleConfig.mouseOver)) {
                this.refresh();
            }
            this._setTooltip(event);
        }

        if (temp) {
            this._map.setDefaultCursor('pointer');
        } else {
            this._map.setDefaultCursor('default');
        }
    }
    setTooltipIsShow(val) {
        this.setOptionStyle({
            tooltip: {
                show: val
            }
        });
        if (val === false) {
            this.toolTip.hide();
        }
        // this.toolTip._opts.show = val
    }
}