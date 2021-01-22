// A player for development purposes

export const getPlayer = () => {
    return {
        name: 'DEV PLAYER',
        id: 'devPlayer001',
        type: 'hero',
        pos: [],
        microPos: [],
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
        mesh: null,
        isAiming: false,
        aimingStarted: 0,
        moveBackwards: false,
    };
};
