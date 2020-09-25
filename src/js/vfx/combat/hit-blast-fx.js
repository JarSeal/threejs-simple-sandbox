import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// A hit blast when a projectile hits a wall, a player, or an obstacle

const hitBlastFx = (type, vfxMap, effectMeshes, effectData) => {
    switch(type) {
    case "basic":
        basicBlast(vfxMap, effectMeshes, effectData);
        break;
    default: console.error('Game engine error: could not find VFX type ' + type + '.');
    }
};

const basicBlast = (vfxMap, effectMeshes, effectData) => {
    const planeGeo = new THREE.PlaneBufferGeometry(1.5, 1.5, 1);
    const planeGeo2 = planeGeo.clone();
    const planeGeo3 = planeGeo.clone();
    const vfxMat = new THREE.MeshBasicMaterial({
        map: vfxMap,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        depthTest: true,
    });
    vfxMat.color.setHSL(1, 0.5, 1);
    const geometries = [];
    const spriteXlen = 128 / 4096;
    const spriteYlen = 128 / 4096;
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
    effectMeshes['hitBlast'] = hitBlast;
    effectData['hitBlast'] = {
        spriteXlen,
        spriteYlen,
        startPosU: 0.5,
        startPosV: 1,
        geo: mergedGeo,
        phase: 2,
        frame: 1,
        rectSets: 3,
        totalFrames: 11,
        lastUpdate: performance.now(),
        interval: 20,
    };
};

export default hitBlastFx;