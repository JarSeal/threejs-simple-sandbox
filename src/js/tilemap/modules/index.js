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
    if(turn == 2) {
        tilemap = module.tilemap;
        module.tilemap = tilemap.reverse();
    }
    return module;
}