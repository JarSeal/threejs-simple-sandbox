import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { logger } from '../../util.js';

// Projectile types

const projectileFx = (effectName, type, vfxMaterial, effectMeshes, effectData, options) => {
    switch(type) {
    case 'redBlast':
        redBlast(effectName, type, vfxMaterial, effectMeshes, effectData, options);
        break;
    default: logger.error('Game engine error: could not find VFX type ' + type + '.');
    }
};

const redBlast = (effectName, type, vfxMaterial, effectMeshes, effectData, options) => {
    const planeGeo = new THREE.PlaneBufferGeometry(1, 0.8, 1);
    const planeGeo2 = planeGeo.clone();
    const planeGeo3 = planeGeo.clone();
    const geometries = [];
    const spriteXlen = 128 / 4096;
    const spriteYlen = 128 / 4096;
    const plane = new THREE.Mesh(planeGeo, vfxMaterial);
    plane.rotation.z = -1.5708;
    plane.updateMatrix();
    plane.geometry.applyMatrix4(plane.matrix);
    const plane2 = new THREE.Mesh(planeGeo2, vfxMaterial);
    plane2.rotation.z = -1.5708;
    plane2.rotation.y = 1.5708;
    plane2.updateMatrix();
    plane2.geometry.applyMatrix4(plane2.matrix);

    // Flare
    let flareUvs = planeGeo3.attributes.uv;
    flareUvs.setXY(0, spriteXlen * 15, 1 - (spriteYlen * 3));
    flareUvs.setXY(1, spriteXlen * 16, 1 - (spriteYlen * 3));
    flareUvs.setXY(2, spriteXlen * 15, 1 - (spriteYlen * 3) - spriteYlen);
    flareUvs.setXY(3, spriteXlen * 16, 1 - (spriteYlen * 3) - spriteYlen);
    flareUvs.needsUpdate = true;
    const flare = new THREE.Mesh(planeGeo3, vfxMaterial);
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
    const redBlaster = new THREE.Mesh(mergedGeo, vfxMaterial);
    effectMeshes[effectName + '_' + type] = redBlaster;
    effectData[effectName + '_' + type] = Object.assign({}, {
        spriteXlen,
        spriteYlen,
        startPosU: 0,
        startPosV: 1-(1/32),
        geo: mergedGeo,
        meshName: effectName + '_' + type,
        rectSets: 2,
        totalFrames: 6
    },
    options);
    plane.geometry.dispose();
    plane2.geometry.dispose();
    flare.geometry.dispose();
};

export default projectileFx;