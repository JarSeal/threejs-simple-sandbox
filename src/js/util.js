
export function calculateAngle(startPos, endPos) {
    return Math.atan2(endPos[0] - startPos[0], startPos[1] - endPos[1]);
}