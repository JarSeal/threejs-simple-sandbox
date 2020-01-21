
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
                {module:[2,0],level:1,pos:[28,33],turn:3},
                {module:[2,1],level:1,pos:[26,23],turn:2},
                {module:[2,2],level:1,pos:[35,21],turn:1},
                {module:[2,2],level:1,pos:[38,30],turn:0},
            ],
        },
    ]
};

// function getShipFloors() {
//     return [
//         {
//             floor: 1,
//             modules: [
//                 {module:[1,0],level:1,pos:[32,20],turn:3},
//                 {module:[1,1],level:1,pos:[32,32],turn:2},
//                 {module:[1,2],level:1,pos:[27,31]},
//                 {module:[1,3],level:1,pos:[32,26]},
//                 {module:[1,4],level:1,pos:[37,26]},
//                 {module:[1,5],level:1,pos:[37,32]},
//                 {module:[1,6],level:1,pos:[37,38]},
//                 {module:[1,7],level:1,pos:[32,38]},
//                 {module:[1,8],level:1,pos:[27,37]},
//                 {module:[1,9],level:1,pos:[42,20]},
//             ],
//         },
//     ]
// };