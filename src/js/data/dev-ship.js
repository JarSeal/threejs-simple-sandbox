
// A ship for development purposes

export function getShip() {
    return Object.assign(
        {},
        getShipGlobalAttrs(),
        {
            pos: [2,2],
            floors: getShipFloors()
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
            tileMap: [ // module's first number is the type of module and second is a running index of all the modules in the current map (for cases where there are multiple same type of modules on the same map)
                [{module:[1,0],level:1,pos:[2,2],dims:[8,8]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}],
                [{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]},{module:[1,0]}]
            ],
        },
    ]
};