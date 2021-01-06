import { logger } from '../../util.js';

// Spark particles types
const particleSparksFx = (type, options) => {
    switch(type) {
    case 'droppingAndBouncingSparks':
        dropAndBounce(options);
        break;
    default: logger.error('Could not find VFX type ' + type + ' (particle sparks).');
    }
};

const dropAndBounce = (options) => {
    if(!options) options = {};

};

export default particleSparksFx;