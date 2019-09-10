import TileMapCamera from './tilemap-camera.js';
import LoadTileMap from './tilemap/load-map.js';

class TileMapRoot {
    constructor() {
        this.sceneState = {
            camera: {},
        };
        this.init();
    }

    init() {
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor('#000000');
        renderer.setSize(window.innerWidth,window.innerHeight);
        renderer.clippingPlanes = Object.freeze( [] );
        renderer.localClippingEnabled = true;
        // renderer.shadowMap.enabled = true;
        // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // renderer.shadowMap.type = THREE.BasicShadowMap;
        
        document.body.appendChild(renderer.domElement);
        const cam = new TileMapCamera(scene, renderer);
        const camera = cam.getCamera();

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        // axes (helper)
        //scene.add(new THREE.AxesHelper(32));

        // World plane (helper)
        // const helper = new THREE.GridHelper(64, 64, 0xff0000, 0xffffff);
        // helper.rotation.x = 1.5708;
        // helper.position.set(31.5, 31.5, 0);
        // helper.material.opacity = 0.75;
        // helper.material.transparent = true;
        // scene.add( helper );
        

        const geometry = new THREE.BoxGeometry(1,1,1);
        const material = new THREE.MeshLambertMaterial({color: 0xF7F7F7});
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        for(let i=0; i<100; i++) {
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = (Math.random() - 0.5) * 10;
            mesh.position.y = (Math.random() - 0.5) * 10;
            //mesh.position.z = (Math.random() - 0.5) * 10;
            mesh.hoverable = true;
            scene.add(mesh);
        }

        let hemi = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.2 );
        scene.add(hemi);
        scene.add(new THREE.AmbientLight(0xf0f0f0, 0.2));

        let light = new THREE.PointLight(0xFFFFFF, 0.8, 1000, 5);
        light.position.set(32,-32,0);
        light.castShadow = true;
        scene.add(light);

        // light = new THREE.PointLight(0xFFFFFF, 0.6, 1000, 2);
        // light.position.set(0,0,25);
        // light.castShadow = true;
        // scene.add(light);

        // let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        // directionalLight.position.set(32, 10, 0);
        // directionalLight.castShadow = true;
        // let targetObject = new THREE.Object3D();
        // targetObject.position.set(32,64,-4);
        // scene.add(targetObject);
        // directionalLight.target = targetObject;
        // directionalLight.shadowCameraVisible = true;

        // directionalLight.shadow.mapSize.width = 5120;  // default
        // directionalLight.shadow.mapSize.height = 512; // default
        // directionalLight.shadow.camera.near = 5;    // default
        // directionalLight.shadow.camera.far = 64;     // default

        // let d = 15;
        // directionalLight.shadow.camera.left = - d;
		// directionalLight.shadow.camera.right = d;
		// directionalLight.shadow.camera.top = d;
		// directionalLight.shadow.camera.bottom = - d;

		// directionalLight.shadow.mapSize.x = -506;
        // directionalLight.shadow.mapSize.y = -506;
        // directionalLight.shadow.mapSize.w = 64;
        // directionalLight.shadow.mapSize.z = 10;

        // scene.add(directionalLight);
        // scene.add(directionalLight.target);

        // directionalLight.target.updateMatrixWorld();
        // directionalLight.shadow.camera.updateProjectionMatrix();

        // let helper = new THREE.DirectionalLightHelper( directionalLight, 1 );
        // scene.add( helper );
        // const cameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        // scene.add(cameraHelper);

        let keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 1.0);
        keyLight.position.set(-100, 0, 100);

        let fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 100%, 75%)'), 0.75);
        fillLight.position.set(100, 0, 100);

        let backLight = new THREE.DirectionalLight(0xffffff, 1.0);
        backLight.position.set(100, 0, -100).normalize();

        //scene.add(keyLight);
        //scene.add(fillLight);
        //scene.add(backLight);

        // Debug statisctics [START]
        let stats;
        function createStats() {
            let stats = new Stats();
            stats.setMode(0);
            return stats;
        }
        stats = createStats();
        document.body.appendChild(stats.domElement);
        // Debug statisctics [END]

        const render = function() {
            requestAnimationFrame(render);
            // mesh.rotation.x += 0.05;
            // mesh.rotation.y += 0.01;
            renderer.render(scene, camera);
            stats.update(); // Debug statistics
        };

        const objLoader = new THREE.OBJLoader();
        objLoader.setPath('/images/objects/');
        const mtlLoader = new THREE.MTLLoader();
        mtlLoader.setPath('/images/objects/');

        let mapLoader = new LoadTileMap(mtlLoader, objLoader, scene, renderer);
        console.log('Current map:', mapLoader.getCurrentMap());

        let beamGeometry = new THREE.BoxBufferGeometry(1,1,1);
        let beamMaterial = new THREE.MeshPhongMaterial({color: 0xff0088});
        let beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.y = 50;
        beam.position.x = 41;
        beam.position.z = 0.5 + 2;
        beam.receiveShadow = true;
        beam.castShadow = true;
        let group = new THREE.Group();
        group.add(beam);
        console.log('GROUP',group);
        scene.add(group);

        function onMouseMove(event) {
            event.preventDefault();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            let intersects = raycaster.intersectObjects(scene.children, true);
            for(let i=0; i<intersects.length; i++) {
                // intersects[i].object.material.color.set(0xFF0000);
                if(intersects[i].object.hoverable) {
                    this.tl = new TimelineMax();
                    this.tl.to(intersects[i].object.scale, 1, {x: 2, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.scale, .5, {x: .5, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.position, .5, {x: 2, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.rotation, .5, {y: Math.PI*.5, ease: Expo.easeOut}, "=-1.5");
                }
            }
        }

        render();

        // this.tl = new TimelineMax({paused: true});
        // this.tl.to(mesh.scale, 1, {x: 2, ease: Expo.easeOut});
        // this.tl.to(mesh.scale, .5, {x: .5, ease: Expo.easeOut});
        // this.tl.to(mesh.position, .5, {x: 2, ease: Expo.easeOut});
        // this.tl.to(mesh.rotation, .5, {y: Math.PI*.5, ease: Expo.easeOut}, "=-1.5");

        window.addEventListener('mousemove', onMouseMove);
    }
}

new TileMapRoot();