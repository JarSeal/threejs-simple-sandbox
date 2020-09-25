import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Projectile types

const projectileFx = (type, vfxMap, effectMeshes, effectData) => {
    switch(type) {
    case 'redBlast':
        redBlast(vfxMap, effectMeshes, effectData);
        break;
    default: console.error('Game engine error: could not find VFX type ' + type + '.');
    }
};

const redBlast = (vfxMap, effectMeshes, effectData) => {
    const planeGeo = new THREE.PlaneBufferGeometry(1, 0.2, 1);
    const planeGeo2 = planeGeo.clone();
    const planeGeo3 = planeGeo.clone();
    const redMat = new THREE.MeshBasicMaterial({
        map: vfxMap,
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
    effectMeshes['redBlaster'] = redBlaster;
    effectData['redBlaster'] = {
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
};

export default projectileFx;