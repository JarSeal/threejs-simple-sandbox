
export function calculateAngle(startPos, endPos) {
    return Math.atan2(endPos[0] - startPos[0], startPos[1] - endPos[1]);
}

export function randomInt(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
}

export function randomTimeNow(from, to) {
    return performance.now() + randomInt(from, to);
}