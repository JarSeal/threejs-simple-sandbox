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
            moduleIndex,
            curModuleIndexes,
            modulesLoader = [];
        this.ship = rawShip;
        // Add modules to main map
        for(y=0;y<yLength;y++) {
            for(x=0;x<xLength;x++) {
                tile = rawShip.floors[0].tileMap[y][x];
                if(tile.module) {
                    moduleIndex = tile.module[1];
                    if(tile.level) {
                        // first tile of module
                        modules.push(getModule(tile.module[0], tile.level));
                        modules[moduleIndex].curIndexes = [0,0];
                        tile = Object.assign(
                            {},
                            tile,
                            {dims: modules[moduleIndex].dims,
                             name: modules[moduleIndex].name,
                             objFile: modules[moduleIndex].objFile,
                             mtlFile: modules[moduleIndex].mtlFile}
                        );
                        modulesLoader.push({
                            moduleId: "module_"+tile.module[0]+"-"+tile.level,
                            objFile: modules[moduleIndex].objFile,
                            mtlFile: modules[moduleIndex].mtlFile,
                            pos: tile.pos
                        });
                    }
                    curModuleIndexes = modules[moduleIndex].curIndexes;
                    this.ship.floors[0].tileMap[y][x] = Object.assign(
                        {},
                        tile,
                        modules[moduleIndex].tilemap[curModuleIndexes[0]][curModuleIndexes[1]]
                    );
                    if(curModuleIndexes[1] === (modules[moduleIndex].dims[1] - 1)) {
                        modules[moduleIndex].curIndexes[0] += 1;
                        modules[moduleIndex].curIndexes[1] = 0;
                    } else {
                        modules[moduleIndex].curIndexes[1] += 1;
                    }
                } else {
                    this.ship.floors[0].tileMap[y][x] = {type:0};
                }
            }
        }
        console.log(modulesLoader);
        
        console.log("this.ship",this.ship);
        let loader,
            loaderLength = modulesLoader.length;
        for(loader=0;loader<loaderLength;loader++) {
            (function(module) {
                new Promise((resolve) => {
                    mtlLoader.load(module.mtlFile, (materials) => {
                        console.log('module',module);
                        resolve(materials);
                    })
                })
                .then((materials) => {
                    // materials.Material.shininess = 20;
                    materials.preload();
                    materials.materials.Material.shininess = 10;
                    objLoader.setMaterials(materials);
                    console.log('materials',materials.materials.Material);
                    objLoader.load(module.objFile, (object) => {
                        object.rotation.x = 1.5708;
                        object.position.y = module.pos[0] + 0.5;
                        object.position.x = module.pos[1] + 0.5;
                        object.castShadow = true;
                        object.receiveShadow = true;
                        scene.add(object);
                        let light = new THREE.PointLight( 0xffffff, 1, 8, 2);
                        light.position.set( module.pos[1] + 5, module.pos[0] + 5, 3 );
                        scene.add(light);
                        let sphereSize = 0.2;
                        let pointLightHelper = new THREE.PointLightHelper( light, sphereSize );
                        scene.add( pointLightHelper );
                    })
                });
            })(modulesLoader[loader]);
        }
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