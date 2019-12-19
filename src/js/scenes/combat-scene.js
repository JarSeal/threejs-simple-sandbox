import TileMapCamera from './../tilemap-camera.js';
import LoadTileMap from './../tilemap/load-map.js';
import PlayerController from './../players/player-controller.js';

class CombatScene {
    constructor() {
        this.scene;
        this.camera;
        this.tileMapCamera;
        this.tileMapController;
        this.playerController;    }

    initView(renderer, sceneState, logMessage) {
        const objLoader = new THREE.OBJLoader();
        const mtlLoader = new THREE.MTLLoader();
        objLoader.setPath('/images/objects/');
        mtlLoader.setPath('/images/objects/');

        this.scene = new THREE.Scene();
        
        this.tileMapController = new LoadTileMap(mtlLoader, objLoader, this.scene, renderer, sceneState);
        this.playerController = new PlayerController(sceneState);
        this.playerController.createNewPlayer(mtlLoader, objLoader, this.scene, renderer, sceneState, 'hero');

        let hemi = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.8 );
        this.scene.add(hemi);
        this.scene.add(new THREE.AmbientLight(0xf0f0f0, 0.5));

        this.tileMapCamera = new TileMapCamera(this.scene, renderer, sceneState, logMessage);
        this.camera = this.tileMapCamera.getCamera();

        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    resize() {
        this.tileMapCamera.resize();
    }

    doLoops() {
        this.playerController.setPositions();
        this.tileMapController.moduleAnims(this.scene);
    }
}

export default CombatScene