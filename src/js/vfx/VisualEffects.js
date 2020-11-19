import * as THREE from 'three';
import hitBlastFx from './combat/hit-blast-fx.js';
import projectileFx from './combat/projectile-fx.js';
import sparksFx from './combat/sparks-fx.js';
import { logger } from '../util.js';
import {
    NodeFrame,
    MathNode,
    OperatorNode,
    TextureNode,
    Vector2Node,
    TimerNode,
    SwitchNode,
    UVNode,
    BasicNodeMaterial,
    FloatNode
} from 'three/examples/jsm/nodes/Nodes.js';

class VisualEffects {
    constructor(scene, sceneState) {
        this.scene = scene;
        this.sceneState = sceneState;
        this.vfxMap = new THREE.TextureLoader().load('/images/sprites/vfx-atlas-01.png');
        this.vfxMaterial = new THREE.MeshBasicMaterial({
            map: this.vfxMap,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true,
        });
        this.anims = {
            count: 0,
            fired: [],
            meshCount: {},
        };
        this.effectMeshes = {};
        this.effectData = {};
        sceneState.renderCalls.push(this.animate);

        this.effectsFrame = new NodeFrame();

        // this.createExampleNode(scene);
    }

    createEffectMaterial(hCount, vCount, startU, startV, frames, speed = 60, cols) {
        const uTime = { value: 0 };
        const uTotalTime = { value: this._randomFloatInBetween(3.0, 6.0) };
        const uBurnSize = { value: this._randomIntInBetween(6, 9) / 100 };
        const uLavaSize = { value: this._randomIntInBetween(3, 6) / 100 };
        const uniforms = {
            uTime: uTime,
            uTotalTime: uTotalTime,
            uBurnSize: uBurnSize,
            uLavaSize: uLavaSize,
        };
        const vertexShader = `
        uniform float uTime;
        uniform float uTotalTime;
        uniform float uBurnSize;
        uniform float uLavaSize;
        varying vec2 vUv;
        varying float time;
        varying float totalTime;
        varying float burnSize;
        varying float lavaSize;
        void main() {
            vUv = uv;
            time = uTime;
            totalTime = uTotalTime;
            burnSize = uBurnSize;
            lavaSize = uLavaSize;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`;

        const fragmentShader = `
        // #ifdef GL_ES
        // precision mediump float;
        // #endif

        varying vec2 vUv;
        varying float time;
        varying float totalTime;
        varying float burnSize;
        varying float lavaSize;

        void main() {
            vec4 black_alpha_color = vec4(0.0, 0.0, 0.0, 0.0);
            float burn_border_size = 0.1 * (1.0 - time);
            float burn_radius = burnSize * (1.0 - time);
            vec4 burn_color = vec4(0.0, 0.0, 0.0, 1.0);
            if(burn_radius < 0.01) {
                burn_radius = 0.0;
            }
            float lava_radius = lavaSize;
            vec4 lava_color = vec4(1.0, 0.4941, 0.0, 1.0);
            if(time > 0.4) {
                lava_radius = lavaSize * (1.4 - time * 1.5);
                lava_color.rgb = vec3(lava_color.r * (1.4 - time * 1.5),lava_color.g * (1.4 - time * 1.5),lava_color.b * (1.4 - time * 1.5));
            }
            if(lava_radius < 0.01) {
                lava_radius = 0.0;
                lava_color = vec4(0.0, 0.0, 0.0, 0.0);
            }
            
            vec2 uv = vUv;
            uv -= vec2(0.5, 0.5);
            float dist = sqrt(dot(uv, uv));
            float burn_t = smoothstep(burn_radius+burn_border_size, burn_radius-burn_border_size, dist);
            vec4 burnSpot = mix(black_alpha_color, burn_color, burn_t);
            float lava_t = smoothstep(lava_radius+0.01, lava_radius-0.01, dist);
            
            gl_FragColor = mix(burnSpot, lava_color, lava_t);
            if(gl_FragColor.a < 0.001) {
                discard;
            }
        }
        `;

        return {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        };
    }

    createHorizontalSpriteSheetNode(hCount, vCount, startU, startV, frames, speed = 60, cols) {
        const c = cols ? cols : frames;
        const animSpeed = new Vector2Node(speed, speed);
        const scale = new Vector2Node(1/hCount, 1/vCount);

        const uvTimer = new OperatorNode(
            new TimerNode(),
            animSpeed,
            OperatorNode.MUL
        );
        const frameCounter = new MathNode(
            uvTimer,
            new FloatNode(frames),
            MathNode.MOD
        );
        const frameAsInteger = new MathNode(
            frameCounter,
            MathNode.FLOOR
        );
        const rowCounter = new OperatorNode(
            frameAsInteger,
            new FloatNode(c),
            OperatorNode.DIV
        );
        const rowAsInteger = new MathNode(
            rowCounter,
            MathNode.FLOOR
        );
        const columnAsInteger = new MathNode(
            frameAsInteger,
            new FloatNode(c),
            MathNode.MOD
        );

        const rowOffset = new OperatorNode(
            rowAsInteger,
            new Vector2Node(0, 1/vCount),
            OperatorNode.MUL
        );
        const columnOffset = new OperatorNode(
            columnAsInteger,
            new Vector2Node(1/hCount, 0),
            OperatorNode.MUL
        );

        const offsetWithColumnOffset = new OperatorNode(
            columnOffset,
            new Vector2Node(startU, startV),
            OperatorNode.ADD
        );
        const offsetWithBothOffsets = new OperatorNode(
            offsetWithColumnOffset,
            rowOffset,
            OperatorNode.SUB
        );

        const uvScale = new OperatorNode(
            new UVNode(),
            scale,
            OperatorNode.MUL
        );
        const curUvFrame = new OperatorNode(
            uvScale,
            offsetWithBothOffsets,
            OperatorNode.ADD
        );

        return curUvFrame;
    }

    createFxMaterial(key) {
        const mtl = new BasicNodeMaterial();
        const texture = new TextureNode(this.vfxMap);
        texture.uv = this.createHorizontalSpriteSheetNode(
            32,                                  // hCount
            32,                                  // vCount
            this.effectData[key].startPosU,
            this.effectData[key].startPosV,
            this.effectData[key].totalFrames,
            this.effectData[key].speed,
            this.effectData[key].columns,
        );
        mtl.color = texture;
        mtl.side =  THREE.DoubleSide;
        mtl.alpha = new MathNode(new SwitchNode(mtl.color, 'a'), OperatorNode.ADD);
        mtl.depthWrite = false;
        return mtl;
    }

    getEffectMesh(key, id) {
        const masterMesh = this.effectMeshes[key];
        const newMesh = masterMesh.clone();
        newMesh.name = id;
        return newMesh;
    }

    startAnim(data) {
        const meshName = data.meshName;
        const combined = Object.assign(
            {},
            this.effectData[meshName],
            { animStart: performance.now() },
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

    animate = (delta) => {
        const count = this.anims.count;
        if(!count) return;
        let i = 0;
        const endAnims = [];
        this.effectsFrame.update(delta);
        for(i=0; i<count; i++) {
            const fired = this.anims.fired[i];
            const mesh = fired.mesh;
            this.effectsFrame.updateNode(mesh.material);
            if(fired.animLength && fired.animLength + fired.animStart < performance.now()) {
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
        this.effectMeshes[effectName + '_' + type].material = this.createFxMaterial(effectName + '_' + type);
        this.cacheEffect(effectName + '_' + type);
    }

    createExampleNode(scene) {
        const id = 'some-id';
        const mesh = this.getEffectMesh('sparks_wallHit', id);
        mesh.name = id;
        mesh.scale.set(1, 1, 1);
        mesh.position.set(35, 43, 1);
        scene.add(mesh);
        this.startAnim({
            id: id,
            clone: true,
            meshName: 'sparks_wallHit',
            mesh: mesh
        });
    }
}

export default VisualEffects;
