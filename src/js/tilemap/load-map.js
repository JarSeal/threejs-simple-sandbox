import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getShip } from '../data/dev-ship.js';
import { getModule } from './modules/index.js';
import { TextureMerger } from '../vendor/TextureMerger.js';
import { getModuleTexture } from './textures.js';
//import { BufferGeometryUtils } from 'three';

class LoadTileMap {
    constructor(scene, renderer, sceneState) {
        this.ship = [];
        this.scene = scene;
        this.sceneState = sceneState;
        this.mapLengths = [64, 64];
        this.texturesToLoadPerGeo = 3;
        this.textureLoader = new THREE.TextureLoader();
        this.groups = {};
        this.mapTextures = {};
        this.lightMapTextures = {};
        this.bumpMapTextures = {};
        this.meshes = {};
        this.mergedMaps = {};
        this.loaders = {
            modulesLength: 0,
            texturesLoaded: 0,
            meshesLoaded: 0,
        };
        this.init(scene, renderer, sceneState);
    }

    textureLoaded = (texture) => {
        let totalAmount = this.texturesToLoadPerGeo * this.loaders.modulesLength;
        this.loaders.texturesLoaded++;
        if(totalAmount == this.loaders.texturesLoaded) {
            console.log('ALL TEXTURES LOADED');
            this.loadMeshes();
        }
    }

    meshLoaded() {
        this.loaders.meshesLoaded++;
        if(this.loaders.meshesLoaded == this.loaders.modulesLength) {
            console.log('All meshes loaded');
            this.mergedMaps['map'] = new TextureMerger(this.mapTextures);
            this.positionAndSkinMeshes();
        }
    }

    modifyObjectUV(object, range) {
        let uvAttribute = object.geometry.attributes.uv,
            i = 0,
            attrLength = uvAttribute.count;
        for(i=0; i<attrLength; i++) {

            let u = uvAttribute.getX(i),
                v = uvAttribute.getY(i);

            u = u * (range.endU - range.startU) + range.startU;
            v = v * (range.endV - (1 - range.startV)) + (1 - range.startV);

            uvAttribute.setXY(i, u, v);
            uvAttribute.needsUpdate = true;
        }
    }

    createShaderMaterial(texture) {
        const uniforms = {
            texture: { type: "t", value: texture },
        };

        const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`;

        const fragmentShader = `
        varying vec2 vUv;
        uniform sampler2D texture;
        void main() {
            float coordX = vUv.x;
            float coordY = vUv.y;
            gl_FragColor = texture2D(texture, vec2(coordX, coordY));
        }`;

        return {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
        }
    }

    positionAndSkinMeshes() {
        let i = 0,
            modules = this.loaders.modules,
            modulesLength = modules.length,
            geometries = [],
            handledUvs = [];
        for(i=0; i<modulesLength; i++) {
            let module = modules[i],
                meshId = "m"+module.module+"-l"+module.level+"-"+module.part,
                object = this.meshes[meshId].clone();
            let skinKey = "";
            if(module.part == "interior") skinKey = "intSkin";
            if(module.part == "exterior") skinKey = "extSkin";
            let textureId = "m"+module.module+"-l"+module.level+"-s"+module[skinKey]+"-map-"+module.part;
            if(!handledUvs.includes(textureId)) {
                this.modifyObjectUV(object, this.mergedMaps.map.ranges[textureId]);
                handledUvs.push(textureId);
            }

            object.material.dispose();
            object.material = new THREE.ShaderMaterial(this.createShaderMaterial(
                this.mergedMaps.map.mergedTexture
            ));

            let deg90 = 1.5708;
            if(module.turn !== 0) {
                object.rotation.z = deg90 * module.turn;
            }
            object.position.y = module.pos[0] + module.aligners[module.turn][0];
            object.position.x = module.pos[1] + module.aligners[module.turn][1];
            object.userData.moduleType = module.type;
            object.userData.moduleIndex = module.index;
            object.updateMatrix();

            let moduleId = this.createObjectId(module.module, module.level, module.index, module.part);
            if(module.part == "exterior") {
                let doors = module.models.doors,
                    doorsLength = doors.length,
                    d = 0;
                for(d=0; d<doorsLength; d++) {
                    this.sceneState.doors.push(Object.assign({}, doors[d], {
                        modulePos: module.pos,
                        moduleTurn: module.turn,
                        moduleDoorIndex: d,
                        moduleId: moduleId,
                    }));
                }
            }

            object.geometry = object.geometry.toNonIndexed();
            object.matrix.compose(object.position, object.quaternion, object.scale);
		    object.geometry.applyMatrix4(object.matrix);
            geometries.push(object.geometry);
        }
        let kingGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, true);
        let kingMat = new THREE.ShaderMaterial(this.createShaderMaterial(
            this.mergedMaps.map.mergedTexture,
            {}
        ));
        let kingMesh = new THREE.Mesh(kingGeo, kingMat);
        kingMesh.name = "king-mesh";
        kingMesh.matrixAutoUpdate = false;
        this.createDoors(this.scene, this.sceneState);
        this.scene.add(kingMesh);
        
        this.sceneState.ui.viewLoading = false;
    }

    loadMeshes() {
        let i = 0,
            modules = this.loaders.modules,
            modulesLength = modules.length,
            module,
            modelLoader = new GLTFLoader(),
            dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        for(i=0; i<modulesLength; i++) {
            module = modules[i];
            let meshId = "m"+module.module+"-l"+module.level+"-"+module.part;
            if(!this.meshes[meshId]) {
                this.meshes[meshId] = {};
                modelLoader.load(
                    'images/objects/' + module.models[module.part].glb,
                    (gltf) => {
                        //console.log("LOADED gltf", gltf);
                        let object = gltf.scene.children[0];                        
                        this.meshes[meshId] = object;
                        this.meshLoaded();
                    },
                    (xhr) => {},
                    (error) => {
                        console.log('An GLTF loading error happened', error);
                    }
                );
            } else {
                this.meshLoaded();
            }
        }
    }

    loadModuleAndTexture(module, renderer, scene) {
        let skinKey = "";
        if(module.part == "interior") skinKey = "intSkin";
        if(module.part == "exterior") skinKey = "extSkin";

        // Load current module's textures (map, lightMap, bumpMap)
        let mapTexture = getModuleTexture(module.module, module.level, module[skinKey], "map", module.part),
            lightMapTexture = getModuleTexture(module.module, module.level, module[skinKey], "light", module.part),
            bumpMapTexture = getModuleTexture(module.module, module.level, module[skinKey], "bump", module.part);
        if(!this.mapTextures[mapTexture.key]) {
            this.mapTextures[mapTexture.key] = this.textureLoader.load("/images/objects/"+mapTexture.texturePath, this.textureLoaded);
        } else {
            this.textureLoaded();
        }
        if(!this.lightMapTextures[lightMapTexture.key]) {
            this.lightMapTextures[lightMapTexture.key] = this.textureLoader.load("/images/objects/"+lightMapTexture.texturePath, this.textureLoaded);
        } else {
            this.textureLoaded();
        }
        if(!this.bumpMapTextures[bumpMapTexture.key]) {
            this.bumpMapTextures[bumpMapTexture.key] = this.textureLoader.load("/images/objects/"+bumpMapTexture.texturePath, this.textureLoaded);
        } else {
            this.textureLoaded();
        }
    }

    loadModuleAndTexture2(module, renderer, scene) {
        console.log("LOADING module", module);

        // Load current module's textures (map, lightMap, bumpMap)
        let mapTexture = getModuleTexture(module.module, module.level, )

        // Load GLTF models
        let modelLoader = new GLTFLoader(),
            dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        modelLoader.load(
            'images/objects/' + module.models[module.part].glb,
            (gltf) => {
                console.log("LOADED gltf", gltf);
                let object = gltf.scene.children[0];

                let geometry = object.geometry;
                let uvs = geometry.attributes.uv.array;
                object.geometry.setAttribute('uv2', new THREE.BufferAttribute(uvs, 2));

                let deg90 = 1.5708;
                if(module.turn !== 0) {
                    object.rotation.z = deg90 * module.turn;
                }
                object.position.y = module.pos[0] + module.aligners[module.turn][0];
                object.position.x = module.pos[1] + module.aligners[module.turn][1];
                object.userData.moduleType = module.type;
                object.userData.moduleIndex = module.index;

                object.name = this.createObjectId(module.module, module.level, module.index, module.part);
                if(!this.groups["m" + module.module + "l" + module.level]) {
                    this.groups["m" + module.module + "l" + module.level] = new THREE.Group();
                }
                this.groups["m" + module.module + "l" + module.level].add(object);

                if(module.part == "exterior") {
                    let doors = module.models.doors,
                        doorsLength = doors.length,
                        d = 0;
                    for(d=0; d<doorsLength; d++) {
                        this.sceneState.doors.push(Object.assign({}, doors[d], {
                            modulePos: module.pos,
                            moduleTurn: module.turn,
                            moduleDoorIndex: d,
                            moduleId: object.name,
                        }));
                    }
                }

                object.material.dispose();
                object.material = new THREE.MeshLambertMaterial();
                object.material.lightMapIntensity = 2;
                object.material.bumpScale = 0.145;
                object.material.shininess = 10;
                object.material.userData.outlineParameters = {
                    visible: false
                };
                object.material.map = new THREE.TextureLoader().load("/images/objects/"+module.models[module.part].diffuseMap, (texture) => {
                    console.log("FROM CALLBACK", texture);
                    texture.flipY = false;
                    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
                    this.addLoadedTexture(scene);
                });
                object.material.lightMap = new THREE.TextureLoader().load("/images/objects/"+module.models[module.part].lightMap, (texture) => {
                    texture.flipY = false;
                    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
                    this.addLoadedTexture(scene);
                });
                object.material.bumpMap = new THREE.TextureLoader().load("/images/objects/"+module.models[module.part].bumpMap, (texture) => {
                    texture.flipY = false;
                    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
                    this.addLoadedTexture(scene);
                });
            },
            (xhr) => {},
            (error) => {
                console.log('An GLTF loading error happened', error, module);
            }
        );
    }

    init(scene, renderer, sceneState) {
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
        sceneState.consequences.addMapAndInitTime(this.ship[sceneState.floor], this.sceneState.initTime.s);
        sceneState.astarMap = this.createAstarMap(this.ship, sceneState);

        let modelLoader = new GLTFLoader(); // TEMP LOADER
        let dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        modelLoader.load(
            'images/objects/props/prop-barrel-02.glb',
            function (gltf)  {
                let barrelMesh = gltf.scene.children[0];
                barrelMesh.material.dispose();
                barrelMesh.material = new THREE.MeshLambertMaterial();
                barrelMesh.material.map = new THREE.TextureLoader().load("/images/objects/props/barrel2-baked-map.png");
                barrelMesh.material.map.flipY = false;
                barrelMesh.material.lightMap = new THREE.TextureLoader().load("/images/objects/props/barrel2-lightmap.png");
                barrelMesh.material.lightMapIntensity = 2;
                barrelMesh.material.lightMap.anistropy = renderer.capabilities.getMaxAnisotropy();
                barrelMesh.material.lightMap.flipY = false;
                barrelMesh.material.metalness = 0;
                barrelMesh.material.bumpScale = 0.145;
                barrelMesh.material.bumpMap = new THREE.TextureLoader().load("/images/objects/props/barrel2-uv-bump-map.png");
                barrelMesh.material.bumpMap.anistropy = renderer.capabilities.getMaxAnisotropy();
                barrelMesh.material.bumpMap.flipY = false;

                let geometry = barrelMesh.geometry;
                let uvs = geometry.attributes.uv.array;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(uvs, 2));
                
                let barrel = new THREE.Group();
                barrel.add(barrelMesh);
                barrel.position.x = 37;
                barrel.position.y = 33;

                scene.add(barrel);
            },
            function (xhr) {
                
            },
            function (error) {
                console.log('An GLTF loading error happened', error);
            }
        );

        // Create modulesLoader (loads the 3D assets)
        let groups = {},
            distinctModuleIds = [];
        for(m=0; m<modulesLength; m++) {
            turn = modules[m].turn || 0;
            let moduleFound = false,
                moduleId = "m" + modules[m].module[0] + "l" + modules[m].level;
            for(let d=0; d<distinctModuleIds.length; d++) {
                if(distinctModuleIds[d] == moduleId) {
                    moduleFound = true;
                    break;
                }
            }
            if(!moduleFound) {
                groups[moduleId] = new THREE.Group();
                distinctModuleIds.push(moduleId);
            }
            let modulePart = Object.assign(
                {},
                {
                    pos: modules[m].pos,
                    type: modules[m].module[0],
                    index: modules[m].module[1],
                    intSkin: modules[m].intSkin,
                    extSkin: modules[m].extSkin,
                    turn: turn,
                },
                getModule(
                    modules[m].module[0],
                    modules[m].level,
                    turn,
                    this.createObjectId(modules[m].module[0], modules[m].level, modules[m].module[1], "exterior"))
            );
            if(modulePart.models.interior) {
                modulesLoader.push(Object.assign({},modulePart,{part:"interior"}));
            }
            if(modulePart.models.exterior) {
                modulesLoader.push(Object.assign({},modulePart,{part:"exterior"}));
            }
            if(modulePart.models.details) {
                modulesLoader.push(Object.assign({},modulePart,{part:"details"}));
            }
        }

        let loader,
            loaderLength = modulesLoader.length;
        this.loaders.modules = modulesLoader;
        this.loaders.modulesLength = loaderLength;
        this.sceneState.doors = [];
        for(loader=0;loader<loaderLength;loader++) {
            //if(loader == 4 || loader == 5) {
                this.loadModuleAndTexture(modulesLoader[loader], renderer, scene);
                continue;
            //}
            (function(self, module, loader, loaders, checkIfAllLoaded, sceneState, createDoors) {
                let mLoader = new MTLLoader();
                mLoader.setPath('/images/objects/');
                mLoader.load(module.models[module.part].mtlFile, (materials) => {
                    materials.preload();
                    materials.materials[module.models[module.part].mtlId].lightMap = new THREE.TextureLoader().load("/images/objects/"+module.models[module.part].lightMap);
                    materials.materials[module.models[module.part].mtlId].lightMapIntensity = 2;
                    materials.materials[module.models[module.part].mtlId].lightMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    materials.materials[module.models[module.part].mtlId].shininess = 10;
                    materials.materials[module.models[module.part].mtlId].bumpScale = 0.145;
                    materials.materials[module.models[module.part].mtlId].bumpMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    materials.materials[module.models[module.part].mtlId].map.anisotropy = renderer.capabilities.getMaxAnisotropy();

                    let oLoader = new OBJLoader();
                    oLoader.setMaterials(materials);
                    oLoader.setPath('/images/objects/');
                    oLoader.load(module.models[module.part].objFile, (object) => {
                        let deg90 = 1.5708;
                        object.rotation.x = deg90;
                        if(module.turn !== 0) {
                            object.rotation.y = deg90 * module.turn;
                        }
                        object.position.y = module.pos[0] + module.aligners[module.turn][0];
                        object.position.x = module.pos[1] + module.aligners[module.turn][1];
                        object.userData.moduleType = module.type;
                        object.userData.moduleIndex = module.index;

                        object.children[0].material.dispose();
                        object.children[0].material = new THREE.MeshLambertMaterial();
                        object.children[0].material.map = new THREE.TextureLoader().load("/images/objects/"+module.models[module.part].diffuseMap);
                        object.children[0].material.lightMap = new THREE.TextureLoader().load("/images/objects/"+module.models[module.part].lightMap);
                        object.children[0].material.lightMapIntensity = 2;
                        object.children[0].material.lightMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                        object.children[0].material.shininess = 10;
                        object.children[0].material.bumpMap = new THREE.TextureLoader().load("/images/objects/"+module.models[module.part].bumpMap);
                        object.children[0].material.bumpScale = 0.145;
                        object.children[0].material.bumpMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
                        object.children[0].material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                        
                        let geometry = object.children[0].geometry;
                        let uvs = geometry.attributes.uv.array;
                        geometry.setAttribute('uv2', new THREE.BufferAttribute(uvs, 2));
                        
                        object.children[0].material.userData.outlineParameters = {
                            visible: false
                        };

                        object.name = self.createObjectId(module.module, module.level, module.index, module.part);
                        groups["m" + module.module + "l" + module.level].add(object);

                        if(module.part == "exterior") {
                            let doors = module.models.doors,
                                doorsLength = doors.length,
                                d = 0;
                            for(d=0; d<doorsLength; d++) {
                                sceneState.doors.push(Object.assign({}, doors[d], {
                                    modulePos: module.pos,
                                    moduleTurn: module.turn,
                                    moduleDoorIndex: d,
                                    moduleId: object.name,
                                }));
                            }
                        }

                        if(loaders.modulesLength == loader + 1) {
                            // Last module loaded
                            loaders.modulesLoaded = true;
                            checkIfAllLoaded(loaders, sceneState);
                            createDoors(scene, sceneState);
                            let levelPropsGroup = new THREE.Group();
                            levelPropsGroup.name = "level-props";
                            for(var prop in groups) {
                                if(Object.prototype.hasOwnProperty.call(groups, prop)) {
                                    levelPropsGroup.add(groups[prop]);
                                }
                            }
                            scene.add(levelPropsGroup);
                        }
                    });
                });
            })(this, modulesLoader[loader], loader, this.loaders, this.checkIfAllLoaded, this.sceneState, this.createDoors);
        }
    }

    createDoors(scene, sceneState) {
        let doors = sceneState.doors,
            doorsLength = doors.length,
            d = 0,
            deg90 = 1.5708;
        for(d=0; d<doorsLength; d++) {
            if(doors[d].type == "slide-double") {
                let doorGeo = new THREE.BoxBufferGeometry(0.7, 0.3, 2.1);
                let doorMat = new THREE.MeshLambertMaterial({color: 0x666666});
                let doorMat2 = new THREE.MeshLambertMaterial({color: 0x555555});
                let doorOne = new THREE.Mesh(doorGeo, doorMat),
                    doorTwo = new THREE.Mesh(doorGeo, doorMat2),
                    doorGroup = new THREE.Group(),
                    doorIds;
                doorGroup.name = doors[d].moduleId + "-d" + doors[d].moduleDoorIndex;
                doorOne.name = doors[d].moduleId + "-d" + doors[d].moduleDoorIndex + '--slide-double--door1--';
                doorTwo.name = doors[d].moduleId + "-d" + doors[d].moduleDoorIndex + '--slide-double--door2--';
                doorIds = {
                    groupName: doorGroup.name,
                    doorOneName: doorOne.name,
                    doorTwoName: doorTwo.name,
                }
                if((doors[d].turn + doors[d].moduleTurn) % 2 === 0) {
                    // Doors is facing to Y axis
                    doorOne.name += 'even';
                    doorTwo.name += 'even';
                    doorOne.position.x = doors[d].modulePos[1] + doors[d].pos[1] - doors[d].closedOffset;
                    doorOne.position.y = doors[d].modulePos[0] + doors[d].pos[0];
                    doorTwo.position.x = doors[d].modulePos[1] + doors[d].pos[1] + doors[d].closedOffset;
                    doorTwo.position.y = doors[d].modulePos[0] + doors[d].pos[0];
                    doorOne.userData.pos = [doors[d].modulePos[1] + doors[d].pos[1], doors[d].modulePos[0] + doors[d].pos[0]];
                    doorTwo.userData.pos = [doors[d].modulePos[1] + doors[d].pos[1], doors[d].modulePos[0] + doors[d].pos[0]];
                } else {
                    // Doors is facing to X axis
                    doorOne.name += 'odd';
                    doorTwo.name += 'odd';
                    doorOne.position.x = doors[d].modulePos[1] + doors[d].pos[1];
                    doorOne.position.y = doors[d].modulePos[0] + doors[d].pos[0] - doors[d].closedOffset;
                    doorTwo.position.x = doors[d].modulePos[1] + doors[d].pos[1];
                    doorTwo.position.y = doors[d].modulePos[0] + doors[d].pos[0] + doors[d].closedOffset;
                    doorOne.userData.pos = [doors[d].modulePos[1] + doors[d].pos[1], doors[d].modulePos[0] + doors[d].pos[0]];
                    doorTwo.userData.pos = [doors[d].modulePos[1] + doors[d].pos[1], doors[d].modulePos[0] + doors[d].pos[0]];
                }
                doorOne.position.z = 1.2;
                doorOne.rotation.z = deg90 * doors[d].moduleTurn + deg90 * doors[d].turn;
                doorTwo.position.z = 1.2;
                doorTwo.rotation.z = deg90 * doors[d].moduleTurn + deg90 * doors[d].turn;
                sceneState.consequences.addDoor(
                    Object.assign(
                        {},
                        doors[d],
                        {
                            groupId: doorGroup.name,
                            doorOneId: doorOne.name,
                            doorTwoId: doorTwo.name,
                            open: false,
                        },
                    )
                );
                doorGroup.add(doorOne);
                doorGroup.add(doorTwo);
                scene.add(doorGroup);
            }
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
            curModuleData = getModule(
                curModule.module[0],
                curModule.level,
                curModule.turn,
                this.createObjectId(curModule.module[0], curModule.level, curModule.module[1], "exterior"),
                curModule.doorParams
            );
            curY = 0;
            for(y=0; y<mapLengths[0]; y++) {
                m === 0 ? row = [] : row = thisFloor[y]; // If row does not exist, create new
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
                                objectId: this.createObjectId(curModule.module[0], curModule.level, curModule.module[1]),
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
        return [this.createDoorTriggers(thisFloor)];
    }

    createObjectId(moduleId, level, moduleIndex, modulePart) {
        return 'module-' + moduleId + '-l' + level + '-i' + moduleIndex + "-" + (modulePart || "interior");
    }

    createClickableTiles(scene) {
        let clickPlaneGeo = new THREE.PlaneBufferGeometry(128,128,1,1);
        let clickPlaneMat = new THREE.MeshBasicMaterial({color: 0xff0000});
        let clickPlane = new THREE.Mesh(clickPlaneGeo, clickPlaneMat);
        clickPlane.position.x = 32;
        clickPlane.position.y = 32;
        clickPlane.position.z = 0;
        clickPlane.material.opacity = 0;
        clickPlane.material.transparent = true;
        scene.add(clickPlane);
        let geometry = new THREE.PlaneBufferGeometry(1,1,1,1);
        let material = new THREE.MeshBasicMaterial({color: 0xffffff});
        let mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = 0;
        mesh.position.y = 0;
        mesh.position.z = 0.03;
        mesh.material.opacity = 0;
        mesh.material.transparent = true;
        scene.add(mesh);
        let targetGeo = new THREE.CircleBufferGeometry(0.3,16);
        let targetMat = new THREE.MeshBasicMaterial({color: 0xff0000});
        let targetMesh = new THREE.Mesh(targetGeo, targetMat);
        targetMesh.position.x = 0;
        targetMesh.position.y = 0;
        targetMesh.position.z = 0.03;
        targetMesh.material.opacity = 0;
        targetMesh.material.transparent = true;
        scene.add(targetMesh);
        scene.tileClick = {
            oneTile: mesh,
            oneTarget: targetMesh,
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

    moduleAnims(scene) {
        let modules = this.sceneState.moduleData,
            modulesLength = modules.length,
            i;
        for(i=0; i<modulesLength; i++) {
            if(modules[i].action) {
                modules[i].action(this.sceneState, i, scene);
            }
        }
    }

    createDoorTriggers(tileMap) {
        if(!tileMap.length) return tileMap;
        let rows = tileMap.length,
            cols = tileMap[0].length,
            r = 0,
            c = 0,
            params,
            paramsLength = 0,
            p = 0,
            curParams;
        for(r=0; r<rows; r++) {
            for(c=0; c<cols; c++) {
                if(tileMap[r][c].type == 3) {
                    params = tileMap[r][c].doorParams;
                    paramsLength = params.length;
                    for(p=0; p<paramsLength; p++) {
                        if(params[p].isCurDoorTile) {
                            curParams = Object.assign({}, params[p]);
                            curParams.isCurDoorTile = false;
                            break;
                        }
                    }
                    // Check if the door has a door next to it
                    if(tileMap[r - 1] && tileMap[r - 1][c].type == 3) {
                        if(!tileMap[r - 1][c].doorParams) tileMap[r - 1][c].doorParams = [];
                        tileMap[r - 1][c].doorParams.push(curParams);
                        if(!tileMap[r - 2][c].doorParams) tileMap[r - 2][c].doorParams = [];
                        tileMap[r - 2][c].doorParams.push(curParams);
                        if(!tileMap[r - 2][c - 1].doorParams) tileMap[r - 2][c - 1].doorParams = [];
                        tileMap[r - 2][c - 1].doorParams.push(curParams);
                        if(!tileMap[r - 2][c + 1].doorParams) tileMap[r - 2][c + 1].doorParams = [];
                        tileMap[r - 2][c + 1].doorParams.push(curParams);
                    } else if(tileMap[r][c - 1] && tileMap[r][c - 1].type == 3) {
                        if(!tileMap[r][c - 1].doorParams) tileMap[r][c - 1].doorParams = [];
                        tileMap[r][c - 1].doorParams.push(curParams);
                        if(!tileMap[r][c - 2].doorParams) tileMap[r][c - 2].doorParams = [];
                        tileMap[r][c - 2].doorParams.push(curParams);
                        if(!tileMap[r - 1][c - 2].doorParams) tileMap[r - 1][c - 2].doorParams = [];
                        tileMap[r - 1][c - 2].doorParams.push(curParams);
                        if(!tileMap[r + 1][c - 2].doorParams) tileMap[r + 1][c - 2].doorParams = [];
                        tileMap[r + 1][c - 2].doorParams.push(curParams);
                    } else if(tileMap[r + 1] && tileMap[r + 1][c].type == 3) {
                        if(!tileMap[r + 1][c].doorParams) tileMap[r + 1][c].doorParams = [];
                        tileMap[r + 1][c].doorParams.push(curParams);
                        if(!tileMap[r + 2][c].doorParams) tileMap[r + 2][c].doorParams = [];
                        tileMap[r + 2][c].doorParams.push(curParams);
                        if(!tileMap[r + 2][c - 1].doorParams) tileMap[r + 2][c - 1].doorParams = [];
                        tileMap[r + 2][c - 1].doorParams.push(curParams);
                        if(!tileMap[r + 2][c + 1].doorParams) tileMap[r + 2][c + 1].doorParams = [];
                        tileMap[r + 2][c + 1].doorParams.push(curParams);
                    } else if(tileMap[r][c + 1] && tileMap[r][c + 1].type == 3) {
                        if(!tileMap[r][c + 1].doorParams) tileMap[r][c + 1].doorParams = [];
                        tileMap[r][c + 1].doorParams.push(curParams);
                        if(!tileMap[r][c + 2].doorParams) tileMap[r][c + 2].doorParams = [];
                        tileMap[r][c + 2].doorParams.push(curParams);
                        if(!tileMap[r - 1][c + 2].doorParams) tileMap[r - 1][c + 2].doorParams = [];
                        tileMap[r - 1][c + 2].doorParams.push(curParams);
                        if(!tileMap[r + 1][c + 2].doorParams) tileMap[r + 1][c + 2].doorParams = [];
                        tileMap[r + 1][c + 2].doorParams.push(curParams);
                    } else {
                        // Door is next to space, lock the door
                        for(p=0; p<paramsLength; p++) {
                            if(params[p].isCurDoorTile) {
                                tileMap[r][c].doorParams[p]['locked'] = true;
                                tileMap[r][c].doorParams[p]['nextToSpace'] = true;
                                this.sceneState.consequences.addDoor(
                                    Object.assign(
                                        {},
                                        params[p],
                                        {
                                            locked: true,
                                            nextToSpace: true,
                                        }
                                    )
                                );
                                break;
                            }
                        }
                    }
                }
            }
        }
        return tileMap;
    }
}

export default LoadTileMap