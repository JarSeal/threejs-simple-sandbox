
// A ship for development purposes

export function getShip() {
    let floors = getShipFloors();
    return Object.assign(
        {},
        getShipGlobalAttrs(),
        {
            pos: [2,2],
            dims: [floors[0].tileMap[0].length, floors[0].tileMap.length],
            floors: floors
        }
    );
};

function getShipGlobalAttrs() {
    return {
        
    }
};

function getShipFloors() {
    return [
        {
            floor: 1,
            tileMap: [
                [{module:[1,0],level:1,pos:[32,27],turn:3}],
                [{module:[1,1],level:1,pos:[32,32],turn:2}],
                [{module:[1,2],level:1,pos:[27,31]}],
            ],
        },
    ]
};