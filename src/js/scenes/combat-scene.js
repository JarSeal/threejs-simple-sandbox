import * as THREE from 'three';
import TileMapCamera from './../tilemap-camera.js';
import LoadTileMap from './../tilemap/load-map.js';
import PlayerController from './../players/player-controller.js';
import DoorAnimationController from './../players/door-animation-controller.js';
import VisualEffects from './../vfx/VisualEffects.js';

class CombatScene {
    constructor() {
        this.scene;
        this.sceneState;
        this.camera;
        this.tileMapCamera;
        this.tileMapController;
        this.playerController;
        this.lastCheckInterval = 2000; // in milliseconds
        this.lastConsequenceCheck = performance.now();
        this.VisualEffects;
    }

    initView(renderer, sceneState, AppUiLayer, SoundController) {
        this.scene = new THREE.Scene();
        this.sceneState = sceneState;

        const hemi = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.65);
        hemi.position.set(32, -32, 5);
        this.scene.add(hemi);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

        this.VisualEffects = new VisualEffects(this.scene, this.sceneState);

        const doorAnimationController = new DoorAnimationController(this.scene, sceneState, SoundController);
        this.playerController = new PlayerController(this.scene, sceneState, doorAnimationController, SoundController, this.VisualEffects);

        this.tileMapCamera = new TileMapCamera(this.scene, renderer, sceneState, AppUiLayer, this.playerController);
        this.camera = this.tileMapCamera.getCamera();

        this.playerController.createNewPlayer(this.scene, renderer, sceneState, 'hero');
        this.tileMapCamera.centerCamera(this.sceneState.players.hero.pos);

        this.tileMapController = new LoadTileMap(this.scene, renderer, sceneState);
        this.VisualEffects.cacheEffects();

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
        if(this.lastConsequenceCheck + this.lastCheckInterval < performance.now()) {
            this.sceneState.consequences.checkAllHitTimes(this.scene);
            this.lastConsequenceCheck = performance.now();
        }
    }
}

export default CombatScene;