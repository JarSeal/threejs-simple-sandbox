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
                            modules[moduleIndex]
                        );
                        modulesLoader.push(Object.assign(
                            {},
                            {
                                pos: tile.pos,
                                id: moduleIndex,
                                turn: tile.turn || 0
                            },
                            modules[moduleIndex]
                        ));
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
        
        console.log("this.ship",this.ship);
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
                    objLoader.setMaterials(materials);
                    console.log('materials',materials);
                    objLoader.load(module.objFile, (object) => {
                        let deg90 = 1.5708;
                        object.rotation.x = deg90;
                        console.log('MODULE',module);
                        if(module.turn !== 0) {
                            object.rotation.y = deg90 * module.turn;
                        }
                        object.position.y = module.pos[0] + module.aligners[module.turn][0];
                        object.position.x = module.pos[1] + module.aligners[module.turn][1];
                        object.castShadow = true;
                        object.receiveShadow = true;
                        object.userData.moduleId = module.id;
                        console.log('Object',object)
                        scene.add(object);

                        self.addLights(scene, module, objLoader);
                    });
                });
            })(this, modulesLoader[loader]);
        }
    }

    addLights(scene, module, objLoader) {
        let mainLights = module.lights.main,
            mainLight;
        let propLights = module.lights.props,
            propTypes = {};

        for(let i=0; i<mainLights.length; i++) {
            if(mainLights[i].type == "point") {
                mainLight = new THREE.PointLight(
                    mainLights[i].color,
                    mainLights[i].intensity,
                    mainLights[i].distance,
                    mainLights[i].decay
                );
                mainLight.position.set(
                    module.pos[1] + mainLights[i].aligners[module.turn][0],
                    module.pos[0] + mainLights[i].aligners[module.turn][1],
                    mainLights[i].z // TODO: THIS WILL NOT WORK WHEN MORE THAN ONE FLOOR IS INTRODUCED
                );
                scene.add(mainLight);
            }
            if(mainLights[i].helper) {
                scene.add(new THREE.PointLightHelper(mainLight, 0.1));
            }
        }
        for(let i=0; i<propLights.length; i++) {
            propTypes[propLights[i].type] = true;
        }

        if(propTypes.capsule) {
            objLoader.load("light-capsule.obj", (object) => {
                let deg90 = 1.5708,
                    newObject,geometry,material,mesh,glowMesh,outsideUniforms,insideUniforms,turn;
                for(let i=0; i<propLights.length; i++) {
                    newObject = object.clone();
                    material = new THREE.MeshLambertMaterial({color: propLights[i].color, emissive: propLights[i].color});
                    if(propLights[i].glow) {
                        geometry = new THREE.Geometry().fromBufferGeometry(newObject.children[0].geometry);
                        geometry.mergeVertices();
                        mesh = new THREE.Mesh(geometry, material);
                        if(module.turn == 1 || module.turn == 3) { mesh.rotation.z = deg90; }
                        mesh.position.y = module.pos[0] + propLights[i].aligners[module.turn][0];
                        mesh.position.x = module.pos[1] + propLights[i].aligners[module.turn][1];
                        mesh.position.z = propLights[i].z;
                        glowMesh = new THREE.glowShader.GeometricGlowMesh(mesh);
                        mesh.add(glowMesh.object3d);
                        outsideUniforms	= glowMesh.outsideMesh.material.uniforms;
                        outsideUniforms.glowColor.value.set(propLights[i].color);
                        outsideUniforms.coeficient.value = (0.0005);
                        outsideUniforms.power.value = (6.4);
                        insideUniforms	= glowMesh.insideMesh.material.uniforms;
                        insideUniforms.glowColor.value.set(propLights[i].color);
                    } else {
                        mesh = new THREE.Mesh(object.children[0].geometry, material);
                        propLights[i].turn ? turn = deg90 : turn = 0;
                        if(module.turn == 1 || module.turn == 3) {
                            mesh.rotation.z = deg90 + turn;
                        } else {
                            mesh.rotation.z = turn;
                        }
                        mesh.position.y = module.pos[0] + propLights[i].aligners[module.turn][0];
                        mesh.position.x = module.pos[1] + propLights[i].aligners[module.turn][1];
                        mesh.position.z = propLights[i].z;
                    }
                    scene.add(mesh);
                }
            });
        }

    }

    getCurrentMap() {
        // return getShip();
        //return getModule(1,1);
    }
}

export default LoadTileMap