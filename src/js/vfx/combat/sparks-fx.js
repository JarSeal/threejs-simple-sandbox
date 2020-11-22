import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { logger } from '../../util.js';

// All types of sparks

const sparksFx = (effectName, type, vfxMaterial, effectMeshes, effectData, options) => {
    switch(type) {
    case 'wallHit':
        wallHitSparks(effectName, type, vfxMaterial, effectMeshes, effectData, options);
        break;
    default: logger.error('Could not find VFX type ' + type + '.');
    }
};

const wallHitSparks = (effectName, type, vfxMaterial, effectMeshes, effectData, options) => {
    const planeGeo = new THREE.PlaneBufferGeometry(2.5, 2.5, 1);
    const planeGeo2 = planeGeo.clone();
    const planeGeo3 = planeGeo.clone();
    const planeGeo4 = planeGeo.clone();
    const geometries = [];
    const spriteXlen = 128 / 4096;
    const spriteYlen = 128 / 4096;
    const plane = new THREE.Mesh(planeGeo, vfxMaterial);
    plane.rotation.x = -1.5708;
    plane.rotation.y = 1.5708;
    plane.updateMatrix();
    plane.geometry.applyMatrix4(plane.matrix);
    const plane2 = new THREE.Mesh(planeGeo2, vfxMaterial);
    plane2.rotation.x = -1.5708;
    plane2.rotation.y = 1.5708 / 2;
    plane2.updateMatrix();
    plane2.geometry.applyMatrix4(plane2.matrix);
    const plane3 = new THREE.Mesh(planeGeo3, vfxMaterial);
    plane3.rotation.x = -1.5708;
    plane3.rotation.y = 1.5708 * 1.5;
    plane3.updateMatrix();
    plane3.geometry.applyMatrix4(plane3.matrix);
    const plane4 = new THREE.Mesh(planeGeo4, vfxMaterial);
    plane4.rotation.x = -1.5708;
    plane4.rotation.y = 1.5708 * 2;
    plane4.updateMatrix();
    plane4.geometry.applyMatrix4(plane4.matrix);

    // Merge into one mesh
    geometries.push(plane.geometry);
    geometries.push(plane2.geometry);
    geometries.push(plane3.geometry);
    geometries.push(plane4.geometry);
    const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
    const sparks = new THREE.Mesh(mergedGeo, vfxMaterial);

    // Attach effectMesh to effectMeshes and create effectData
    effectMeshes[effectName + '_' + type] = sparks;
    effectData[effectName + '_' + type] = Object.assign({}, {
        atlasHCount: 32,
        atlasVCount: 32,
        startPosU: 0,
        startPosV: 4/32,
        geo: mergedGeo,
        rectSets: 4,
        totalFrames: 54,
        columns: 9,
        rows: 6,
        loopLength: 580
    },
    options);
    plane.geometry.dispose();
    plane2.geometry.dispose();
    plane3.geometry.dispose();
    plane4.geometry.dispose();
};

export default sparksFx;