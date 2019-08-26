
// Cargo hall
export function getModule(module, level) {
    let tilemap = getModuleLevelData(level, "tilemap");
    let objFile = getModuleLevelData(level, "objFile");
    let mtlFile = getModuleLevelData(level, "mtlFile");
    let errors = checkErrors(tilemap, objFile, mtlFile);
    return {
        module: module,
        dims: errors ? [] : [tilemap[0].length,tilemap.length],
        name: "Cargo hall",
        level: level,
        tilemap: tilemap,
        objFile: objFile,
        mtlFile: mtlFile,
        errors: errors
    }
};

function getModuleLevelData(level, type) {
    let data = [
        {
            level: 1,
            objFile: "test-floor2.obj",
            mtlFile: "test-floor2.mtl",
            tilemap: [
                [{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2},{type:0}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2},{type:2}],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2}],
                [{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2}]
            ]
        }
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
