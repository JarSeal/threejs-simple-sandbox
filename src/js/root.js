import * as THREE from 'three';
import * as Stats from './vendor/stats.min.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples//jsm/postprocessing/SMAAPass.js';
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
            mixers: [],
            clock: new THREE.Clock(),
            timeSpeed: 1,
            particles: 0,
            rendererAntialiasing: null,
            settings: {},
            defaultSettings: {
                soundFxOn: true,
                useRendererAntialiasing: false,
                rendererPixelRatio: window.devicePixelRatio || 1,
                usePostProcessing: false,
                useSmaa: true,
                useUnrealBloom: false,
                debugStatsMode: 0
            },
            localStorage: new LStorage(),
            renderCalls: [],
            postProcess: {},
            getScreenResolution: this.getScreenResolution,
            shadersToUpdate: [],
        };
        this.init();
    }

    init() {
        this.sceneState.initTime = this.getInitTime();
        const appUiLayer = new AppUiLayer(this.sceneState);
        this.getLocalSettingsData();
        const soundController = new SoundController(this.sceneState);

        this.sceneState.rendererAntialiasing = this.sceneState.settings.useRendererAntialiasing || false;
        const renderer = new THREE.WebGLRenderer({
            antialias: this.sceneState.rendererAntialiasing
        });
        renderer.setClearColor('#000000');
        const screenSize = this.getScreenResolution();
        renderer.setSize(screenSize.x, screenSize.y);
        renderer.domElement.id = 'main-stage';
        document.body.appendChild(renderer.domElement);

        const sceneController = new Scene(renderer, this.sceneState, appUiLayer, soundController);
        const scene = sceneController.loadScene(this.sceneState.ui.view);
        
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
        const createStats = () => {
            const s = new Stats();
            s.setMode(this.sceneState.settings.debugStatsMode);
            return s;
        };
        const stats = createStats();

        stats.domElement.id = 'debug-stats-wrapper';
        document.body.appendChild(stats.domElement);
        // Debug statisctics [END]

        const camera = sceneController.getCamera();

        // Postprocessing [START]
        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        this.sceneState.postProcess.unrealBloom = new UnrealBloomPass(
            new THREE.Vector2(
                this.sceneState.getScreenResolution().x,
                this.sceneState.getScreenResolution().y
            ), 0.5, 0.5, 0.8);
        composer.addPass(this.sceneState.postProcess.unrealBloom);
        this.sceneState.postProcess.smaa = new SMAAPass(
            window.innerWidth * this.sceneState.settings.rendererPixelRatio,
            window.innerHeight * this.sceneState.settings.rendererPixelRatio
        );
        composer.addPass(this.sceneState.postProcess.smaa);
        // Postprocessing [END]
        
        let renderCallerI = 0,
            renderCalls = this.sceneState.renderCalls,
            delta,
            settings = this.sceneState.settings;
        const render = () => {
            requestAnimationFrame(render);
            delta = this.sceneState.clock.getDelta();
            sceneController.doLoops();
            appUiLayer.renderUi();
            this.setShaderTime(delta);
            this.updateMixers(delta);
            for(renderCallerI=0; renderCallerI<renderCalls.length; renderCallerI++) {
                renderCalls[renderCallerI](delta);
            }
            if(settings.usePostProcessing) {
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
            if(this.sceneState.updateSettingsNextRender) this.updateRenderSettings(renderer, composer, stats);
            if(settings.debugStatsMode !== -1) stats.update(); // Debug statistics
        };

        document.getElementsByTagName('body')[0].style.width = this.sceneState.getScreenResolution().x + 'px';
        document.getElementsByTagName('body')[0].style.height = this.sceneState.getScreenResolution().x + 'px';

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                sceneController.resize();
                appUiLayer.resize();
                this.resizePostProcessors(renderer, composer);
                document.getElementsByTagName('body')[0].style.width = this.sceneState.getScreenResolution().x + 'px';
                document.getElementsByTagName('body')[0].style.height = this.sceneState.getScreenResolution().y + 'px';
            }, 500);
        });

        render();
        this.updateRenderSettings(renderer, composer, stats);
    }

    setShaderTime(delta) {
        let i = 0;
        const shadersLength = this.sceneState.shadersToUpdate.length,
            now = performance.now();
        for(i=0; i<shadersLength; i++) {
            this.sceneState.shadersToUpdate[i].material.uniforms.deltaTime.value = delta;
            this.sceneState.shadersToUpdate[i].material.uniforms.uTime.value = now;
        }
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

    getScreenResolution() {
        return {
            x: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
            y: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        };
    }

    resizePostProcessors(renderer, composer) {
        const width = this.sceneState.getScreenResolution().x,
            height = this.sceneState.getScreenResolution().y;
        if(this.sceneState.postProcess.unrealBloom) {
            this.sceneState.postProcess.unrealBloom.resolution = new THREE.Vector2(width, height);
            this.sceneState.postProcess.unrealBloom.setSize(
                width,
                height
            );
        }
        if(this.sceneState.postProcess.smaa) {
            this.sceneState.postProcess.smaa.setSize(
                width * this.sceneState.settings.rendererPixelRatio,
                height * this.sceneState.settings.rendererPixelRatio
            );
        }
        renderer.setSize(width, height);
        composer.setSize(width, height);
        renderer.setPixelRatio(this.sceneState.settings.rendererPixelRatio);
        composer.setPixelRatio(this.sceneState.settings.rendererPixelRatio);
    }

    getLocalSettingsData() {
        // Get settings data from local storage
        const defaults = this.sceneState.defaultSettings;
        for (var key in defaults) {
            let lsValue = this.sceneState.localStorage.getItem(key, defaults[key]),
                curVal = defaults[key];
            if(lsValue) {
                if(typeof curVal === 'number') {
                    lsValue = parseFloat(lsValue);
                } else if(typeof curVal === 'boolean') {
                    lsValue = lsValue === 'false' ? false : true;
                }
                // else leave as is (string)
                this.sceneState.settings[key] = lsValue;
            } else {
                this.sceneState.settings[key] = curVal;
            }
        }
    }

    updateRenderSettings(renderer, composer, stats) {
        const settings = this.sceneState.settings;
        if(this.sceneState.postProcess.smaa) {
            this.sceneState.postProcess.smaa.enabled = settings.useSmaa || false;
        }
        if(this.sceneState.postProcess.unrealBloom) {
            this.sceneState.postProcess.unrealBloom.enabled = settings.useUnrealBloom || false;
        }
        if(this.sceneState.rendererAntialiasing !== settings.useRendererAntialiasing) {
            if(settings.useRendererAntialiasing) {
                this.sceneState.localStorage.setItem('usePostProcessing', false);
            }
            setTimeout(() => {
                location.reload();
            }, 300);
        }

        renderer.setPixelRatio(settings.rendererPixelRatio);
        composer.setPixelRatio(settings.rendererPixelRatio);
        
        document.getElementById('debug-stats-wrapper').style.display = settings.debugStatsMode === -1 ? 'none' : 'block';
        stats.setMode(settings.debugStatsMode === -1 ? 0 : settings.debugStatsMode);

        this.sceneState.updateSettingsNextRender = false;
    }

    updateMixers(delta) {
        const mixers = this.sceneState.mixers;
        mixers.forEach(mixer => {
            mixer.update(delta);
        });
    }
}

new TileMapRoot();