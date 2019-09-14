
// Cargo hall
export function getModule(module, level) {
    let tilemap = getModuleLevelData(level, "tilemap");
    let objFile = getModuleLevelData(level, "objFile");
    let mtlFile = getModuleLevelData(level, "mtlFile");
    let errors = checkErrors(tilemap, objFile, mtlFile);
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
            objFile: "captains-cabin-1-a.obj",
            mtlFile: "captains-cabin-a.mtl",
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
            lights: {
                main: [
                    {
                        type: "point",
                        color: 0xffffff,
                        intensity: 1,
                        distance: 11,
                        decay: 2,
                        z: 3,
                        aligners: [
                            [2.5, 2],
                            [2, 2.5],
                            [2.5, 2],
                            [2, 2.5],
                        ],
                        helper: false,
                    },
                ],
                props: [
                    {
                        type: "capsule", // this string is used as an object key
                        color: 0xffffff,
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
                ]
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
