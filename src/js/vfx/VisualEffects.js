import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

class VisualEffects {
    constructor(scene, sceneState) {
        this.scene = scene;
        this.vfxMap = new THREE.TextureLoader().load('/images/sprites/vfx-atlas-01.png');
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

    createHitBlast() {
        const planeGeo = new THREE.PlaneBufferGeometry(1.5, 1.5, 1);
        const planeGeo2 = planeGeo.clone();
        const planeGeo3 = planeGeo.clone();
        const vfxMat = new THREE.MeshBasicMaterial({
            map: this.vfxMap,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true,
        });
        const geometries = [];
        const spriteXlen = 128 / 4096;
        const spriteYlen = 128 / 4096;
        const redMat = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            color: 0xff0000,
        });
        const plane = new THREE.Mesh(planeGeo, vfxMat);
        const plane2 = new THREE.Mesh(planeGeo2, vfxMat);
        plane2.rotation.x = 1.5708;
        plane2.updateMatrix();
        plane2.geometry.applyMatrix4(plane2.matrix);
        const plane3 = new THREE.Mesh(planeGeo3, vfxMat);
        plane3.rotation.y = 1.5708;
        plane3.updateMatrix();
        plane3.geometry.applyMatrix4(plane3.matrix);

        // Merge into one mesh
        geometries.push(plane.geometry);
        geometries.push(plane2.geometry);
        geometries.push(plane3.geometry);
        plane.geometry.dispose();
        plane2.geometry.dispose();
        plane3.geometry.dispose();
        const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
        const hitBlast = new THREE.Mesh(mergedGeo, vfxMat);
        this.effectMeshes['hitBlast'] = hitBlast;
        this.effectData['hitBlast'] = {
            spriteXlen,
            spriteYlen,
            startPosU: 0.5 + spriteXlen * 2, // skip 2 first frames
            startPosV: 1,
            geo: mergedGeo,
            phase: 2,
            frame: 1,
            rectSets: 3,
            totalFrames: 11, // actually 13frames, but skipping 2 from beginning
            lastUpdate: performance.now(),
            interval: 20,
        };

        // TEMP BLAST
        // const blast = this.getEffectMesh('hitBlast', true);
        // blast.position.x = 31.3;
        // blast.position.y = 41;
        // blast.position.z = 1.4;
        // this.scene.add(blast);

        // this.startAnim({
        //     id: 'some-id2',
        //     meshName: 'hitBlast',
        //     geo: blast.geometry,
        //     clone: true,
        //     loop: true,
        // });
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
        plane.geometry.dispose();
        plane2.geometry.dispose();
        flare.geometry.dispose();
        const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, true);
        const redBlaster = new THREE.Mesh(mergedGeo, redMat);
        this.effectMeshes['redBlaster'] = redBlaster;
        this.effectData['redBlaster'] = {
            spriteXlen,
            spriteYlen,
            startPosU: 0,
            startPosV: 1,
            geo: mergedGeo,
            loop: true,
            phase: 2,
            rectSets: 1,
            frame: 1,
            totalFrames: 15,
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
            // if(fired.id == 'some-id2') console.log('FRAME', fired.frame);
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
            this.removeAnim();
        }
    }
}

export default VisualEffects;
