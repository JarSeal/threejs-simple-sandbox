import * as THREE from 'three';
import TileMapCamera from './../tilemap-camera.js';
import LoadTileMap from './../tilemap/load-map.js';
import PlayerController from '../players/PlayerController.js';
import { getPlayer } from '../data/dev-player.js'; // GET NEW PLAYER DUMMY DATA HERE
import DoorAnimationController from './../players/door-animation-controller.js';
import VisualEffects from './../vfx/VisualEffects.js';

class CombatScene {
    constructor() {
        this.scene;
        this.sceneState;
        this.camera;
        this.tileMapCamera;
        this.tileMapController;
        this.Hero;
        this.TempDude;
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

        const playerData = getPlayer();
        playerData.pos = playerData.microPos = [35, 43, 0]; // Temp position injection
        this.Hero = new PlayerController(
            playerData,
            this.scene,
            sceneState,
            doorAnimationController,
            SoundController,
            this.VisualEffects
        );

        const playerData2 = getPlayer(); // Temp player to shoot at
        playerData2.pos = playerData2.microPos = [33, 43, 0];
        playerData2.type = 'npc';
        playerData2.id = 'tadaa';
        this.TempDude = new PlayerController(
            playerData2,
            this.scene,
            sceneState,
            doorAnimationController,
            SoundController,
            this.VisualEffects
        );

        this.tileMapCamera = new TileMapCamera(this.scene, renderer, sceneState, AppUiLayer, this.Hero);
        this.camera = this.tileMapCamera.getCamera();

        // this.Hero.createNewPlayer(this.scene, renderer, sceneState, 'hero');
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
        this.Hero.setPositions();
        this.TempDude.setPositions();
        this.tileMapController.moduleAnims(this.scene);
        if(this.lastConsequenceCheck + this.lastCheckInterval < performance.now()) {
            this.sceneState.consequences.checkAllHitTimes(this.scene);
            this.lastConsequenceCheck = performance.now();
        }
    }
}

export default CombatScene;