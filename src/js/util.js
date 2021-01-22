
export const calculateAngle = (startPos, endPos) => {
    let angle = Math.atan2(startPos[0] - endPos[0], startPos[1] - endPos[1]);
    if(angle < 0) {
        angle = Math.abs(angle);
    } else if(angle > 0) {
        angle = Math.PI - angle + Math.PI;
    }
    return angle;
};

export const calculateNewAngleForPlayer = (player, endPos) => {
    const startPos = player.pos;
    const angle = calculateAngle(startPos, endPos);
    let curAngle = player.mesh.rotation.z,
        difference,
        turnAmount = curAngle > angle ? curAngle - angle : angle - curAngle;
    difference = Math.abs(angle - curAngle);
    let fixedAngle = angle;
    // prevent unnecessary spin moves :)
    if(difference > Math.PI) {
        if(angle > curAngle) {
            curAngle = Math.PI * 2 + curAngle;
            player.mesh.rotation.z = curAngle;
            turnAmount = curAngle - fixedAngle;
        } else {
            fixedAngle = Math.PI * 2 + angle;
            turnAmount = fixedAngle - curAngle;
        }
    }
    return {
        angle,
        curAngle,
        fixedAngle,
        turnAmount
    };
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

export const fixAnimClips = (gltf) => {
    const scene = gltf.scene || gltf.scenes[0];
    const clips = gltf.animations || [];

    clips.forEach(function (clip) {
        for(let t = clip.tracks.length - 1; t >= 0; t--) {
            const track = clip.tracks[t];
            let isStatic = true;

            const inc = getInc(track.name, scene);

            for(let i = 0; i < track.values.length - inc; i += inc) {
                for(let j = 0; j < inc; j++) {
                    if(Math.abs(track.values[ i + j ] - track.values[ i + j + inc ]) > 0.000001) {
                        isStatic = false;
                        break;
                    }
                }

                if(!isStatic) break;
            }

            if (isStatic) {
                clip.tracks.splice(t, 1);
            }
        }
    });

    return gltf;
};

const getInc = (trackName, scene) => {
    let inc;

    const nameParts = trackName.split('.');
    const name = nameParts[0];
    const type = nameParts[1];
    let mesh;

    switch (type) {
    case 'morphTargetInfluences':
        mesh = scene.getObjectByName(name);
        inc = mesh.morphTargetInfluences.length;
        break;

    case 'quaternion':
        inc = 4;
        break;

    default:
        inc = 3;
    }

    return inc;
};

export default { calculateAngle, randomInt, randomTimeNow };
