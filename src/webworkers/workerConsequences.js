onmessage = function(e) {
    var request = parseTime(e.data);
    var result = tasks[request.task](request);
    if(!result && result !== false) console.error('Game engine error (workerConsequences.js): could not recognise task name, ' + request.task.toString() + ', or result was empty.');
    postMessage(result);
};

var parseTime = function(request) {
    if(request && request.data && request.data.initTime && request.data.microTime) {
        request.data.now = request.data.initTime + request.data.microTime / 1000;
    }
    return request;
};

var tasks = {
    getAllCurrentPlayerPositions: function(request) {
        var players = request.data.players,
            now = request.data.now,
            playerKeys = Object.keys(players),
            playerKeysLength = playerKeys.length,
            p = 0,
            playerPositions = [];
        for(p=0; p<playerKeysLength; p++) {
            var curRoute = players[playerKeys[p]],
                curRouteLength = curRoute.length,
                r = 0;
            for(r=0; r<curRouteLength; r++) {
                if(curRoute[curRouteLength-1].enterTime < now) {
                    playerPositions.push(curRoute[curRouteLength-1].posInt);
                    break;
                }
                if(curRoute[r].enterTime < now && curRoute[r].leaveTime > now) {
                    playerPositions.push(curRoute[r].posInt);
                    break;
                }
            }
        }
        return playerPositions;
    },
    checkDoors: function(request) {
        var playerPositions = this.getAllCurrentPlayerPositions(request),
            playerPositionsLength = playerPositions.length,
            p = 0,
            tileMap = request.data.tileMap,
            openDoors = [],
            doors = request.data.doors,
            animations = [];
        for(p=0; p<playerPositionsLength; p++) {
            var curTile = tileMap[playerPositions[p][0]][playerPositions[p][1]];
            if(curTile.doorParams && curTile.doorParams.length) {
                var params = curTile.doorParams,
                    paramsLength = params.length,
                    d = 0;
                for(d=0; d<paramsLength; d++) {
                    if(!openDoors.includes(params[d].doorID) && !doors[params[d].doorID].params.locked) {
                        openDoors.push(params[d].doorID);
                    }
                }
            }
        }
        if(openDoors.length) {
            var openDoorsLength = openDoors.length,
                o = 0;
            for(o=0; o<openDoorsLength; o++) {
                var para = doors[openDoors[o]].params;
                if(!para.open || (para.animating && !para.animatingDirOpen)) {
                    animations.push({
                        door: para,
                        dirTo: 'open'
                    });
                }
            }
        }
        var doorKeys = Object.keys(doors),
            doorKeysLength = doorKeys.length,
            d2 = 0;
        for(d2=0; d2<doorKeysLength; d2++) {
            var door = doors[doorKeys[d2]].params;
            if(!openDoors.includes(door.doorID) && (door.open || (door.animating && door.animatingDirOpen))) {
                animations.push({
                    door: door,
                    dirTo: 'closed'
                });
            }
        }
        return animations;
    },
    createHitList: function(request) {
        var index = request.data.index,
            hitList = {};
        if(index === undefined) {
            var pr = 0,
                projLength = request.data.projectiles.length;
            // Go through all projectiles and add them all to hitList
            for(pr=0; pr<projLength; pr++) {
                request.data.index = this.projectiles[pr];
                hitList = Object.assign({}, hitList, this.addToHitList(request));
            }
        } else {
            // Add only one (the latest) projectile's hits to hitList
            hitList = this.addToHitList(request);
        }
        return hitList;
    },
    addToHitList: function(request) {
        var index = request.data.index,
            projectiles = request.data.projectiles,
            players = request.data.players,
            doors = request.data.doors,
            tileMap = request.data.tileMap;
        // Go through the projectiles route and add a possible hit to the hitlist
        if(!projectiles || index === undefined || !projectiles[index]) return null;
        var playerKeys = Object.keys(players),
            projectile = projectiles[index],
            r = 0,
            routeLength = projectile.route.length,
            pl = 0,
            playersLength = playerKeys.length,
            plR = 0,
            plRLength,
            hitFound = false,
            hitList = {};
        for(r=1; r<routeLength; r++) { // Skip the first tile
            var prEnterTime = projectile.route[r].enterTime,
                prLeaveTime = projectile.route[r].leaveTime,
                prPos = projectile.route[r].pos,
                curTile = tileMap[prPos[0]][prPos[1]],
                curTileDoor = { open: false };
            // Check if players are on the way of the projectile's route
            for(pl=0; pl<playersLength; pl++) {
                plRLength = players[playerKeys[pl]].length;
                for(plR=0; plR<plRLength; plR++) {
                    var plEnterTime = players[playerKeys[pl]][plR].enterTime,
                        plLeaveTime = players[playerKeys[pl]][plR].leaveTime,
                        plPos = players[playerKeys[pl]][plR].pos;
                    if((plPos[0] === prPos[0] && plPos[1] === prPos[1]) &&
                        (plLeaveTime === 0 || (prEnterTime < plLeaveTime && prEnterTime > plEnterTime) ||
                        (plEnterTime < prLeaveTime && plEnterTime > prEnterTime)) &&
                        projectile.shooterId != playerKeys[pl]) {
                        // Add player hit to hitList
                        hitList[projectile.projectileId] = {
                            type: 'projectile',
                            shooterId: projectile.shooterId,
                            projectileId: projectile.projectileId,
                            time: prEnterTime,
                            target: 'player',
                            targetId: playerKeys[pl],
                            pos: prPos,
                            hitPos: projectile.route[r].posExact,
                            dir: projectile.route[r].dir,
                        };
                        hitFound = true;
                        break;
                    }
                    if(hitFound) break;
                }
                if(!hitFound && curTile.type == 3) {
                    var doorParams = tileMap[prPos[0]][prPos[1]].doorParams,
                        doorParamsLength = doorParams.length,
                        d = 0,
                        curParams;
                    for(d=0; d<doorParamsLength; d++) {
                        if(doorParams[d].isCurDoorTile) {
                            curParams = doorParams[d];
                            break;
                        }
                    }
                    var doorID = curParams.doorID,
                        curDoorTimes = doors[doorID][playerKeys[pl]] ? doors[doorID][playerKeys[pl]].times : [],
                        curDoorTimesLength = curDoorTimes.length,
                        dt = 0;
                    curTileDoor.params = curParams;
                    for(dt=0; dt<curDoorTimesLength; dt++) {
                        if((prEnterTime > curDoorTimes[dt].opening && prEnterTime < curDoorTimes[dt].closing) ||
                           (prLeaveTime > curDoorTimes[dt].opening && prLeaveTime < curDoorTimes[dt].closing) ||
                           (prEnterTime > curDoorTimes[dt].opening && curDoorTimes[dt].closing === 0)) {
                            curTileDoor.open = true;
                            break;
                        }
                    }
                }
                if(hitFound) break;
            }
            if(!hitFound && curTile.type == 3) {
                if(!curTileDoor.open) {
                    // Add door hit to hitList
                    hitList[projectile.projectileId] = {
                        type: 'projectile',
                        shooterId: projectile.shooterId,
                        projectileId: projectile.projectileId,
                        time: prEnterTime,
                        target: 'door',
                        targetId: curTileDoor.params.doorID,
                        pos: prPos,
                        hitPos: projectile.route[r].posExact,
                        dir: projectile.route[r].dir,
                    };
                    hitFound = true;
                    break;
                }
            }
            if(hitFound) break;
        }
        return hitList;
    },
    doDoorTimesCleaning: function(request) {
        var playerId = request.data.playerId,
            doors = request.data.doors,
            doorKeys = Object.keys(request.data.doors),
            doorKeysLength = doorKeys.length,
            d = 0;
        for(d=0; d<doorKeysLength; d++) {
            doors[doorKeys[d]][playerId] = {
                times: [],
            };
        }
        return doors;
    },
    movePlayer: function(request) {
        var players = request.data.players,
            tileMap = request.data.tileMap,
            doors = request.data.doors,
            playerId = request.data.playerId,
            route = request.data.playerRoute,
            routeLength = route.length,
            i = 0,
            curTile;
        players[playerId] = [];
        doors = this.doDoorTimesCleaning(request);
        for(i=0; i<routeLength; i++) {
            players[playerId].push({
                pos: [route[i].x, route[i].y],
                posInt: [route[i].xInt, route[i].yInt],
                enterTime: route[i].enterTime,
                leaveTime: route[i].leaveTime ? route[i].leaveTime : 0,
            });
            // Check if there are any door triggers on the route and set opening and closing times for doors
            curTile = tileMap[route[i].xInt][route[i].yInt];
            if(curTile.doorParams && curTile.doorParams.length) {
                var doorParams = curTile.doorParams,
                    doorParamsLength = doorParams.length,
                    d = 0,
                    delay = 0.15,
                    doorID;
                for(d=0; d<doorParamsLength; d++) {
                    if(doorParams[d].locked) continue;
                    doorID = doorParams[d].doorID;
                    var leaveTime = routeLength == i + 1 ? 0 : route[i].leaveTime + delay,
                        timesLastIndex = doors[doorID][playerId].times.length - 1;
                    if(timesLastIndex >= 0 && doors[doorID][playerId].times[timesLastIndex].closing + delay === route[i].enterTime) {
                        doors[doorID][playerId].times[timesLastIndex].closing = leaveTime;
                    } else {
                        doors[doorID][playerId].times.push({
                            opening: route[i].enterTime + delay,
                            closing: leaveTime,
                        });
                    }
                }
            }
        }
        return {
            players: players,
            doors: doors
        };
    },
    checkHitTime: function(request) {
        var id = request.data.id,
            curTime = request.data.now,
            hitList = request.data.hitList,
            hitter;
        if(!hitList[id]) return { result: false };
        hitter = hitList[id];
        console.log('check hit time', hitter);
        if(hitter.time < curTime) {
            hitter.result = true;
            return hitter;
        }
        return { result: false };
    },
    checkAllHitTimes: function(request) {
        var hitList = request.data.hitList,
            hitListKeys = Object.keys(hitList),
            hitter,
            hitListLength = hitListKeys.length,
            i = 0,
            results = [];
        for(i=0; i<hitListLength; i++) {
            request.data.id = hitListKeys[i];
            hitter = this.checkHitTime(request);
            if(hitter.result) {
                results.push(request.data.id);
            }
        }
        return results;
    }
};