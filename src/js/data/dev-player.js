
// A ship for development purposes

export function getPlayer() {
    return {
        name: "DEV PLAYER",
        pos: [],
        startPos: [3,4,0,1,0], // x,y,floor,moduleId,moduleIndex,
        width: 0.5,
        height: 1.9,
        dir: 0,
        speed: 0.5,
        moving: false,
    };
};
