export default {
    tooltip: {
        show: false,
        position: 'top',
        formatter: '{count}',
        offsets: {
            top: 5,
            left: 12,
        },
    },
    legend: {
        show: true,
        title: '图例'
    },
    style: {
        type: 'svg', //sum svg
        colors: ['rgba(31,98,1,1)',
            'rgba(95,154,4,1)',
            'rgba(139,227,7,1)',
            'rgba(218,134,9,1)',
            'rgba(220,54,6,1)',
            'rgba(218,2,8,1)',
            'rgba(148,1,2,1)',
            'rgba(92,1,0,1)'
        ],
        splitList:[],
        normal: {
            backgroundColor: 'rgba(200, 200, 200, 0.5)',
            padding: 1,
            size: 50,
            label: {
                show: false, // 是否显示
                font: '12px sans-serif',
                shadowBlur: 0,
                lineWidth: 1,
                color: 'rgba(75,80,86,1)',
            },
        },
        mouseOver: {


        },
        selected: {

        }

    },
    lock: false, //默认mouseMove加载缓存数据,true则时时请求
    data: [],
    checkDataType: {
        name: false,
        count: false
    },
    event: {
        emitEvent: true,
        multiSelect: false,
        onState() {},
        onMouseClick() {},
        onMouseOver(){},
        onMouseLeave(){}
    }
};