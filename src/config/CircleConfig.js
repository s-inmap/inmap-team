export default {
    tooltip: {
        show: true,
        customClass: 'inmap-tooltip-black', //是否自定义样式
        offsets: {
            top: 5,
            left: 12,
        },
        formatter: '{count}'
    },
    legend: {
        show: false
    },
    style: {
        normal: {
            //圆配置
            size: 3,
            borderWidth: 0.1,
            backgroundColor: 'rgba(200, 200, 200, 0.5)',
            mergeCount: 1.5,
            unit: 'px', // px or m
            label: {
                show: false,
                font: '12px bold ',
                color: '#fff',
                offsets: {
                    top: 0,
                    left: 0
                }
            },
            //图片配置
            icon: null,
            width: 0,
            height: 0,
            offsets: {
                top: 0,
                left: 0
            }
        },
        mouseOver: {

        },
        selected: {

        },
        colors: [],
        splitList: [],
    },
    data: [],
    checkDataType: {
        name: false,
        count: false
    },
    selected: [], //设置选中
    event: {
        emitEvent: true,
        multiSelect: false, //是否支持多选
        onMouseClick() {},
        onMouseOver() {},
        onState() {}
    }
};