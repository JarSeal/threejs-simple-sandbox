
// Cargo hall
export function getModule(module, level) {
    let tilemap = getModuleLevelData(level, "tilemap");
    let objFile = getModuleLevelData(level, "objFile");
    let mtlFile = getModuleLevelData(level, "mtlFile");
    let aligners = getModuleLevelData(level, "aligners");
    let errors = checkErrors(tilemap, objFile, mtlFile);
    return {
        module: module,
        dims: errors ? [] : [tilemap[0].length,tilemap.length],
        name: "Captain's Cabin",
        level: level,
        tilemap: tilemap,
        objFile: objFile,
        mtlFile: mtlFile,
        aligners: aligners,
        errors: errors
    }
};

function getModuleLevelData(level, type) {
    let data = [
        {
            level: 1,
            objFile: "wall-and-floor-tile.obj",
            mtlFile: "wall-and-floor-tile.mtl",
            aligners: [ // Based on turn value
                [3.5, 1.5],
                [0,0],
                [0.5,3.5],
                [0,0],
            ],
            tilemap: [
                [{type:2},{type:2},{type:2},{type:2},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1}],
                [{type:2},{type:1},{type:1},{type:1},{type:1}],
                [{type:2},{type:1},{type:1},{type:1},{type:1}],
                [{type:2},{type:1},{type:1},{type:1},{type:1}],
                [{type:2},{type:1},{type:1},{type:1},{type:1}],
                [{type:2},{type:2},{type:2},{type:2},{type:2}],
            ]
        },
    ];
    if(data[level-1]) {
        return data[level-1][type];
    } else {
        return undefined;
    }
}

function checkErrors(tilemap, objFile, mtlFile) {
    if(!tilemap || !objFile || !mtlFile) return [{ error: 2 }] // Module level not found
}
