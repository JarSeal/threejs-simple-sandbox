import * as THREE from 'three';
import hitBlastFx from './combat/hit-blast-fx.js';
import projectileFx from './combat/projectile-fx.js';
import sparksFx from './combat/sparks-fx.js';
// import particleSparksFx from './combat/particle-sparks-fx.js';
import { logger } from '../util.js';

class VisualEffects {
    constructor(scene, sceneState) {
        this.scene = scene;
        this.sceneState = sceneState;
        this.vfxMap = new THREE.TextureLoader().load('/images/sprites/vfx-atlas-01.png');
        this.anims = {
            count: 0,
            fired: [],
            meshCount: {},
        };
        this.effectMeshes = {};
        this.effectData = {};
        sceneState.renderCalls.push(this.animate);

        this.fxWorker = new Worker('/webworkers/workerFx.js');

        // this.createEffect('sparks', 'wallHit');
        // this.createEffect('projectile', 'redBlast');
        // this.createEffect('hitBlast', 'basic');
        // this.createExampleNode(scene);
    }

    createEffectMaterial(hCount, vCount, startU, startV, frames, loopLength, speed = 60, cols) {
        const columns = cols ? cols : frames;
        const uniforms = {
            uTime: { value: 0 },
            uStartTime: { value: 0 },
            mapTexture: { type: 't', value: this.vfxMap },
            xScale: { value: 1/hCount },
            yScale: { value: 1/vCount },
            xStart: { value: startU },
            yStart: { value: startV },
            totalFrames: { value: frames },
            columns: { value: columns },
            frameRate: { value: speed },
            loopLength: { value: loopLength }
        };
        const vertexShader = `
        uniform float uTime;
        uniform float uStartTime;
        uniform float xScale;
        uniform float yScale;
        uniform float xStart;
        uniform float yStart;
        uniform float totalFrames;
        uniform float columns;
        uniform float frameRate;
        uniform float loopLength;
        varying vec2 vUv;
        varying float _uTime;
        varying float _uStartTime;
        varying float _xScale;
        varying float _yScale;
        varying float _xStart;
        varying float _yStart;
        varying float _totalFrames;
        varying float _columns;
        varying float _frameRate;
        varying float _loopLength;
        void main() {
            vUv = uv;
            _uTime = uTime;
            _uStartTime = uStartTime;
            _xScale = xScale;
            _yScale = yScale;
            _xStart = xStart;
            _yStart = yStart;
            _totalFrames = totalFrames;
            _columns = columns;
            _frameRate = frameRate;
            _loopLength = loopLength;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`;

        const fragmentShader = `
        uniform sampler2D mapTexture;
        varying vec2 vUv;
        varying float _uTime;
        varying float _uStartTime;
        varying float _xScale;
        varying float _yScale;
        varying float _xStart;
        varying float _yStart;
        varying float _totalFrames;
        varying float _columns;
        varying float _frameRate;
        varying float _loopLength;

        void main() {
            // get total elapsed time
            float elapsedTime = _uTime - _uStartTime;

            // get local elapsed time
            float localElapsedTime = mod(elapsedTime, _loopLength);

            // get one frame's length in ms
            float frameLength = _loopLength / _totalFrames;

            // // get current frame number as a whole number (float)
            float frameNumber = floor(localElapsedTime / frameLength);

            // get current row number as a whole number (float)
            float rowNumber = floor(frameNumber / _columns);

            // get current column number as whole number (float)
            float columnNumber = floor(mod(frameNumber, _columns));

            // get row offset (vertical offset)
            vec2 rowOffset = rowNumber * vec2(0, _yScale);

            // get column offset (horisontal offset)
            vec2 colOffset = columnNumber * vec2(_xScale, 0) + vec2(vUv.x * _xScale + _xStart,  1. - vUv.y * _yScale - _yStart);

            // get both offsets
            vec2 bothOffsets = colOffset - rowOffset;

            vec4 texMex = texture2D(mapTexture, bothOffsets);
            gl_FragColor = vec4(texMex);

            // vec4 background = vec4(1., 0., 0., 0.5);
            // vec3 blendering = texMex.rgb * texMex.a + background.rgb * background.a * (1.0 - texMex.a);
            // gl_FragColor = vec4(blendering, 1.0);
        }`;

        return {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        };
    }

    createFxMaterial(key) {
        const mtl = new THREE.ShaderMaterial(
            this.createEffectMaterial(
                this.effectData[key].atlasHCount,
                this.effectData[key].atlasVCount,
                this.effectData[key].startPosU,
                this.effectData[key].startPosV,
                this.effectData[key].totalFrames,
                this.effectData[key].loopLength,
                this.effectData[key].speed,
                this.effectData[key].columns,
            )
        );
        mtl.side =  THREE.DoubleSide;
        mtl.depthWrite = false;
        return mtl;
    }

    getEffectMesh(key, id) {
        const masterMesh = this.effectMeshes[key];
        const newMesh = masterMesh.clone();
        newMesh.material = this.createFxMaterial(key);
        newMesh.name = id;
        return newMesh;
    }

    startAnim(data) {
        const meshName = data.meshName;
        data.mesh.material.uniforms.uStartTime.value = performance.now();
        const combined = Object.assign(
            {},
            this.effectData[meshName],
            data);
        !this.anims.meshCount[meshName]
            ? this.anims.meshCount[meshName] = 1
            : this.anims.meshCount[meshName]++;
        this.anims.count++;
        this.anims.fired.push(combined);
    }

    removeAnim = (id) => {
        const count = this.anims.count,
            fired = this.anims.fired;
        let projIndex = undefined,
            i = 0,
            meshName;
        for(i=0; i<count; i++) {
            if(fired[i].id == id) {
                projIndex = i;
                meshName = fired[i].meshName;
                break;
            }
        }
        if(projIndex !== undefined) {
            this.anims.fired.splice(projIndex, 1);
            this.anims.count--;
            if(this.anims.meshCount[meshName]) this.anims.meshCount[meshName]--;
        }
    }

    animate = () => {
        const count = this.anims.count;
        if(!count) return;
        let i = 0;
        const endAnims = [];
        for(i=0; i<count; i++) {
            const fired = this.anims.fired[i];
            const mesh = fired.mesh;
            mesh.material.uniforms.uTime.value = performance.now();
            if(!fired.loop && fired.loopLength + mesh.material.uniforms.uStartTime.value < performance.now()) {
                endAnims.push(fired);
            }
        }
        const endAnimsLength = endAnims.length;
        for(i=0; i<endAnimsLength; i++) {
            const end = endAnims[i];
            if(end.clone) end.geo.dispose();
            if(end.onComplete) end.onComplete();
            this.removeAnim(end.id);
        }
    }

    cacheEffects() {
        for (const property in this.effectMeshes) {
            this.cacheEffect(property);
        }
    }

    cacheEffect(meshId) {
        if(!this.sceneState.players.hero || !this.sceneState.players.hero.pos) return;
        const tempMesh = this.getEffectMesh(meshId),
            heroPos = this.sceneState.players.hero.pos;
        tempMesh.position.set(heroPos[0], heroPos[1], -8);
        this.scene.add(tempMesh);
        setTimeout(() => this.scene.remove(tempMesh), 1000); // This is currently pretty dirty, but works.
    }

    createEffect = (effectName, type, options = {}) => {
        switch(effectName) {
        case 'hitBlast':
            hitBlastFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData, options);
            break;
        case 'projectile':
            projectileFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData, options);
            break;
        case 'sparks':
            sparksFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData, options);
            break;
        default: logger.error('Could not create effect with name "' + effectName + '" and type "' + type + '".');
        }
        this.cacheEffect(effectName + '_' + type);
    }

    createExampleNode(scene) {
        const id = 'some-id';
        const mesh = this.getEffectMesh('hitBlast_basic', id);
        mesh.name = id;
        mesh.scale.set(1, 1, 1);
        mesh.position.set(35, 43, 1.5);
        scene.add(mesh);
        this.startAnim({
            id: id,
            clone: true,
            meshName: 'hitBlast_basic',
            mesh: mesh,
            loop: true
        });
    }

    calculate(request) {
        this.fxWorker.postMessage(request);
        return this.fxWorker;
    }
}

export default VisualEffects;
