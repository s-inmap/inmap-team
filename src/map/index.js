import {
    isString,
    merge,
    isArray
} from './../common/Util';
import {
    WhiteLover,
    Blueness
} from './../config/MapStyleConfig';
import MapZoom from './mapZoom';
import Toolbar from './Toolbar';
import inmapConfig from './../config/InmapConfig';
import MultiOverlay from '../overlay/base/MultiOverlay';
import './map.less';

export default class Map {
    constructor(ops) {
        this._map = null;
        this._option = merge(inmapConfig, ops);
        this._create();
    }
    _tMapStyle(map, skin) {
        let styleJson = null;
        if (isString(skin)) {
            styleJson = skin == 'Blueness' ? Blueness : WhiteLover;
        } else if (isArray(skin)) {
            styleJson = skin;
        }
        skin && map && map.setMapStyle({
            styleJson: styleJson
        });
    }
    _create() {
        let id = this._option.id;

        let mapDom = isString(id) ? document.getElementById(id) : id;
        let bmap = new BMap.Map(mapDom, {
            enableMapClick: false
        });
        bmap.enableScrollWheelZoom(); // 启用滚轮放大缩小
        bmap.disableDoubleClickZoom();
        bmap.enableKeyboard();

        //设置皮肤
        this._tMapStyle(bmap, this._option.skin);

        bmap._inmapToolBar = new Toolbar(mapDom);
        let center = this._option.center;

        bmap.centerAndZoom(new BMap.Point(center[0], center[1]), this._option.zoom.value);
        bmap.setMinZoom(this._option.zoom.min);
        bmap.setMaxZoom(this._option.zoom.max);
        if (this._option.zoom.show) {
            //添加地图级别工具条
            let mapZoom = new MapZoom(bmap, mapDom, this._option.zoom);
            bmap.addEventListener('zoomend', () => {
                mapZoom.setButtonState();
            });
        }

        this._map = bmap;
    }
    getMap() {
        return this._map;
    }
    add(overlay) {
        if (overlay._isDispose) {
            throw new TypeError('inMap: overlay has been destroyed.');
        } else if (overlay instanceof MultiOverlay) {
            overlay._init(this._map);
        } else {
            this._map.addOverlay(overlay);
        }

    }
    remove(overlay) {
        if (overlay && !overlay._isDispose) {
            overlay.dispose();
        }
        overlay = null;
    }

}