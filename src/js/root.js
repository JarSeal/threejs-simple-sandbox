import * as THREE from 'three';
import * as Stats from './vendor/stats.min.js';
// import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
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
            uniforms: {},
            mixer: undefined,
            clock: new THREE.Clock(),
            timeSpeed: 1,
            particles: 0,
            settings: {},
            defaultSettings: {
                maxSimultaneousParticles: 500,
                useOpacity: true,
            },
            localStorage: new LStorage(),
            renderCalls: [],
            outlinePass: null,
            outlinePassObjects: [],
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
        // renderer.setPixelRatio(window.devicePixelRatio);
        // renderer.gammaFactor = 2.2;
        // renderer.gammaOutput = true;
        document.body.appendChild(renderer.domElement);

        const sceneController = new Scene(renderer, this.sceneState, appUiLayer, soundController);
        const scene = sceneController.loadScene(this.sceneState.ui.view);

        // const effect = new OutlineEffect(renderer, {defaultThickness: 0.0045});
        
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

        // Postprocessing [START]
        const pixelRatio = window.devicePixelRatio || 1;
        const composer = new EffectComposer(renderer);
        composer.setPixelRatio = pixelRatio;
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        this.sceneState.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
        // this.sceneState.outlinePass.depthMaterial.skinning = true;
        this.sceneState.outlinePass.prepareMaskMaterial.skinning = true;
        this.sceneState.outlinePass.prepareMaskMaterial.transparent = true;
        this.sceneState.outlinePass.prepareMaskMaterial.depthWrite = false;
        this.sceneState.outlinePass.prepareMaskMaterial.depthTest = true;
        // this.sceneState.outlinePass.overlayMaterial.blending = THREE.SubtractiveBlending;
        this.sceneState.outlinePass.overlayMaterial.blending = THREE.NormalBlending;
        this.sceneState.outlinePass.edgeThickness = 0.1;
        this.sceneState.outlinePass.edgeStrength = 3;
        this.sceneState.outlinePass.edgeGlow = 0;
        this.sceneState.outlinePass.setSize(window.innerWidth, window.innerHeight);
        this.sceneState.outlinePass.visibleEdgeColor.set('#000000');
        this.sceneState.outlinePass.hiddenEdgeColor.set('#66ffff');
        this.sceneState.outlinePass.selectedObjects = this.sceneState.outlinePassObjects;
        console.log(this.sceneState.outlinePass);
        composer.addPass(this.sceneState.outlinePass);
        this.sceneState.effectFXAA = new ShaderPass(FXAAShader);
        this.sceneState.effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        composer.addPass(this.sceneState.effectFXAA);
        // Postprocessing [END]
        
        let renderCallerI = 0,
            renderCalls = this.sceneState.renderCalls,
            delta;
        const render = () => {
            requestAnimationFrame(render);
            delta = this.sceneState.clock.getDelta();
            sceneController.doLoops();
            appUiLayer.renderUi();
            this.setShaderTime();
            if(this.sceneState.mixer) this.sceneState.mixer.update(delta);
            for(renderCallerI=0; renderCallerI<renderCalls.length; renderCallerI++) {
                renderCalls[renderCallerI](delta);
            }
            composer.render();
            //renderer.render(scene, camera);
            //effect.render(scene, camera);
            stats.update(); // Debug statistics
        };

        document.getElementsByTagName('body')[0].style.width = document.documentElement.clientWidth+'px';
        document.getElementsByTagName('body')[0].style.height = document.documentElement.clientHeight+'px';

        window.addEventListener('resize', () => {
            sceneController.resize();
            appUiLayer.resize();
            document.getElementsByTagName('body')[0].style.width = document.documentElement.clientWidth+'px';
            document.getElementsByTagName('body')[0].style.height = document.documentElement.clientHeight+'px';
        });

        render();
    }

    setShaderTime() {
        let elapsedMilliseconds = Date.now() - this.sceneState.initTime.ms;
        let elapsedSeconds = elapsedMilliseconds / 1000.0;
        this.sceneState.uniforms['uTime'] = { value: 60.0 * elapsedSeconds };
    }

    getInitTime() {
        let now = performance.now(),
            unixTimestamp = Date.now();
        return {
            s: unixTimestamp + now / 1000,
            ms: unixTimestamp + now,
            performanceStart: now,
            dayName: 'Mon',
            dayNameNumber: 1
        };
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