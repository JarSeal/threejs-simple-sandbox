import { getShip } from '../data/dev-ship.js';
import { getModule } from './modules/index.js';

class LoadTileMap {
    constructor(mtlLoader, objLoader, scene) {
        this.ship = [];
        this.init(mtlLoader, objLoader, scene);
    }

    init(mtlLoader, objLoader, scene) {
        let x, y,
            modules = [],
            rawShip = getShip(),
            xLength = rawShip.dims[0],
            yLength = rawShip.dims[1],
            tile,
            curModuleIndexes;
        this.ship = rawShip;
        // Add modules to main map
        for(y=0;y<yLength;y++) {
            for(x=0;x<xLength;x++) {
                tile = rawShip.floors[0].tileMap[y][x];
                if(tile.level) {
                    modules.push(getModule(tile.module[0], tile.level));
                    modules[tile.module[1]].curIndexes = [0,0];
                }
                if(tile.module) {
                    curModuleIndexes = modules[tile.module[1]].curIndexes;
                    this.ship.floors[0].tileMap[y][x] = Object.assign(
                        {},
                        tile,
                        modules[tile.module[1]].tilemap[curModuleIndexes[0]][curModuleIndexes[1]]
                    );
                    if(curModuleIndexes[1] === (modules[tile.module[1]].dims[1] - 1)) {
                        modules[tile.module[1]].curIndexes[0] += 1;
                        modules[tile.module[1]].curIndexes[1] = 0;
                    } else {
                        modules[tile.module[1]].curIndexes[1] += 1;
                    }
                } else {
                    this.ship.floors[0].tileMap[y][x] = {type:0};
                }
            }
        }
        //console.log(modules);
        console.log("this.ship",this.ship);
        // new Promise((resolve) => {
        //     mtlLoader.load('test-floor2.mtl', (materials) => {
        //         resolve(materials);
        //     })
        // })
        // .then((materials) => {
        //     materials.preload();
        //     objLoader.setMaterials(materials);
        //     objLoader.load('test-floor2.obj', (object) => {
        //         object.rotation.x = 1.5708;
        //         object.position.x = 31.5;
        //         object.position.y = 31.5;
        //         scene.add(object);
        //     })
        // });
    }

    getCurrentMap() {
        // return getShip();
        //return getModule(1,1);
    }
}

export default LoadTileMap