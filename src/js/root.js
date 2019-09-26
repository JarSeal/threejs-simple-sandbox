import TileMapCamera from './tilemap-camera.js';
import LoadTileMap from './tilemap/load-map.js';
import PlayerController from './players/player-controller.js';
import AppUiLayer from './ui/app-ui-layer.js';

class TileMapRoot {
    constructor() {
        this.sceneState = {
            players: {},
            ui: {
                locked: true,
                update: false,
                keepUpdating: false,
                view: null,
                viewData: [],
                curId: null,
                curState: null,
                curSecondaryState: null,
                curSecondaryTarget: null,
            },
            floor: 0,
            moduleMap: [],
            tileMap: [],
            astarMap: [],
        };
        this.init();
    }

    init() {
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor('#000000');
        renderer.setSize(window.innerWidth,window.innerHeight);
        // renderer.gammaFactor = 2.2;
        // renderer.gammaOutput = true;
        
        document.body.appendChild(renderer.domElement);
        const cam = new TileMapCamera(scene, renderer, this.sceneState);
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
        //scene.add(mesh);

        for(let i=0; i<100; i++) {
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = (Math.random() - 0.5) * 10;
            mesh.position.y = (Math.random() - 0.5) * 10;
            //mesh.position.z = (Math.random() - 0.5) * 10;
            mesh.hoverable = true;
            scene.add(mesh);
        }

        let hemi = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.8 );
        scene.add(hemi);
        scene.add(new THREE.AmbientLight(0xf0f0f0, 0.5));

        let light = new THREE.PointLight(0xFFFFFF, 0.8, 1000, 5);
        light.position.set(32,-32,0);
        light.castShadow = true;
        //scene.add(light);

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

        const objLoader = new THREE.OBJLoader();
        objLoader.setPath('/images/objects/');
        const mtlLoader = new THREE.MTLLoader();
        mtlLoader.setPath('/images/objects/');

        new LoadTileMap(mtlLoader, objLoader, scene, renderer, this.sceneState);

        let playerController = new PlayerController(this.sceneState);
        playerController.createNewPlayer(mtlLoader, objLoader, scene, renderer, this.sceneState, 'hero');

        const render = function() {
            requestAnimationFrame(render);
            playerController.setPositions();
            appUiLayer.renderUi();
            renderer.render(scene, camera);
            stats.update(); // Debug statistics
        };

        let beamGeometry = new THREE.BoxBufferGeometry(1,1,1);
        let beamMaterial = new THREE.MeshPhongMaterial({color: 0xff0088});
        let beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.y = 50;
        beam.position.x = 41;
        beam.position.z = 0.5 + 2;
        beam.receiveShadow = true;
        beam.castShadow = true;

        function onMouseMove(event) {
            event.preventDefault();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            let intersects = raycaster.intersectObjects(scene.children, true);
            for(let i=0; i<intersects.length; i++) {
                if(intersects[i].object.hoverable) {
                    this.tl = new TimelineMax();
                    this.tl.to(intersects[i].object.scale, 1, {x: 2, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.scale, .5, {x: .5, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.position, .5, {x: 2, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.rotation, .5, {y: Math.PI*.5, ease: Expo.easeOut}, "=-1.5");
                }
            }
        }

        const appUiLayer = new AppUiLayer(this.sceneState);

        window.addEventListener('resize', () => {
            cam.resize();
            appUiLayer.resize();
        });

        render();
    }
}

new TileMapRoot();