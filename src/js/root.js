import * as THREE from 'three';
import * as Stats from './vendor/stats.min.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import Scene from './scene.js';
import AppUiLayer from './ui/app-ui-layer.js';
import SoundController from './sound-controller.js';
import LStorage from './ui/local-storage.js';
import Consequences from './players/consequences.js';

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
                viewLoading: true,
                curId: null,
                curState: null,
                curSecondaryState: null,
                curSecondaryTarget: null,
            },
            consequences: new Consequences(),
            initTime: null,
            floor: 0,
            moduleData: [],
            moduleMap: [],
            tileMap: [],
            astarMap: [],
            timeSpeed: 1,
            particles: 0,
            settings: {},
            defaultSettings: {
                maxSimultaneousParticles: 500,
                useOpacity: true,
            },
            localStorage: new LStorage(),
        };
        this.init();
    }

    init() {
        this.sceneState.initTime = this.getInitTime();
        console.log(this.sceneState.initTime);
        const appUiLayer = new AppUiLayer(this.sceneState);
        const soundController = new SoundController();

        this.getLocalSettingsData();

        const renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor('#000000');
        renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight);
        document.body.appendChild(renderer.domElement);

        const sceneController = new Scene(renderer, this.sceneState, appUiLayer, soundController);
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

        const camera = sceneController.getCamera();

        // POST PROCESSING FX:
        // const composer = new EffectComposer(renderer);
        // let renderPass = new RenderPass(scene, camera);
        // composer.addPass(renderPass);
        // let bloomPass = new BloomPass();
        // composer.addPass(bloomPass);
        // let unrealBloomPass = new UnrealBloomPass({x:256, y:256}, 0.5, 0.7, 0.75);
        // composer.addPass(unrealBloomPass);
        // let glitchPass = new GlitchPass();
        // composer.addPass(glitchPass);

        const render = function() {
            requestAnimationFrame(render);
            sceneController.doLoops();
            appUiLayer.renderUi();
            renderer.render(scene, camera);
            //composer.render();
            stats.update(); // Debug statistics
        };

        document.getElementsByTagName("body")[0].style.width = document.documentElement.clientWidth+"px";
        document.getElementsByTagName("body")[0].style.height = document.documentElement.clientHeight+"px";

        window.addEventListener('resize', () => {
            sceneController.resize();
            appUiLayer.resize();
            document.getElementsByTagName("body")[0].style.width = document.documentElement.clientWidth+"px";
            document.getElementsByTagName("body")[0].style.height = document.documentElement.clientHeight+"px";
        });

        render();
    }

    getInitTime() {
        let now = performance.now(),
            unixTimestamp = Date.now();
        return {
            s: unixTimestamp + now / 1000,
            performanceStart: now,
            dayName: "Mon",
            dayNameNumber: 1
        }
    }

    getLocalSettingsData() {
        // Get settings data from local storage
        let defaults = this.sceneState.defaultSettings;
        for (var key in defaults) {
            let lsValue = this.sceneState.localStorage.getItem(key, defaults[key]),
                curVal = defaults[key];
            if(typeof curVal == 'number') {
                lsValue = parseInt(lsValue);
            } else if(typeof curVal == 'boolean') {
                lsValue = lsValue == 'false' ? false : true;
            }
            // else leave as is (string)
            this.sceneState.settings[key] = lsValue;
        }
    }
}

new TileMapRoot();