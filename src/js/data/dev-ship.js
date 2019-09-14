
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
            modules: [
                {module:[1,0],level:1,pos:[32,26],turn:3},
                {module:[1,1],level:1,pos:[32,32],turn:2},
                {module:[1,2],level:1,pos:[27,31]},
            ],
        },
    ]
};