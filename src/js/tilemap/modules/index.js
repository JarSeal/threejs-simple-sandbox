import { getModule as captainsCabin } from './captains-cabin.js';
import { getModule as cargoHall } from './cargo-hall.js';

// Load a module
export function getModule(module, level, turn, moduleID) {
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
    return setDoorTriggers(mod, turn, moduleID);
}

function setDoorTriggers(module, turn, moduleID) {
    let tilemap = module.tilemap;
    if(!module.tilemap.length) return {errors: [{error: 2}]}; // Tilemap data not found
    let rows = tilemap.length,
        cols = tilemap[0].length,
        r = 0,
        c = 0,
        doors = module.models.doors,
        doorsLength = doors.length,
        d = 0,
        triggers,
        triggersLength,
        t = 0,
        params = {};
    for(r=0; r<rows; r++) {
        for(c=0; c<cols; c++) {
            for(d=0; d<doorsLength; d++) {
                triggers = doors[d].localTriggers;
                triggersLength = triggers.length;
                for(t=0; t<triggersLength; t++) {
                    if(triggers[t][0] === c && triggers[t][1] === r) {
                        params = doors[d];
                        params.doorIndex = d;
                        params.doorID = moduleID + "-d" + d;
                        if(params.pos[0] === c && params.pos[1] === r) {
                            params.isCurDoorTile = true;
                        } else {
                            params.isCurDoorTile = false;
                        }
                        if(!module.tilemap[r][c].doorParams) module.tilemap[r][c].doorParams = [];
                        module.tilemap[r][c].doorParams.push(Object.assign({}, params));
                    }
                }
            }
        }
    }
    return checkTurn(module, turn);
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