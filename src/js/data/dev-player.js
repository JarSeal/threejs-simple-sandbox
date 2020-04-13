
// A ship for development purposes

export function getPlayer() {
    return {
        name: "DEV PLAYER",
        id: "devPlayer001",
        pos: [],
        microPos: [],
        newPosSet: false,
        newPosTimestamp: null,
        startPos: [3,4,0,2,0], // x,y,floor,moduleId,moduleIndex,
        width: 0.5,
        height: 1.9,
        dir: 0,
        speed: 500, // ms per tile
        curSpeed: 0,
        startMultiplier: 1.5,
        endMultiplier: 1.5,
        moving: false,
        animatingPos: false,
        route: [],
        routeIndex: 0,
        newRoute: [],
        moveStart: null,
        mesh: null,
    };
};
