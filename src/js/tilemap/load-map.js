import { getShip } from '../data/dev-ship.js';
import { getModule } from './modules/index.js';

class LoadTileMap {
    constructor(mtlLoader, objLoader, scene, renderer) {
        this.ship = [];
        this.init(mtlLoader, objLoader, scene, renderer);
    }

    init(mtlLoader, objLoader, scene, renderer) {
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
                            pos: tile.pos,
                            color: tile.color,
                            id: moduleIndex
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
        
        //console.log("this.ship",this.ship);
// // instantiate a loader
// var loader = new THREE.TextureLoader();

// // load a resource
// loader.load(
// 	// resource URL
// 	'textures/land_ocean_ice_cloud_2048.jpg',

// 	// onLoad callback
// 	function ( texture ) {
// 		// in this example we create the material when the texture is loaded
// 		var material = new THREE.MeshBasicMaterial( {
// 			map: texture
// 		 } );
// 	},

// 	// onProgress callback currently not supported
// 	undefined,

// 	// onError callback
// 	function ( err ) {
// 		console.error( 'An error happened.' );
// 	}
// );
        let loader,
            loaderLength = modulesLoader.length;
        for(loader=0;loader<loaderLength;loader++) {
            (function(self, module) {
                new Promise((resolve) => {
                    mtlLoader.setMaterialOptions({side: THREE.DoubleSide,color:0xff0000});
                    mtlLoader.load(module.mtlFile, (materials) => {
                        resolve(materials);
                    })
                })
                .then((materials) => {
                    materials.preload();
                    materials.materials.Material.shininess = 10;
                    materials.materials.Material.bumpScale = 0.045;
                    //materials.materials.Material.bumpMap.minFilter = THREE.LinearFilter;
                    materials.materials.Material.bumpMap.anisotropy = renderer.getMaxAnisotropy();
                    //materials.materials.Material.map.minFilter = THREE.LinearFilter;
                    materials.materials.Material.map.anisotropy = renderer.getMaxAnisotropy();
                    // materials.materials.Material.displacementMap = THREE.ImageUtils.loadTexture('/images/objects/wall01-textures-displacement.png');
                    // materials.materials.Material.displacementScale = 5;
                    // materials.materials.Color = new THREE.MeshPhongMaterial({color: 0x0084BC});
                    // materials.materials.Color.bumpMap = THREE.ImageUtils.loadTexture('/images/objects/wall01-textures-bump.png');
                    // materials.materials.Color.bumpScale = 0.45;
                    // materials.materials.Material.bumpScale = 0.045;
                    // materials.materials.Material.color = new THREE.Color( 0xff0000 );
                    //materials.materials.Material.transparent = true;
                    // materials.materials.Material.alphaTest = 0.5;
                    // let planes = self.createDoorClippingPlane(scene, module.pos, module.color);
                    // materials.materials.Material.side = THREE.DoubleSide;
                    // materials.materials.Material.clipIntersection = true;
                    // materials.materials.Material.clippingPlanes = planes;
                    objLoader.setMaterials(materials);
                    console.log('materials',materials);
                    objLoader.load(module.objFile, (object) => {
                        object.rotation.x = 1.5708;
                        object.position.y = module.pos[0] + 0.5;
                        object.position.x = module.pos[1] + 0.5;
                        object.castShadow = true;
                        object.receiveShadow = true;
                        object.userData.moduleId = module.id;
                        // let planes = self.createDoorClippingPlane(scene, module.pos, module.color);
                        // object.children[0].material.side = THREE.DoubleSide;
                        // object.children[0].material.clipIntersection = true;
                        // object.children[0].material.clippingPlanes = planes;
                        console.log('Object',object)
                        scene.add(object);

                        let light = new THREE.PointLight( 0xffffff, 1, 11, 2);
                        light.position.set( module.pos[1], module.pos[0], 3 );
                        scene.add(light);
                        let sphereSize = 0.2;
                        let pointLightHelper = new THREE.PointLightHelper( light, sphereSize );
                        // scene.add( pointLightHelper );
                    });
                });
            })(this, modulesLoader[loader]);
        }
    }

    createDoorClippingPlane(scene, pos, color) {
        // pos[0] += 0.5;
        // pos[1] += 0.5;
        let clipPlanes;
        clipPlanes = [
            new THREE.Plane( new THREE.Vector3( 1, 0, 0 ).normalize(), -pos[1] - 10 ),
            new THREE.Plane( new THREE.Vector3( - 1, 0, 0 ).normalize(), pos[1] + 7 ),
            // new THREE.Plane( new THREE.Vector3( - 1, 0, 0 ).normalize(), pos[1]+3.5 + 12 ),
            // new THREE.Plane( new THREE.Vector3( 0, 1, 0 ).normalize(), -pos[0]-16.5 ),
            // new THREE.Plane( new THREE.Vector3( 0, 0, - 1 ).normalize(), 2 ),
        ];
        console.log('clipPlanes',pos);
        if(color === 0x00ff00) {
            console.log('green');
        } else {
            console.log('red',pos);
        }
        var helpers = new THREE.Group();
        helpers.add( new THREE.PlaneHelper( clipPlanes[ 0 ], 10, 0xff0000 ) );
        helpers.add( new THREE.PlaneHelper( clipPlanes[ 1 ], 10, 0xff00cc ) );
        // helpers.add( new THREE.PlaneHelper( clipPlanes[ 2 ], 10, color ) );
        // helpers.add( new THREE.PlaneHelper( clipPlanes[ 3 ], 10, color ) );
        // helpers.add( new THREE.PlaneHelper( clipPlanes[ 2 ], 10, 0x0000ff ) );
        helpers.visible = true;
        if(color == 0x00ff00) {
            
        }
        scene.add( helpers );
        return clipPlanes;
    }

    getCurrentMap() {
        // return getShip();
        //return getModule(1,1);
    }
}

export default LoadTileMap