
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
    data.tilemap = addWallDOff(data);
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
                    bumpMap: "cargo-hall/interior-bump.png", // TODO: Check if necessary..
                },
                exterior: {
                    mtlId: "cargo-hall-1-a-ext",
                    objFile: "cargo-hall/cargo-hall-ext.obj",
                    mtlFile: "cargo-hall/cargo-hall-ext.mtl",
                    diffuseMap: "cargo-hall/exterior-baked.png",
                    lightMap: "cargo-hall/exterior-lightmap.png",
                    normalMap: "cargo-hall/exterior-normal.png",
                    bumpMap: "cargo-hall/exterior-bump.png",
                }
            },
            aligners: [ // Based on turn value (0 = no turn, 1 = 90 deg, 2 = 180 deg, 3 = 270 deg)
                [0.47, 0.47],
                [0.47,7.55],
                [7.55,8.53],
                [8.55,0.46],
            ],
            tilemap: [
                [{type:2},{type:2},{type:2},{type:3},{type:2},{type:2},{type:2},{type:2},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:3},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
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

function addWallDOff(data) {
    let tilemap = data.tilemap,
        level = data.level,
        dims = [tilemap[0].length,tilemap.length],
        dOff = [0,0,0,0,0,0,0,0], // Default dark offset
        meta = [],
        northWall, eastWall, southWall, westWall;
    // Create empty meta grid
    for(let y=0; y<dims[1]; y++) {
        if(!meta[y]) { meta.push([]); }
        for(let x=0; x<dims[0]; x++) {
            if(!meta[y][x]) { meta[y].push([]); }
        }
    }
    northWall = {dOff: [0,0.5,0.5,0.5,0,0,0,0]};
    meta[0][1] = meta[0][2] = meta[0][3] = meta[0][4] = meta[0][5] = meta[0][6] = meta[0][7] = northWall;
    southWall = {dOff: [0,0,0,0,0,-0.5,-0.5,-0.5]};
    meta[9][1] = meta[9][2] = meta[9][3] = meta[9][4] = meta[9][5] = meta[9][6] = meta[9][7] = southWall;
    meta[0][0] = {dOff: [0,0,0,0,0,0,0,0], corner:true};
    meta[0][8] = {dOff: [0,0,0,0,0,0,0,0], corner:true};
    meta[9][0] = {dOff: [0,0,0,0,0,0,0,0], corner:true};
    meta[9][8] = {dOff: [0,0,0,0,0,0,0,0], corner:true};
    for(let y=0; y<dims[1]; y++) {
        for(let x=0; x<dims[0]; x++) {
            if(tilemap[y][x].type == 2) {
                tilemap[y][x] = Object.assign({}, tilemap[y][x], {dOff: dOff}, meta[y][x]);
            }
        }
    }
    return tilemap;
}

function checkErrors(tilemap) {
    if(!tilemap) return [{ error: 2 }] // Module level not found
}
