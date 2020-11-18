import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { logger } from '../../util.js';

// A hit blast when a projectile hits a wall, a player, or an obstacle

const hitBlastFx = (effectName, type, vfxMaterial, effectMeshes, effectData) => {
    switch(type) {
    case 'basic':
        basicBlast(effectName, type, vfxMaterial, effectMeshes, effectData);
        break;
    default: logger.error('Game engine error: could not find VFX type ' + type + '.');
    }
};

const basicBlast = (effectName, type, vfxMaterial, effectMeshes, effectData) => {
    const planeGeo = new THREE.PlaneBufferGeometry(2.5, 2.5, 1);
    const planeGeo2 = planeGeo.clone();
    const planeGeo3 = planeGeo.clone();
    const geometries = [];
    const spriteXlen = 128 / 4096;
    const spriteYlen = 128 / 4096;
    const plane = new THREE.Mesh(planeGeo, vfxMaterial);
    const plane2 = new THREE.Mesh(planeGeo2, vfxMaterial);
    plane2.rotation.x = 1.5708;
    plane2.updateMatrix();
    plane2.geometry.applyMatrix4(plane2.matrix);
    const plane3 = new THREE.Mesh(planeGeo3, vfxMaterial);
    plane3.rotation.y = 1.5708;
    plane3.updateMatrix();
    plane3.geometry.applyMatrix4(plane3.matrix);

    // Merge into one mesh
    geometries.push(plane.geometry);
    geometries.push(plane2.geometry);
    geometries.push(plane3.geometry);
    const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
    const hitBlast = new THREE.Mesh(mergedGeo, vfxMaterial);

    // Attach effectMesh to effectMeshes and create effectData
    effectMeshes[effectName + '_' + type] = hitBlast;
    effectData[effectName + '_' + type] = {
        spriteXlen,
        spriteYlen,
        startPosU: 0,
        startPosV: 1-(3/32),
        geo: mergedGeo,
        rectSets: 3,
        totalFrames: 29,
        animLength: 500,
        speed: 45
    };
    plane.geometry.dispose();
    plane2.geometry.dispose();
    plane3.geometry.dispose();
};

export default hitBlastFx;