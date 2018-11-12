import {
    pointToPixelWorker
} from '../../lib/pointToPixel';

/**
 * 数据集转换
  
  - - 转换前 - -
[{
        count: 1,
        lat: "24.3067",
        lng: "109.3949"
    },
    {
        count: 10,
        lat: "24.3219",
        lng: "109.4160"
    }
]
  - - 转换后 - -
  [{
        count: 1,
        lat: "24.3067",
        lng: "109.3949",
        pixel: {
            x: 23,
            y: 34
        }
    },
    {
        count: 10,
        lat: "24.3219",
        lng: "109.4160",
        pixel: {
            x: 23,
            y: 34
        }
    }
]
  */
const RectOverlay = {
    pointsToPixels(webObj) {
        webObj.request.data.points.forEach((val) => {
        // console.time("转换坐标为像素");
        // webObj.request.data.forEach((val) => {
            var ne_pixel = pointToPixelWorker({ lng: val.neY || 0, lat: val.neX || 0 }, webObj.request.map);
            var sw_pixel = pointToPixelWorker({ lng: val.swY || 0, lat: val.swX || 0 }, webObj.request.map);
            val['pixel'] = {
                'neX': ne_pixel.x,
                'neY': ne_pixel.y,
                'swX': sw_pixel.x,
                'swY': sw_pixel.y,
            }
            // val['geometry']['pixel'] = {
            //     'x': ne_pixel.x,
            //     'y': ne_pixel.y
            // }
        });
        // console.log('webObj is ',webObj)
        // console.timeEnd("转换坐标为像素");
        return webObj
    }
}

export default RectOverlay;