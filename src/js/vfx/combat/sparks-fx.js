import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// All types of sparks

const sparksFx = (effectName, type, vfxMaterial, effectMeshes, effectData) => {
    switch(type) {
    case 'wallHit':
        wallHitSparks(effectName, type, vfxMaterial, effectMeshes, effectData);
        break;
    default: console.error('Game engine error: could not find VFX type ' + type + '.');
    }
};

const wallHitSparks = (effectName, type, vfxMaterial, effectMeshes, effectData) => {
    const planeGeo = new THREE.PlaneBufferGeometry(2, 2, 1);
    const planeGeo2 = planeGeo.clone();
    const planeGeo3 = planeGeo.clone();
    const geometries = [];
    const spriteXlen = 128 / 4096;
    const spriteYlen = 128 / 4096;
    const plane = new THREE.Mesh(planeGeo, vfxMaterial);
    plane.rotation.x = 1.5708;
    plane.rotation.y = Math.PI;
    plane.updateMatrix();
    plane.geometry.applyMatrix4(plane.matrix);
    const plane2 = new THREE.Mesh(planeGeo2, vfxMaterial);
    plane2.rotation.x = 1.5708;
    plane2.rotation.y = 1.5708 / 2;
    plane2.updateMatrix();
    plane2.geometry.applyMatrix4(plane2.matrix);
    const plane3 = new THREE.Mesh(planeGeo3, vfxMaterial);
    plane3.rotation.x = 1.5708;
    plane3.rotation.y = -1.5708 / 2;
    plane3.updateMatrix();
    plane3.geometry.applyMatrix4(plane3.matrix);

    // Merge into one mesh
    geometries.push(plane.geometry);
    geometries.push(plane2.geometry);
    geometries.push(plane3.geometry);
    const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
    const hitSparks = new THREE.Mesh(mergedGeo, vfxMaterial);
    effectMeshes[effectName + '_' + type] = hitSparks;
    effectData[effectName + '_' + type] = {
        spriteXlen,
        spriteYlen,
        startPosU: 0,
        startPosV: 1 - spriteYlen,
        geo: mergedGeo,
        phase: 2,
        frame: 1,
        rectSets: 3,
        totalFrames: 28,
        lastUpdate: performance.now(),
        interval: 30,
    };
    plane.geometry.dispose();
    plane2.geometry.dispose();
    plane3.geometry.dispose();
};

export default sparksFx;