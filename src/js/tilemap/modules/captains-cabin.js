import { randomTimeNow } from '../../util.js';

// Captain's Cabin
export function getModule(module, level) {
    let tilemap = getModuleLevelData(level, "tilemap"),
        objFile = getModuleLevelData(level, "objFile"),
        mtlFile = getModuleLevelData(level, "mtlFile"),
        errors = checkErrors(tilemap, objFile, mtlFile);
    return Object.assign(
        {},
        {
            module: module,
            dims: errors ? [] : [tilemap[0].length,tilemap.length],
            name: "Captain's Cabin",
            errors: errors,
        },
        getModuleLevelData(level)
    );
};

function getModuleLevelData(level, type) {
    let data = [
        {
            level: 1,
            objFile: "captains-cabin-lowpoly.obj",
            mtlFile: "captains-cabin-lowpoly.mtl",
            lightMapObjFile: "wall-and-floor-tile-light.obj",
            lightMapMtlFile: "wall-and-floor-tile-light.mtl",
            aligners: [ // Based on turn value (0 = no turn, 1 = 90 deg, 2 = 180 deg, 3 = 270 deg)
                [3.5, 1.5],
                [1.5,0.5],
                [0.5,3.5],
                [3.5,3.5],
            ],
            tilemap: [
                [{type:2},{type:2},{type:2},{type:2},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:3}],
                [{type:2},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:2},{type:2},{type:2},{type:2}],
            ],
            lights: [
                {
                    type: "capsule", // this string is used as an object key
                    color: 0xffffff,
                    onColor: 0xffffff,
                    offColor: 0x999999,
                    glow: false,
                    z: 2,
                    turn: false,
                    aligners: [
                        [3.7, 2.1],
                        [2.1, 0.3],
                        [0.3, 4.1],
                        [4, 3.7],
                    ],
                },
            ],
            flickerTimer: performance.now(),
            flickerState: 0,
            action: function(sceneState, moduleIndex, scene) {
                let timer = sceneState.moduleData[moduleIndex].flickerTimer;
                if(timer < performance.now()) { // Todo: Add check for when all is loaded
                    // Flicker the lights
                    let module = sceneState.moduleData[moduleIndex];
                    let moduleMesh = scene.getObjectByName('module-' + module.module + '-l' + module.level + '-i' + module.index);
                    let material = moduleMesh.children[0].children[0].material;
                    material.needsUpdate = true;
                    material.lightMapIntensity = sceneState.moduleData[moduleIndex].flickerState;
                    if(sceneState.moduleData[moduleIndex].flickerState === 0) {
                        sceneState.moduleData[moduleIndex].flickerTimer = randomTimeNow(200, 2000);
                        sceneState.moduleData[moduleIndex].flickerState = 2;
                        moduleMesh.children[1].children[0].material.color.setHex(0xc0c0c0);
                        moduleMesh.children[1].children[0].material.emissiveIntensity = 0;
                    } else {
                        sceneState.moduleData[moduleIndex].flickerTimer = randomTimeNow(5000, 55000);
                        sceneState.moduleData[moduleIndex].flickerState = 0;
                        moduleMesh.children[1].children[0].material.emissiveIntensity = 1;
                    }
                }
            },
        },
    ];
    if(data[level-1]) {
        if(type === undefined) return data[level-1];
        return data[level-1][type];
    } else {
        return null;
    }
}

function checkErrors(tilemap, objFile, mtlFile) {
    if(!tilemap || !objFile || !mtlFile) return [{ error: 2 }] // Module level not found
}
