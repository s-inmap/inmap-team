import HeatOverlay from '../../src/overlay/HeatOverlay';

describe('HeatOverlay ', () => {
    function createOverlay() {
        return new HeatOverlay({
            style: {
                radius: 10,  
                minScope: 0,
                maxScope: 1 
            },
            data: null,
        });
    }
    it('constructor ', () => {
        let overlay = createOverlay();
        expect(overlay.points).to.eql([]);
    });

    it('setData', () => {
        let overlay = createOverlay();
        overlay.setData(null);
        expect(overlay.points).to.eql([]);

        let data = [{
            "count": 4,
            "geometry": {
                "type": "Point",
                "coordinates": [117.306518554688, 38.5537719726562]
            }
        }];

        overlay.setData(data);
        expect(overlay.points).to.eql(data);
        expect(overlay.workerData).to.eql([]);

        overlay.setData(undefined);
        expect(overlay.points).to.eql([]);
        expect(overlay.workerData).to.eql([]);

        overlay.setData(data);
        expect(overlay.points).to.eql(data);
        expect(overlay.workerData).to.eql([]);


        overlay.setData(null);
        expect(overlay.points).to.eql([]);
        expect(overlay.workerData).to.eql([]);

    });

    it('setOptionStyle', () => {
        let overlay = createOverlay();
        expect(overlay.points).to.eql([]);
        expect(overlay.workerData).to.eql([]);

        let data = [{
            "count": 4,
            "geometry": {
                "type": "Point",
                "coordinates": [117.306518554688, 38.5537719726562]
            }
        }];
        overlay.setOptionStyle({
            style: {
                radius: 10, 
                minScope: 0,
                maxScope: 1 
            },
            data: data,
        });
        expect(overlay.points).to.eql(data);
        expect(overlay.workerData).to.eql([]);

        overlay.setOptionStyle({
            style: {
                radius: 10, 
                minScope: 0,
                maxScope: 1 
            },
            data: null,
        });

        expect(overlay.points).to.eql([]);
        expect(overlay.workerData).to.eql([]);

        overlay.setOptionStyle({
            style: {
                radius: 10, 
                minScope: 0,
                maxScope: 1 
            },
            data: data,
        });
        overlay.setOptionStyle({
            style: {
                radius: 10, 
                minScope: 0,
                maxScope: 1 
            }
        });
        expect(overlay.points).to.eql(data);
        expect(overlay.workerData).to.eql([]);

        overlay.setOptionStyle();
        expect(overlay.points).to.eql(data);
        expect(overlay.workerData).to.eql([]);
    });


});