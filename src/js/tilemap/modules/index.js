import { getModule as captainsCabin } from './captains-cabin.js';

// Load a module
export function getModule(module, level, turn) {
    let mod = {};
    switch(module) {
        case 1:
            mod = captainsCabin(module, level);
            break;
        default:
            return {errors: [{error: 1}]} // Module data not found
    }
    return checkTurn(mod, turn);
}

function checkTurn(module, turn) {
    let tilemap, dims;
    // DO THE TURN HERE, TODO
    if(turn !== 0) {
        module.tilemap = rotate(module.tilemap, turn);
        if(turn == 1 || turn == 3) {
            module.dims = [module.dims[1], module.dims[0]];
        }
    }
    return module;
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