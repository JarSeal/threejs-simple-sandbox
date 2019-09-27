import Scene from './scene.js';
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
            moduleData: [],
            moduleMap: [],
            tileMap: [],
            astarMap: [],
        };
        this.init();
    }

    init() {
        const appUiLayer = new AppUiLayer(this.sceneState);

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor('#000000');
        renderer.setSize(window.innerWidth,window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const sceneController = new Scene(renderer, this.sceneState);
        let scene = sceneController.loadScene(this.sceneState.ui.view);
        
        const geometry = new THREE.BoxGeometry(1,1,1);
        const material = new THREE.MeshLambertMaterial({color: 0xF7F7F7});
        // Just to populate 100 objects to stress test
        for(let i=0; i<100; i++) {
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = (Math.random() - 0.5) * 10;
            mesh.position.y = (Math.random() - 0.5) * 10;
            //mesh.position.z = (Math.random() - 0.5) * 10;
            mesh.hoverable = true;
            scene.add(mesh);
        }

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

        // Todo: move these (below here) into the combat-scene file
        const cam = new TileMapCamera(scene, renderer, this.sceneState);
        const camera = cam.getCamera();
        let tileMapController = new LoadTileMap(mtlLoader, objLoader, scene, renderer, this.sceneState);
        let playerController = new PlayerController(this.sceneState);
        playerController.createNewPlayer(mtlLoader, objLoader, scene, renderer, this.sceneState, 'hero');
        // Todo: move these (above here) into the combat-scene file

        const render = function() {
            requestAnimationFrame(render);
            playerController.setPositions();
            tileMapController.moduleAnims(scene);
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

        window.addEventListener('resize', () => {
            cam.resize();
            appUiLayer.resize();
        });

        render();
    }
}

new TileMapRoot();