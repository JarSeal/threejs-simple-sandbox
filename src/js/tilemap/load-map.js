import GLTFLoader from 'three-gltf-loader';
import { getShip } from '../data/dev-ship.js';
import { getModule } from './modules/index.js';

class LoadTileMap {
    constructor(mtlLoader, objLoader, scene, renderer, sceneState) {
        this.ship = [];
        this.mapLengths = [64, 64];
        this.init(mtlLoader, objLoader, scene, renderer, sceneState);
    }

    init(mtlLoader, objLoader, scene, renderer, sceneState) {
        let m,
            floor = 0,
            rawShip = getShip(),
            modules = rawShip.floors[floor].modules,
            modulesLength = modules.length,
            modulesLoader = [],
            turn;
        
        this.ship = this.createTileMap(rawShip, this.mapLengths, floor);
        this.createClickableTiles(scene);
        sceneState.moduleMap = rawShip;
        sceneState.shipMap = this.ship;
        sceneState.astarMap = this.createAstarMap(this.ship, sceneState);

        // Create modulesLoader (loads the 3D assets)
        for(m=0; m<modulesLength; m++) {
            turn = modules[m].turn || 0;
            modulesLoader.push(Object.assign(
                {},
                {
                    pos: modules[m].pos,
                    type: modules[m].module[0],
                    index: modules[m].module[1],
                    turn: turn
                },
                getModule(modules[m].module[0], modules[m].level, turn)
            ));
        }

        // console.log("this.ship",this.ship);

        let loader,
            loaderLength = modulesLoader.length,
            uvs;
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
                    materials.materials.Material.bumpScale = 0.145;

                    materials.materials.Material.lightMap = new THREE.TextureLoader().load( "/images/objects/captains-cabin-1-a-lightmap.png" );
                    materials.materials.Material.lightMapIntensity = 2;
                    materials.materials.Material.lightMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

                    // materials.materials.Material.lightMap.wrapS = 1000;
                    // materials.materials.Material.lightMap.wrapT = 1000;
                    // materials.materials.Material.lightMap.matrix.elements[1] = -0;
                    //materials.materials.Material.bumpMap.minFilter = THREE.LinearFilter;
                    materials.materials.Material.bumpMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    //materials.materials.Material.map.minFilter = THREE.LinearFilter;
                    materials.materials.Material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    objLoader.setMaterials(materials);
                    objLoader.load(module.objFile, (object) => {
                        let deg90 = 1.5708;
                        object.rotation.x = deg90;
                        if(module.turn !== 0) {
                            object.rotation.y = deg90 * module.turn;
                        }
                        object.position.y = module.pos[0] + module.aligners[module.turn][0];
                        object.position.x = module.pos[1] + module.aligners[module.turn][1];
                        // object.castShadow = true;
                        // object.receiveShadow = true;
                        object.userData.moduleType = module.type;
                        object.userData.moduleIndex = module.index;
                        let geometry = object.children[0].geometry;
                        let uvs = geometry.attributes.uv.array;
                        geometry.addAttribute( 'uv2', new THREE.BufferAttribute( uvs, 2 ) );
                        console.log('MESH',object, uvs.length);
                        scene.add(object);

                        self.addLights(scene, module, objLoader);
                    });
                });
            })(this, modulesLoader[loader]);
        }
        // this.importGltf(scene, renderer);
    }

    importGltf(scene, renderer) {
        console.log('test');
        const loader = new GLTFLoader();
        loader.load('/images/objects/captains-cabin.glb', (gltf) => {
            let deg90 = 1.5708,
                mesh = gltf.scene.children[2];
            mesh.rotation.x = deg90;
            mesh.position.y = 26;
            mesh.position.x = 45;
            //console.log('GLTF',gltf,mesh);
            // scene.add(mesh);
            let newGeo = mesh.geometry;
            let newMat = new THREE.MeshPhongMaterial({
                //map: new THREE.TextureLoader().load( "/images/objects/module-map-a.png" ),
                color: new THREE.Color('0xffffff'),
                map: mesh.material.map,
                bumpMap: mesh.material.normalMap,
                specularMap: new THREE.TextureLoader().load( "/images/objects/module-map-a-specular.png" ),
                lightMap: new THREE.TextureLoader().load( "/images/objects/module-map-01-lightmap.png" ),
            });
            newMat.map.encoding = 3000;
            newMat.bumpScale = 0.045;
            console.log('newmat',newMat);
            mesh.material = newMat;
            let newMesh = new THREE.Mesh(newGeo, newMat);
            newMesh.rotation.x = deg90;
            newMesh.position.y = 26;
            newMesh.position.x = 45;
            newMesh.position.z = 0;
            console.log('NEWMESH',newMesh);
            scene.add(mesh);
        });
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
                //scene.add(mainLight);
            }
            if(mainLights[i].helper) {
                //scene.add(new THREE.PointLightHelper(mainLight, 0.1));
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

    createTileMap(rawShip, mapLengths, floor) {
        let thisFloor = [],
            modules = rawShip.floors[0].modules,
            modulesLength = modules.length,
            m, x, y, row,
            curModule,
            curModuleData,
            curX = 0,
            curY = 0,
            curDataToTile = {};
        for(m=0; m<modulesLength; m++) {
            curModule = modules[m];
            curModuleData = getModule(curModule.module[0], curModule.level, curModule.turn);
            curY = 0;
            for(y=0; y<mapLengths[0]; y++) {
                m === 0 ? row = [] : row = thisFloor[y]; // Row does not exist, create new
                curX = 0;
                for(x=0; x<mapLengths[1]; x++) {
                    if(x <= curModule.pos[0] + curModuleData.dims[0] - 1 &&
                       x >= curModule.pos[0] &&
                       y <= curModule.pos[1] + curModuleData.dims[1] - 1 &&
                       y >= curModule.pos[1]) {
                        curDataToTile = Object.assign(
                            {},
                            {module:{
                                index: curModule.module[1],
                                moduleId: curModule.module[0],
                                level: curModule.level,
                                absolutePos: [x,y],
                                relativePos: [curX,curY],
                                name: curModuleData.name,
                            }},
                            curModuleData.tilemap[curY][curX]
                        );
                        if(m === 0) {
                            // Tile does not exist, create new
                            row.push(curDataToTile);
                        } else {
                            row[x] = curDataToTile;
                        }
                        if(curX < curModuleData.dims[0] - 1) {
                            curX++;
                        } else {
                            curY++;
                        }
                    } else {
                        if(m === 0) row.push({type:0}); // add space on the first module pass
                    }
                }
                m === 0 ? thisFloor.push(row) : thisFloor[y] = row; // Row does not exist, create new
            }
        }
        return [thisFloor];
    }

    createClickableTiles(scene) {
        let clickPlaneGeo = new THREE.PlaneGeometry(128,128,1,1);
        let clickPlaneMat = new THREE.MeshLambertMaterial({color: 0xff0000});
        let clickPlane = new THREE.Mesh(clickPlaneGeo, clickPlaneMat);
        clickPlane.position.x = 32;
        clickPlane.position.y = 32;
        clickPlane.position.z = 0;
        clickPlane.material.opacity = 0;
        clickPlane.material.transparent = true;
        scene.add(clickPlane);
        let geometry = new THREE.PlaneGeometry(1,1,1,1);
        let material = new THREE.MeshLambertMaterial({color: 0xffffff});
        let mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 0.03;
        mesh.material.opacity = 0;
        mesh.material.transparent = true;
        scene.add(mesh);
        scene.tileClick = {
            oneTile: mesh,
            clickPlane: [clickPlane],
        };
    }

    createAstarMap(tileMap, sceneState) {
        let floorsLength = tileMap.length,
            floor = 0,
            rowsLength = 0,
            row = 0,
            colsLength = 0,
            col = 0,
            tile,
            astarFloors = [],
            newFloor = [];
        for(floor=0; floor<floorsLength; floor++) {
            rowsLength = tileMap[floor].length;
            newFloor = [];
            for(row=0; row<rowsLength; row++) {
                colsLength = tileMap[floor][row].length;
                newFloor.push([]);
                for(col=0; col<colsLength; col++) {
                    tile = tileMap[floor][row][col];
                    if(tile.type == 2) {
                        newFloor[row].push(0);
                    } else {
                        newFloor[row].push(1);
                    }
                }
            }
            astarFloors.push(newFloor);
        }
        sceneState.astar = astarFloors;
    }
}

export default LoadTileMap