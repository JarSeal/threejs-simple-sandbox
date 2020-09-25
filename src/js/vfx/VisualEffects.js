import * as THREE from 'three';
import hitBlastFx from './combat/hit-blast-fx.js';
import projectileFx from './combat/projectile-fx.js';

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
    }

    getEffectMesh(key, cloneGeo) {
        const masterMesh = this.effectMeshes[key];
        if(!masterMesh) {
            console.error('Game engine error: Could not locate effect (it has not been created) ' + key + '.');
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

    animate = () => {
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
        case "hitBlast":
            hitBlastFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData);
            break;
        case "projectile":
            projectileFx(effectName, type, this.vfxMaterial, this.effectMeshes, this.effectData);
            break;
        default: console.error('Game engine error: could not create effect with name "' + effectName + '" and type "' + type + '".');
        }
        this.cacheEffect(effectName + '_' + type);
    }
}

export default VisualEffects;
