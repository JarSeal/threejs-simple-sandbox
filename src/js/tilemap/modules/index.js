import { getModule as captainsCabin } from './captains-cabin.js';
import { getModule as cargoHall } from './cargo-hall.js';

// Load a module
export function getModule(module, level, turn) {
    let mod = {};
    switch(module) {
        case 1:
            mod = captainsCabin(module, level);
            break;
        case 2:
            mod = cargoHall(module, level);
            break;
        default:
            return {errors: [{error: 1}]} // Module data not found
    }
    return checkTurn(mod, turn);
}

function checkTurn(module, turn) {
    if(turn !== 0) {
        module.tilemap = rotate(module.tilemap, turn);
        if(turn == 1 || turn == 3) {
            module.dims = [module.dims[1], module.dims[0]];
        }
        module.models.doors = getNewDoorPositions(module.models.doors, module.tilemap);
    }
    return module;
}

function getNewDoorPositions(doors, tilemap) {
    let colLength = tilemap.length,
        rowLength = colLength ? tilemap[0].length : 0,
        col = 0,
        row = 0;
    for(col=0; col<colLength; col++) {
        for(row=0; row<rowLength; row++) {
            if(tilemap[col][row].type == 3) {
                doors[tilemap[col][row].door].pos = [row, col];
            }
        }
    }
    return doors;
}

function transpose(matrix) {
    return matrix.reduce((prev, next) => next.map((item, i) =>
      (prev[i] || []).concat(next[i])
    ), []).reverse();
}

function rotate(matrix, times) {
    let copy = matrix.slice();
    for(let n=0; n<times; n++) {
        copy = copy.slice();
        copy = transpose(copy);
    }
    return copy;
};