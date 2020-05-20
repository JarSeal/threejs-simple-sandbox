
// Cargo Hall
export function getModule(module, level) {
    let tilemap = getModuleLevelData(level, "tilemap"),
        errors = checkErrors(tilemap),
        data = Object.assign(
            {},
            {
                module: module,
                dims: errors ? [] : [tilemap[0].length,tilemap.length],
                name: "Cargo Hall",
                errors: errors,
            },
            getModuleLevelData(level)
        );
    return data;
};

function getModuleLevelData(level, type) {
    let data = [
        {
            level: 1,
            models: {
                interior: {
                    mtlId: "cargo-hall-1-a-int",
                    objFile: "cargo-hall/cargo-hall-int.obj",
                    mtlFile: "cargo-hall/cargo-hall-int.mtl",
                    diffuseMap: "cargo-hall/interior-baked.png",
                    lightMap: "cargo-hall/interior-lightmap.png",
                    normalMap: "cargo-hall/interior-normal.png",
                    bumpMap: "cargo-hall/interior-bump.png", // TODO: Check if necessary (we have normal map)..
                },
                exterior: {
                    mtlId: "cargo-hall-1-a-ext",
                    objFile: "cargo-hall/cargo-hall-ext.obj",
                    mtlFile: "cargo-hall/cargo-hall-ext.mtl",
                    diffuseMap: "cargo-hall/exterior-baked.png",
                    lightMap: "cargo-hall/exterior-lightmap.png",
                    normalMap: "cargo-hall/exterior-normal.png",
                    bumpMap: "cargo-hall/exterior-bump.png",
                },
                doors: [{
                    pos: [3, 0],
                    turn: 1,
                    size: [0.7, 0.3, 3.5],
                    open: false,
                    openOffset: 0.7,
                    closedOffset: 0.35,
                    selfClosing: true,
                    type: "slide-double",
                    localTriggers: [[3,0], [2,1], [3,1], [3,2]],
                }, {
                    pos: [0, 6],
                    turn: 0,
                    size: [0.7, 0.3, 3.5],
                    open: false,
                    openOffset: 0.7,
                    closedOffset: 0.35,
                    selfClosing: true,
                    type: "slide-double",
                    localTriggers: [[0,6], [1,5], [1,6], [1,7]],
                }],
            },
            aligners: [ // Based on turn value (0 = no turn, 1 = 90 deg, 2 = 180 deg, 3 = 270 deg)
                [0.47, 0.47],
                [0.47,7.55],
                [7.55,8.53],
                [8.55,0.46],
            ],
            tilemap: [
                [{type:2},{type:2},{type:2},{type:3,door:0},{type:2},{type:2},{type:2},{type:2},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:3,door:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2}],
            ],
        },
    ];
    if(data[level-1]) {
        if(type === undefined) return data[level-1];
        return data[level-1][type];
    } else {
        return null;
    }
}

function checkErrors(tilemap) {
    if(!tilemap) return [{ error: 2 }] // Module level not found
}
