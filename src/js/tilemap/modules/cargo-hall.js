
// Cargo Hall
export const getModule = (module, level) => {
    let tilemap = getModuleLevelData(level, 'tilemap'),
        errors = checkErrors(tilemap),
        data = Object.assign(
            {},
            {
                module: module,
                dims: errors ? [] : [tilemap[0].length,tilemap.length],
                name: 'Cargo Hall',
                errors: errors,
            },
            getModuleLevelData(level)
        );
    return data;
};

const getModuleLevelData = (level, type) => {
    let data = [
        {
            level: 1,
            models: {
                interior: {
                    glb: 'cargo-hall/cargo-hall-l1-interior.glb',
                    //glb: 'cargo-hall/cargo-hall-l1-interior2.glb',
                    //glb: 'cargo-hall/testi-palikka-w-normals.glb',
                    mtlId: 'cargo-hall-1-a-int',
                    objFile: 'cargo-hall/cargo-hall-int.obj',
                    mtlFile: 'cargo-hall/cargo-hall-int.mtl',
                    diffuseMap: 'cargo-hall/interior-baked.png',
                    lightMap: 'cargo-hall/interior-lightmap.png',
                    normalMap: 'cargo-hall/interior-normal.png',
                    bumpMap: 'cargo-hall/interior-bump.png', // TODO: Check if necessary (we have normal map)..
                },
                exterior: {
                    glb: 'cargo-hall/cargo-hall-l1-exterior.glb',
                    mtlId: 'cargo-hall-1-a-ext',
                    objFile: 'cargo-hall/cargo-hall-ext.obj',
                    mtlFile: 'cargo-hall/cargo-hall-ext.mtl',
                    diffuseMap: 'cargo-hall/exterior-baked.png',
                    lightMap: 'cargo-hall/exterior-lightmap.png',
                    normalMap: 'cargo-hall/exterior-normal.png',
                    bumpMap: 'cargo-hall/exterior-bump.png',
                },
                doors: [{
                    pos: [3, 0],
                    turn: 1,
                    open: false,
                    openOffset: 0.8,
                    closedOffset: 0.35,
                    selfClosing: true,
                    type: 'slide-double',
                    localTriggers: [[3,0], [2,1], [3,1], [4,1]],
                }, {
                    pos: [0, 6],
                    turn: 0,
                    open: false,
                    openOffset: 0.8,
                    closedOffset: 0.35,
                    selfClosing: true,
                    type: 'slide-double',
                    localTriggers: [[0,6], [1,5], [1,6], [1,7]],
                }],
            },
            aligners: [ // Based on turn value (0 = no turn, 1 = 90 deg, 2 = 180 deg, 3 = 270 deg)
                [0,2],
                [2,8],
                [8,7],
                [7,0],
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
};

const checkErrors = (tilemap) => {
    if(!tilemap) return [{ error: 2 }]; // Module level not found
};
