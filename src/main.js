import './lib/require-babel-polyfill.js';

// import LabelOverlay from './overlay/LabelOverlay';
// import PointOverlay from './overlay/PointOverlay';
import SSPointOverlay from './overlay/Interface/SSPointOverlay';
import PieOverlay from './overlay/PieOverlay';

// import GriddingOverlay from './overlay/GriddingOverlay';
// import PolygonOverlay from './overlay/PolygonOverlay';
import SSPolygonOverlay from './overlay/Interface/SSPolygonOverlay';
import RectOverlay from './overlay/RectOverlay';

// import HeatOverlay from './overlay/HeatOverlay';
// import LineStringOverlay from './overlay/LineStringOverlay';

// import HoneycombOverlay from './overlay/HoneycombOverlay';
// import ImgOverlay from './overlay/ImgOverlay';
import SSImgOverlay from './overlay/Interface/SSImgOverlay';
// import MoveLineOverlay from './overlay/MoveLineOverlay';
// import PointAnimationOverlay from './overlay/PointAnimationOverlay';
// import LineStringAnimationOverlay from './overlay/LineStringAnimationOverlay';
// import PolygonEditorOverlay from './overlay/PolygonEditorOverlay/index';
// import MaskOverlay from './overlay/MaskOverlay';
import Map from './map/index';
import * as utils from './common/Util';
import WorkerMrg from './common/WorkerMrg';
import config from './config/Config';
import MarkerClusterer from './lib/markerClusterer.js';

let version = VERSION;
console.log(`inMap v${version}`);
const inMap = {
    version,
    utils,
    Map,
    // LabelOverlay,
    // PointOverlay,
    SSPointOverlay,
    PieOverlay,
    // GriddingOverlay,
    // PolygonOverlay,
    SSPolygonOverlay,
    RectOverlay,
    // PolygonEditorOverlay,
    // HeatOverlay,
    // LineStringOverlay,
    // HoneycombOverlay,
    // ImgOverlay,
    SSImgOverlay,
    // MoveLineOverlay,
    // PointAnimationOverlay,
    // LineStringAnimationOverlay,
    WorkerMrg,
    // MaskOverlay,
    config,
    MarkerClusterer
};
export {
    version,
    utils,
    Map,
    // LabelOverlay,
    // PointOverlay,
    SSPointOverlay,
    PieOverlay,
    // GriddingOverlay,
    // PolygonOverlay,
    SSPolygonOverlay,
    RectOverlay,
    // PolygonEditorOverlay,
    // HeatOverlay,
    // LineStringOverlay,
    // HoneycombOverlay,
    // ImgOverlay,
    SSImgOverlay,
    // MoveLineOverlay,
    // PointAnimationOverlay,
    // LineStringAnimationOverlay,
    WorkerMrg,
    // MaskOverlay,
    config,
    MarkerClusterer
};
export default inMap;