
export const calculateAngle = (startPos, endPos) => {
    return Math.atan2(endPos[0] - startPos[0], startPos[1] - endPos[1]);
};

export const randomInt = (from, to) => {
    return Math.floor(Math.random() * (to - from + 1) + from);
};

export const randomTimeNow = (from, to) => {
    return performance.now() + randomInt(from, to);
};

export const logger = {
    log: (...args) => {
        console.log(...args);
    },
    error: (...args) => {
        console.error('********* GAME ENGINE ERROR *********', ...args);
    }
};

export default { calculateAngle, randomInt, randomTimeNow };
