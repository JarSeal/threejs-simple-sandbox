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
                             mtlFile: modules[moduleIndex].mtlFile,
                             aligners: modules[moduleIndex].aligners}
                        );
                        modulesLoader.push({
                            moduleId: "module_"+tile.module[0]+"-"+tile.level,
                            objFile: modules[moduleIndex].objFile,
                            mtlFile: modules[moduleIndex].mtlFile,
                            pos: tile.pos,
                            id: moduleIndex,
                            aligners: modules[moduleIndex].aligners,
                            turn: tile.turn || 0
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
        let mainLight = new THREE.PointLight( 0xffffff, 1, 11, 2);
        mainLight.position.set( module.pos[1] + 2.5, module.pos[0] + 2, 3 );
        scene.add(mainLight);
        let sphereSize = 0.2;
        let pointLightHelper = new THREE.PointLightHelper( mainLight, sphereSize );
        //scene.add( pointLightHelper );

        objLoader.load("light-capsule.obj", (object) => {
            object.rotation.x = 1.5708;
            let geometry = new THREE.Geometry().fromBufferGeometry(object.children[0].geometry);
            geometry.mergeVertices();
            const material = new THREE.MeshLambertMaterial({color: 0xffffff, emissive: 0xffffff});
            const mesh = new THREE.Mesh(geometry, material);
            const pos = {
                x: module.pos[1] + 1.4,
                y: module.pos[0] + 1.6,
                z: 2
            };
            mesh.position.y = pos.y;
            mesh.position.x = pos.x;
            mesh.position.z = pos.z;
            let glowMesh = new THREE.glowShader.GeometricGlowMesh(mesh);
            mesh.add(glowMesh.object3d);
            let outsideUniforms	= glowMesh.outsideMesh.material.uniforms;
            outsideUniforms.glowColor.value.set(0xffffff);
            outsideUniforms.coeficient.value = (0.0005);
            outsideUniforms.power.value = (6.4);
            let insideUniforms	= glowMesh.insideMesh.material.uniforms;
            insideUniforms.glowColor.value.set(0xffffff);
            scene.add(mesh);
        });

        //const geometry = new THREE.BoxGeometry(1,1,1);
        //const geometry = new THREE.CylinderGeometry(0.5,0.5,3, 64,64,false);/* new THREE.CylinderGeometry( 1, 1, 2, 32 ); */ //new THREE.TorusKnotGeometry(1-0.25, 0.25, 32*3, 32);
        //const material = new THREE.MeshLambertMaterial({color: 0xF7F7F7, side: THREE.DoubleSide});
        // const mesh = new THREE.Mesh(geometry, material);
        // mesh.position.x = module.pos[1];
        // mesh.position.y = module.pos[0];
        // mesh.position.z = 5;
        // const mesh2 = new THREE.Mesh(object.children[0].geometry, material);
        // mesh2.rotation.x = 1.5708;
        // mesh2.position.x = module.pos[1];
        // mesh2.position.y = module.pos[0];
        // mesh2.position.z = 5;
        // console.log('newmesh',mesh2);

        // let capsuleGeo = new THREE.Geometry();
        // let cyl = new THREE.CylinderGeometry(0.25, 0.25, 2, 32, 32, true);
        // let top = new THREE.SphereGeometry(0.25, 32, 32);
        // let bot = new THREE.SphereGeometry(0.25, 32, 32);
        // let matrix = new THREE.Matrix4();
        // matrix.makeTranslation(0, 2, 0);
        // top.applyMatrix(matrix);
        // let matrix2 = new THREE.Matrix4();
        // matrix2.makeTranslation(0, -3, 0);
        // top.applyMatrix(matrix2);
        // capsuleGeo.merge(top);
        // capsuleGeo.merge(bot);
        // capsuleGeo.merge(cyl);
        // const mesh = new THREE.Mesh(capsuleGeo, material);
        // mesh.position.x = module.pos[1];
        // mesh.position.y = module.pos[0];
        // mesh.position.z = 5;
        
        // let glowMesh = new THREE.glowShader.GeometricGlowMesh(mesh);
        // mesh.add(glowMesh.object3d);
        // let outsideUniforms	= glowMesh.outsideMesh.material.uniforms;
        // outsideUniforms.glowColor.value.set('hotpink');
        // outsideUniforms.coeficient.value = (0.45);
        // outsideUniforms.power.value = (3.4);
        // let insideUniforms	= glowMesh.insideMesh.material.uniforms;
        // insideUniforms.glowColor.value.set('cyan');

        // scene.add(mesh);

    }

    getCurrentMap() {
        // return getShip();
        //return getModule(1,1);
    }
}

export default LoadTileMap