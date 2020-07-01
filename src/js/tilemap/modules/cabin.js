
// Cabin
export function getModule(module, level) {
    let tilemap = getModuleLevelData(level, "tilemap"),
        errors = checkErrors(tilemap),
        data = Object.assign(
            {},
            {
                module: module,
                dims: errors ? [] : [tilemap[0].length,tilemap.length],
                name: "Cabin",
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
                    glb: "cabin/cabin01-v2-int.glb",
                    mtlId: "cabin-1-a-int",
                },
                exterior: {
                    glb: "cabin/cabin01-v2-ext.glb",
                    mtlId: "cabin-1-a-ext",
                },
                doors: [{
                    pos: [7, 4],
                    turn: 0,
                    open: false,
                    openOffset: 0.8,
                    closedOffset: 0.35,
                    selfClosing: true,
                    type: "slide-double",
                    localTriggers: [[7,4], [6,4], [6,3], [6,5]],
                }],
            },
            aligners: [
                [-0.5, -0.5],
                [-0.5, 7.5],
                [7.5, 7.5],
                [7.5, -0.5],
            ],
            //alignZ: 1,
            size: [8, 8, 1],
            tilemap: [
                [{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2},],
                [{type:2},{type:4},{type:4},{type:1},{type:1},{type:1},{type:1},{type:2},],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2},],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:3,door:0},],
                [{type:2},{type:1},{type:1},{type:1},{type:1},{type:1},{type:1},{type:2},],
                [{type:2},{type:4},{type:4},{type:4},{type:1},{type:4},{type:4},{type:2},],
                [{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},{type:2},],
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
