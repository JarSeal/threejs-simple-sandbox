onmessage = function(e) {
    var results = fxTypes(e.data);
    postMessage(results);
};

var fxTypes = function(request) {
    var i = 0, fxsLength = request.fxList.length, results = {};
    for(i=0; i<fxsLength; i++) {
        var fx = request.fxList[i];
        switch(fx.name) {
        case 'sparksParticlesFx':
            results[fx.name] = calculateSparkParticles(fx, request);
            break;
        default:
            console.error('Game engine error (workerFx.js): could not recognise fx name, ' + fx.name.toString());
            break;
        }
    }
    return results;
};

var calculateSparkParticles = function(fx, request) {
    var i = 0,
        particleCount = _randomIntInBetween(fx.minParticles, fx.maxParticles),
        vertices = [],
        sizes = [],
        targetPositions = [],
        animLengths = [],
        colors = [];
    for(i=0; i<particleCount; i++) {
        vertices.push(
            request.hitPos[0],
            request.hitPos[1],
            request.hitPos[2]
        );
        sizes.push(_randomFloatInBetween(fx.minSize, fx.maxSize) * request.rendererPixelRatio);
        targetPositions.push(
            request.hitPos[0] + random2dAmount(request.projectileLifeDir, 'x', request.tileMap, request.hitPos, request.projectileLifeSpecial),
            request.hitPos[1] + random2dAmount(request.projectileLifeDir, 'y', request.tileMap, request.hitPos, request.projectileLifeSpecial),
            request.hitPos[2]
        );
        var animL = _randomFloatInBetween(fx.minAnimLength, fx.maxAnimLength) * 1000;
        animLengths.push(animL);
        Math.random() < 0.2
            ? colors.push(0.0, 0.0, 0.0)
            : colors.push(0.9, 0.9, 0.9);
    }
    return {
        vertices: vertices,
        sizes: sizes,
        targetPositions: targetPositions,
        animLengths: animLengths,
        colors: colors,
        maxAnimLength: Math.max(...animLengths)
    };
};

var _randomIntInBetween = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

var _randomFloatInBetween = function(min, max) {
    min *= 10; max *= 10;
    return Math.floor(Math.random() * (max - min + 1) + min) / 10;
};

var checkIfWall = function(x, y, tileMap) {
    x = Math.round(x);
    y = Math.round(y);
    if(!tileMap[x] || !tileMap[x][y] || x < 0 || y < 0) return false;
    return tileMap[x][y].type === 2;
};

var random2dAmount = function(dir, axis, target, hitPos, special) {
    let min = 0.4,
        max = 1.6,
        amount = _randomFloatInBetween(min, max);
    if(target === 'player' && (dir == 1 || dir == 3 || dir == 5 || dir == 7)) {
        let xOffset = hitPos[0] - Math.round(hitPos[0]);
        let yOffset = hitPos[1] - Math.round(hitPos[1]);
        switch(dir) {
        case 1:
        case 7:
            if(axis == 'x') {
                if(xOffset < 0) {
                    return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                } else {
                    return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                }
            }
            if(yOffset < 0) {
                return Math.round(Math.random() * 10) < 9 ? -amount : amount;
            } else {
                return Math.round(Math.random() * 10) < 9 ? amount : -amount;
            }
        case 3:
        case 5:
            if(axis == 'x') {
                if(xOffset < 0) {
                    return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                } else {
                    return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                }
            }
            if(yOffset < 0) {
                return Math.round(Math.random() * 10) < 9 ? -amount : amount;
            } else {
                return Math.round(Math.random() * 10) < 9 ? amount : -amount;
            }
        }
    }
    let tileMap = target;
    switch(dir) {
    case 0:
        if(axis == 'x') {
            return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
        }
        return amount;
    case 1:
        if(checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) {
            return amount;
        } else
        if(checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) || special) {
            if(axis == 'y') {
                return Math.round(Math.random() * 10) < 9 ? -amount : amount;
            }
            return amount;
        } else {
            if(axis == 'x') {
                return Math.round(Math.random() * 10) < 9 ? -amount : amount;
            }
            return amount;
        }
    case 2:
        if(axis == 'y') {
            return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
        }
        return amount;
    case 3:
        if(checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) {
            if(axis == 'y') { return -amount; }
            return amount;
        } else
        if(checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) || special) {
            if(axis == 'y') {
                return Math.round(Math.random() * 10) < 9 ? amount : -amount;
            }
            return amount;
        } else {
            if(axis == 'x') {
                return Math.round(Math.random() * 10) < 9 ? -amount : amount;
            }
            return -amount;
        }
    case 4:
        if(axis == 'x') {
            return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
        }
        return -amount;
    case 5:
        if(checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) {
            return -amount;
        } else
        if(checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) || special) {
            if(axis == 'y') {
                return Math.round(Math.random() * 10) < 9 ? amount : -amount;
            }
            return -amount;
        } else {
            if(axis == 'x') {
                return Math.round(Math.random() * 10) < 9 ? amount : -amount;
            }
            return -amount;
        }
    case 6:
        if(axis == 'y') {
            return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
        }
        return -amount;
    case 7:
        if(checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) {
            if(axis == 'y') { return amount; }
            return -amount;
        } else
        if(checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) || special) {
            if(axis == 'y') {
                return Math.round(Math.random() * 10) < 9 ? -amount : amount;
            }
            return -amount;
        } else {
            if(axis == 'x') {
                return Math.round(Math.random() * 10) < 9 ? amount : -amount;
            }
            return amount;
        }
    }
};