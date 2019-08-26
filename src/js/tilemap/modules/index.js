import { getModule as cargoHall } from './cargo-hall.js';

// Load a module
export function getModule(module, level) {
    switch(module) {
        case 1:
            return cargoHall(module, level);
        default:
            return {errors: [{error: 1}]} // Module data not found
    }
}