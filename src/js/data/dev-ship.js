
// A ship for development purposes

export function getShip() {
    let floors = getShipFloors();
    return Object.assign(
        {},
        getShipGlobalAttrs(),
        {
            pos: [2,2],
            floors: floors
        }
    );
};

function getShipGlobalAttrs() {
    return {
        name: "DEV DESTROYER!"
    }
};

function getShipFloors() {
    return [
        {
            floor: 1,
            moduleMap: [
                [{module:[1,0],level:1,pos:[32,26]}],
                [{module:[1,1],level:1,pos:[32,32]}],
                [{module:[1,2],level:1,pos:[27,31]}],
            ],
            modules: [
                {module:[1,0],level:1,pos:[32,26]},
                {module:[1,1],level:1,pos:[32,32]},
                {module:[1,2],level:1,pos:[27,31]},
            ],
        },
    ]
};