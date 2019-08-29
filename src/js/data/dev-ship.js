
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
            // tileMap: [ // module's first number is the type of module and second is a running index of all the modules in the current map (for cases where there are multiple same type of modules on the same map)
            //     [{module:[1,0],level:1,pos:[2,2],dims:[8,8]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
            //     [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
            //     [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
            //     [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
            //     [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
            //     [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
            //     [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
            //     [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}]
            // ],
            tileMap: [ // module's first number is the type of module and second is a running index of all the modules in the current map (for cases where there are multiple same type of modules on the same map)
                [{module:[1,0],level:1,pos:[32,32],dims:[10,11]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1],level:1,pos:[43,32],dims:[10,11]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]},{module:[1,1]}],
                [{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}]
            ],
        },
    ]
};