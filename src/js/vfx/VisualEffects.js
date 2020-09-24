import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
    }

    getEffectMesh(key, cloneGeo) {
        const masterMesh = this.effectMeshes[key];
        if(!masterMesh) {
            console.error('Game engine error: Could not locate effect ' + key + '.');
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

    createProjectile() {
        const planeGeo = new THREE.PlaneBufferGeometry(1, 0.2, 1);
        const planeGeo2 = planeGeo.clone();
        const planeGeo3 = planeGeo.clone();
        const redMat = new THREE.MeshBasicMaterial({
            map: this.vfxMap,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true,
        });
        const geometries = [];
        const spriteXlen = 128 / 4096;
        const spriteYlen = 64 / 4096;
        const plane = new THREE.Mesh(planeGeo, redMat);
        plane.rotation.z = -1.5708;
        plane.updateMatrix();
        plane.geometry.applyMatrix4(plane.matrix);
        const plane2 = new THREE.Mesh(planeGeo2, redMat);
        plane2.rotation.z = -1.5708;
        plane2.rotation.x = 1.5708;
        plane2.updateMatrix();
        plane2.geometry.applyMatrix4(plane2.matrix);

        // Flare
        let flareUvs = planeGeo3.attributes.uv;
        flareUvs.setXY(0, spriteXlen * 15, 1);
        flareUvs.setXY(1, spriteXlen * 16, 1);
        flareUvs.setXY(2, spriteXlen * 15, 1 - spriteYlen);
        flareUvs.setXY(3, spriteXlen * 16, 1 - spriteYlen);
        flareUvs.needsUpdate = true;
        const flare = new THREE.Mesh(planeGeo3, redMat);
        flare.position.z = -0.8;
        flare.scale.x = 1.7;
        flare.scale.y = 1.5;
        flare.rotation.z = -1.5708;
        flare.updateMatrix();
        flare.geometry.applyMatrix4(flare.matrix);

        // Merge into one mesh
        geometries.push(plane.geometry);
        geometries.push(plane2.geometry);
        geometries.push(flare.geometry);
        const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, true);
        const redBlaster = new THREE.Mesh(mergedGeo, redMat);
        this.effectMeshes['redBlaster'] = redBlaster;
        this.effectData['redBlaster'] = {
            spriteXlen,
            spriteYlen,
            geo: mergedGeo,
            loop: true,
            phase: 2,
            frame: 1,
            vStart: 1,
            vEnd: 1 - spriteYlen,
            lastUpdate: performance.now(),
            interval: 35,
        };

        // TEMP PROJECTILE
        const redBlaster2 = redBlaster.clone();
        redBlaster2.position.x = 37;
        redBlaster2.position.y = 41;
        redBlaster2.position.z = 1.4;
        this.scene.add(redBlaster2);
        this.startAnim({
            id: 'Some-id',
            meshName: 'redBlaster',
        });

        this.sceneState.renderCalls.push(this.animateProjectile);
    }

    animateProjectile = () => {
        const count = this.anims.count;
        if(!count) return;
        let i = 0,
            geo,
            uvAttribute,
            spriteXlen,
            vStart,
            vEnd,
            frame,
            newX,
            newXPrev;
        for(i=0; i<count; i++) {
            if(performance.now() - this.anims.fired[i].lastUpdate < this.anims.fired[i].interval) break;
            geo = this.anims.fired[i].geo;
            spriteXlen = this.anims.fired[i].spriteXlen;
            vStart = this.anims.fired[i].vStart;
            vEnd = this.anims.fired[i].vEnd;
            frame = this.anims.fired[i].frame;
            newX = spriteXlen * frame;
            newXPrev = spriteXlen * (frame - 1);
            uvAttribute = geo.attributes.uv;
            uvAttribute.setXY(0, newXPrev, vStart);
            uvAttribute.setXY(1, newX, vStart);
            uvAttribute.setXY(2, newXPrev, vEnd);
            uvAttribute.setXY(3, newX, vEnd);
            uvAttribute.needsUpdate = true;
            this.anims.fired[i].lastUpdate = performance.now();
            if(frame === 15) {
                this.anims.fired[i].frame = 1;
            } else {
                this.anims.fired[i].frame++;
            }
        }
    }
}

export default VisualEffects;
