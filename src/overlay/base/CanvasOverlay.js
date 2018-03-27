import BaseClass from './BaseClass';
import {
    setDevicePixelRatio,
    isString,
    isObject
} from './../../common/util';
import {
    WhiteLover,
    Blueness
} from './../../config/MapStyle';
let zIndex = 1;

export class CanvasOverlay extends BaseClass {
    constructor(opts) {
        super();
        this.ctx = null; //canvas对象
        this.eventType = 'moveend';
        this.map = null;
        this.tOnResize = this.tOnResize.bind(this);
        this.tOnMoveend = this.tOnMoveend.bind(this);
        this.tOnZoomstart = this.tOnZoomstart.bind(this);
        this.tOnZoomend = this.tOnZoomend.bind(this);
        this.tOnMoving = this.tOnMoving.bind(this);
        this.tMousemove = this.tMousemove.bind(this);
        this.tMouseClick = this.tMouseClick.bind(this);
        this.devicePixelRatio = window.devicePixelRatio;
        this.repaintEnd = opts && opts.repaintEnd; //重绘回调
        this.animationFlag = true;
    }
    initialize(map) {
        let me = this;
        this.map = map;
        this.container = document.createElement('canvas');
        this.ctx = this.container.getContext('2d');
        this.container.style.cssText = 'position:absolute;left:0;top:0;z-index:' + (zIndex++) + ';';
        map.getPanes().mapPane.appendChild(this.container);
        this.setCanvasSize();
        map.addEventListener('resize', me.tOnResize);
        map.addEventListener('moveend', me.tOnMoveend);
        map.addEventListener('moving', me.tOnMoving);
        map.addEventListener('zoomstart', me.tOnZoomstart);
        map.addEventListener('zoomend', me.tOnZoomend);
        map.addEventListener('mousemove', me.tMousemove);
        map.addEventListener('click', me.tMouseClick);
        this.TInit();
        return this.container;

    }
    tMapStyle(skin) {
        let styleJson = null;
        if (isString(skin)) {
            styleJson = skin == 'Blueness' ? Blueness : WhiteLover;
        } else if (isObject(skin)) {
            styleJson = skin;
        }
        skin && this.map && this.map.setMapStyle({
            styleJson: styleJson
        });
    }
    tOnResize(event) {
        this.setCanvasSize();
        this.tDraw(this, event);
    }
    tOnMoveend(event) {
        this.animationFlag = true;
        this.eventType = event.type;
    }
    tOnZoomstart() {
        this.animationFlag = false;
        this.clearCanvas();
    }
    tOnZoomend(e) {
        this.animationFlag = true;
        this.eventType = e.type;
    }
    tOnMoving(e) {
        this.animationFlag = false;
        this.eventType = e.type;
    }
    tMousemove() {

        //抽象方法 子类去实现
    }
    TInit() {

        //抽象方法 子类去实现
    }
    draw() {
        // debugger
        this.resize();
    }
    tMouseClick() {
        //抽象方法 子类去实现
    }
    tDraw(me, event) {
        this.eventType = event.type;
        me.resize();
        this.repaintEnd && this.repaintEnd(this); //重绘回调
        me.keysss = true;
    }
    resize() {
        //  抽象方法 子类去实现
    }
    canvasResize() {
        let map = this.map;
        let container = this.container;
        let point = map.getCenter();
        let size = map.getSize();
        let pixel = map.pointToOverlayPixel(point);
        container.style.left = (pixel.x - size.width / 2) + 'px';
        container.style.top = (pixel.y - size.height / 2) + 'px';
    }

    clearCanvas() {
        let size = this.map.getSize();
        this.getContext().clearRect(0, 0, size.width, size.height); //调整画布
    }
    setCanvasSize() {
        let size = this.map.getSize();
        this.container.width = size.width;
        this.container.height = size.height;
        setDevicePixelRatio(this.ctx);
    }
    getContext() {
        return this.ctx;
    }
    /**
     * 设置overlay z-index
     */
    setZIndex(_zIndex) {
        this.container.style.zIndex = _zIndex;
    }
    /**
     * 清除缓存
     */
    Tclear() {

    }
    Tdispose() {

    }
    /**
     * 对象销毁
     */
    dispose() {

        this.map.removeEventListener('resize', this.tOnResize);
        this.map.removeEventListener('moveend', this.tOnMoveend);
        this.map.removeEventListener('zoomstart', this.tOnZoomstart);
        this.map.removeEventListener('zoomend', this.tOnZoomend);
        this.map.removeEventListener('moving', this.tOnMoving);
        this.map.removeEventListener('mousemove', this.tMousemove);
        this.map.removeEventListener('click', this.tMouseClick);
        this.Tclear();
        this.Tdispose();
        this.map.removeOverlay(this);


    }
}