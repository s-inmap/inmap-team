import {
    HeatOverlay,
    HeatTileOverlay,
} from './transform/HeatOverlay';
import {
    GriddingOverlay
} from './transform/GriddingOverlay';
import {
    BoundaryOverlay
} from './transform/BoundaryOverlay';
import {
    CircuitOverlay
} from './transform/CircuitOverlay';
import {
    HoneycombOverlay
} from './transform/HoneycombOverlay';
import {
    PolymeOverlay
} from './transform/PolymeOverlay';
import {
    LablEvading
} from './transform/LablEvading';
let callbackList = {
    'HeatOverlay': HeatOverlay,
    'HeatTileOverlay': HeatTileOverlay,
    'GriddingOverlay': GriddingOverlay,
    'BoundaryOverlay': BoundaryOverlay,
    'CircuitOverlay': CircuitOverlay,
    'HoneycombOverlay': HoneycombOverlay,
    'PolymeOverlay': PolymeOverlay,
    'LablEvading': LablEvading
};

/**
 * 接收worker消息
 * @param {Event} e
 */
/*eslint-disable */
onmessage = function onmessage(e) {
    let data = e.data;
    callbackFun(data);
}
/*eslint-enable */
/**
 * 唯一生效队列控制全家对象
 */
let handler = {};
/**
 * worker方法执行解析
 */
let callbackFun = function (data) {
    let request = data.request;
    let classPath = request.classPath;
    let hashCode = request.hashCode;
    let msgId = request.msgId;
    let p = classPath.split('.'),
        index = 0,
        callback = callbackList;
    while (p[index]) {
        callback = callback[p[index]];
        index++;
        if (index >= p.length) {
            //唯一生效队列控制
            handler[classPath] = hashCode + '_' + msgId;
            //查找到执行方法，并执行方法
            let obj = callback(data);
            TDpost(obj.data, obj.client);
            return;
        }

        if (!callback) {
            throw new TypeError(`inMap : ${p[index - 1]} worker ${ classPath } is not a function`);
        }
    }
};


/**
 * push到web消息
 * @param {Object} data
 */
export let TDpost = function (data, client) {
    let opts = client;
    let request = client.request;
    let classPath = request.classPath;
    let hashCode = request.hashCode;
    let msgId = request.msgId;
    let handler = callbackList[classPath];
    //唯一生效队列判断
    if (handler && (handler != hashCode + '_' + msgId)) {
        return;
    }
    opts.response = {
        type: 'worker',
        data: data
    };
    postMessage(opts);
};
export const boundaryOverlay = BoundaryOverlay;