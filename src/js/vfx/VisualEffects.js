import * as THREE from 'three';
import hitBlastFx from './combat/hit-blast-fx.js';
import projectileFx from './combat/projectile-fx.js';
import sparksFx from './combat/sparks-fx.js';
import {
    NodeFrame,
    SpriteNodeMaterial,
    MathNode,
    OperatorNode,
    TextureNode,
    Vector2Node,
    TimerNode,
    SwitchNode,
    FunctionNode,
    FunctionCallNode,
    PositionNode,
    UVNode,
    UVTransformNode,
    BasicNodeMaterial,
    PhongNodeMaterial,
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

        this.frame = new NodeFrame();
        console.log('FRAME', this.frame);
        this.mesh;
        this.uvStart = { u: -0.5 + 0.03125 / 2, v: 0.5 - 0.03125 / 2 };
        this.uvStart = { u: 0, v: 1 - (1/32) };
        this.createTestNode(scene);
    }

    createHorizontalSpriteSheetNode(hCount, speed) {
        var speed = new Vector2Node(30, 0); // frame per second
        var scale = new Vector2Node(1/32, 1/32); // 32 horizontal and vertical images in sprite-sheet
        
        // var timer = new TimerNode();

        var uvTimer = new OperatorNode(
            new TimerNode(),
            speed,
            OperatorNode.MUL
        );

        var uvTimerFrameCounter = new MathNode(
            uvTimer,
            new FloatNode(7),
            MathNode.MOD
        );

        var uvIntegerTimer = new MathNode(
            uvTimerFrameCounter,
            MathNode.FLOOR
        );

        var uvFrameOffset = new OperatorNode(
            uvIntegerTimer,
            new Vector2Node(1/32, 1),
            OperatorNode.MUL
        );

        var offset = new OperatorNode(
            uvFrameOffset,
            new Vector2Node(this.uvStart.u, this.uvStart.v),
            OperatorNode.ADD
        );

        var uvScale = new OperatorNode(
            new UVNode(),
            scale,
            OperatorNode.MUL
        );

        var uvFrame = new OperatorNode(
            uvScale,
            offset,
            OperatorNode.ADD
        );

        return uvFrame;
    }

    createTestNode(scene) {
        const geo = new THREE.PlaneBufferGeometry(5, 5, 1);
        this.mesh = new THREE.Mesh(geo);
        const mtl = new BasicNodeMaterial();
        const texture = new TextureNode(this.vfxMap);
        // texture.uv = new UVTransformNode();
        // texture.uv.setUvTransform(this.uvStart.u, this.uvStart.v, 0.03125, 0.03125, 0);
        texture.uv = this.createHorizontalSpriteSheetNode(32, 10);
        mtl.color = texture;
        mtl.side =  THREE.DoubleSide;
        mtl.alpha = new MathNode(new SwitchNode(mtl.color, 'a'), OperatorNode.ADD);
        this.mesh.material = mtl;
        this.mesh.position.set(35, 43, 1);
        scene.add(this.mesh);
        console.log("TESERRET", this.mesh.material.color);
    }

    getEffectMesh(key, cloneGeo) {
        const masterMesh = this.effectMeshes[key];
        if(!masterMesh) {
            console.error('Game engine error: Could not locate effect (effect mesh has not been created) ' + key + '.');
            return;
        }
        if(cloneGeo) {
            return new THREE.Mesh(masterMesh.geometry.clone(), masterMesh.material);
        } else {
            return masterMesh.clone();
        }
    }

    startAnim(data) {
        const meshName = data.meshName;
        const combined = Object.assign({}, this.effectData[meshName], data);
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

    animate = (delta, renderer) => {
        this.frame.update(delta).updateNode(this.mesh.material);

        const count = this.anims.count;
        if(!count) return;
        let i = 0,
            j = 0,
            newX,
            newXPrev,
            uvAttribute;
        const endAnims = [];
        for(i=0; i<count; i++) {
            const fired = this.anims.fired[i];
            if(performance.now() - fired.lastUpdate < fired.interval) break;
            newX = fired.spriteXlen * fired.frame + fired.startPosU;
            newXPrev = fired.spriteXlen * (fired.frame - 1) + fired.startPosU;
            uvAttribute = fired.geo.attributes.uv;
            for(j=0; j<fired.rectSets; j++) {
                const indexAdder = j * 4;
                uvAttribute.setXY(0+indexAdder, newXPrev, fired.startPosV);
                uvAttribute.setXY(1+indexAdder, newX, fired.startPosV);
                uvAttribute.setXY(2+indexAdder, newXPrev, fired.startPosV - fired.spriteYlen);
                uvAttribute.setXY(3+indexAdder, newX, fired.startPosV - fired.spriteYlen);
            }
            uvAttribute.needsUpdate = true;
            this.anims.fired[i].lastUpdate = performance.now();
            if(fired.frame === fired.totalFrames) {
                if(!fired.loop) endAnims.push(fired);
                this.anims.fired[i].frame = 1;
            } else {
                this.anims.fired[i].frame++;
            }
        }
        const endAnimsLength = endAnims.length;
        for(i=0; i<endAnimsLength; i++) {
            const end = endAnims[i];
            if(end.clone) end.geo.dispose();
            if(end.onComplete) end.onComplete();
            this.removeAnim(end.id);
        }

        // Node material anims
        let modulo = Math.floor((this.sceneState.clock.getElapsedTime() * 10) % 16);
        console.log(modulo);
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

    createEffect = (effectName, type) => {
        switch(effectName) {
        case 'hitBlast':
            hitBlastFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData);
            break;
        case 'projectile':
            projectileFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData);
            break;
        case 'sparks':
            sparksFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData);
            break;
        default: console.error('Game engine error: could not create effect with name "' + effectName + '" and type "' + type + '".');
        }
        this.cacheEffect(effectName + '_' + type);
    }
}

export default VisualEffects;
