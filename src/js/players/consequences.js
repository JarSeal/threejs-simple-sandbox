
class Consequences {
    constructor() {
        this.tileMap = [];
        this.hitList = {}; // {'someId': {type:'projectile', time:153.., pos:[25,25], shooterId:'someId', target:'player'||'object'||'turret', targetId:'someId'}}
        this.players = {}; // {playerId: [{pos:[25.555,25], posInt:[25,25],  enterTime:154..., leaveTime:155...}]}
        this.projectiles = []; // [{shooterId:'someId', projectileId:'someId', route:[{pos:[25,25], enterTime:154..., leaveTime:155...}]}]
        this.doors = {}; // {'doorID':'playerId':{enterTime:154..., leaveTime:155...}}
        this.initTime = 0;
    }

    addMapAndInitTime(currentMap, initTime) {
        this.tileMap = currentMap;
        this.initTime = initTime;
    }

    addPlayer(player) {
        this.players[player.id] = [{
            pos: player.pos,
            posInt: player.pos,
            enterTime: 0,
            leaveTime: 0,
        }];
    }

    getAllCurrentPlayerPositions() {
        const playerKeys = Object.keys(this.players);
        let now = this.initTime + performance.now() / 1000,
            playerKeysLength = playerKeys.length,
            p = 0,
            playerPositions = [];
        for(p=0; p<playerKeysLength; p++) {
            let curRoute = this.players[playerKeys[p]],
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
    }

    movePlayer(playerId, route) {
        let routeLength = route.length,
            i = 0,
            curTile;
        this.players[playerId] = [];
        this.doDoorTimesCleaning(playerId);
        for(i=0; i<routeLength; i++) {
            this.players[playerId].push({
                pos: [route[i].x, route[i].y],
                posInt: [route[i].xInt, route[i].yInt],
                enterTime: route[i].enterTime,
                leaveTime: route[i].leaveTime ? route[i].leaveTime : 0,
            });
            // Check if there are any door triggers on the route and set opening and closing times for doors
            curTile = this.tileMap[route[i].xInt][route[i].yInt];
            if(curTile.doorParams && curTile.doorParams.length) {
                let doorParams = curTile.doorParams,
                    doorParamsLength = doorParams.length,
                    d = 0,
                    delay = 0.15,
                    doorID;
                for(d=0; d<doorParamsLength; d++) {
                    if(doorParams[d].locked) continue;
                    doorID = doorParams[d].doorID;
                    let leaveTime = routeLength == i + 1 ? 0 : route[i].leaveTime + delay,
                        timesLastIndex = this.doors[doorID][playerId].times.length - 1;
                    if(timesLastIndex >= 0 && this.doors[doorID][playerId].times[timesLastIndex].closing + delay === route[i].enterTime) {
                        this.doors[doorID][playerId].times[timesLastIndex].closing = leaveTime;
                    } else {
                        this.doors[doorID][playerId].times.push({
                            opening: route[i].enterTime + delay,
                            closing: leaveTime,
                        });
                    }
                }
            }
        }
        this.createHitList();
    }

    addDoor(door) {
        if(this.doors[door.doorID] && this.doors[door.doorID].params) {
            this.doors[door.doorID].params = Object.assign({}, this.doors[door.doorID].params, door);
        } else {
            this.doors[door.doorID] = {
                params: door
            };
        }
    }

    getDoors() {
        return this.doors;
    }

    doDoorTimesCleaning(playerId) {
        const doorKeys = Object.keys(this.doors);
        let doorKeysLength = doorKeys.length,
            d = 0;
        for(d=0; d<doorKeysLength; d++) {
            this.doors[doorKeys[d]][playerId] = {
                times: [],
            };
        }
    }

    getTriggeredDoors(playerId, timeNow) {
        const doorKeys = Object.keys(this.doors);
        let doorKeysLength = doorKeys.length,
            d = 0,
            affectedDoors = [];
        for(d=0; d<doorKeysLength; d++) {
            let door = this.doors[doorKeys[d]].params,
                playerData = this.doors[doorKeys[d]][playerId];
            if(playerData && playerData.times && playerData.times.length) {
                let times = playerData.times,
                    timesLength = times.length,
                    t = 0;
                for(t=0; t<timesLength; t++) {
                    if((times[t].opening > timeNow && times[t].closing < timeNow) || times[t].closing === 0) {
                        affectedDoors.push(door);
                        break;
                    }
                }
            }
        }
        return affectedDoors;
    }

    addProjectile(shooterId, projectileId, route) {
        this.projectiles.push({shooterId: shooterId, projectileId: projectileId, route: route});
        this.createHitList(this.projectiles.length - 1);
    }
    
    createHitList(index) {
        if(index === undefined) {
            let pr = 0,
                projLength = this.projectiles.length;
            // Go through all projectiles
            for(pr=0; pr<projLength; pr++) {
                this.addToHitList(this.projectiles[pr]);
            }
        } else {
            // Add only one (the latest) projectile's hits to hitList
            this.addToHitList(index);
        }
    }

    addToHitList(index) {
        // Go through the projectiles route and add a possible hit to the hitlist
        if(!this.projectiles || index === undefined || !this.projectiles[index]) return;
        const playerKeys = Object.keys(this.players);
        let projectile = this.projectiles[index],
            r = 0,
            routeLength = projectile.route.length,
            pl = 0,
            playersLength = playerKeys.length,
            plR = 0,
            plRLength,
            hitFound = false;
        for(r=1; r<routeLength; r++) { // Skip the first tile
            let prEnterTime = projectile.route[r].enterTime,
                prLeaveTime = projectile.route[r].leaveTime,
                prPos = projectile.route[r].pos,
                curTile = this.tileMap[prPos[0]][prPos[1]],
                curTileDoor = { open: false };
            // Check if players are on the way of the projectile's route
            for(pl=0; pl<playersLength; pl++) {
                plRLength = this.players[playerKeys[pl]].length;
                for(plR=0; plR<plRLength; plR++) {
                    let plEnterTime = this.players[playerKeys[pl]][plR].enterTime,
                        plLeaveTime = this.players[playerKeys[pl]][plR].leaveTime,
                        plPos = this.players[playerKeys[pl]][plR].pos;
                    if((plPos[0] === prPos[0] && plPos[1] === prPos[1]) &&
                        (plLeaveTime === 0 || (prEnterTime < plLeaveTime && prEnterTime > plEnterTime) ||
                        (plEnterTime < prLeaveTime && plEnterTime > prEnterTime)) &&
                        projectile.shooterId != playerKeys[pl]) {
                        // Add player hit to hitList
                        this.hitList[projectile.projectileId] = {
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
                    let doorParams = this.tileMap[prPos[0]][prPos[1]].doorParams,
                        doorParamsLength = doorParams.length,
                        d = 0,
                        curParams;
                    for(d=0; d<doorParamsLength; d++) {
                        if(doorParams[d].isCurDoorTile) {
                            curParams = doorParams[d];
                            break;
                        }
                    }
                    let doorID = curParams.doorID,
                        curDoorTimes = this.doors[doorID][playerKeys[pl]] ? this.doors[doorID][playerKeys[pl]].times : [],
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
                    this.hitList[projectile.projectileId] = {
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
    }

    doHitConsequence(id, scene, animations) {
        // TODO: Do the damage for the player here...
        this.removeFromHitList(id);
        this.removeProjectile(id, scene, animations);
    }

    checkHitTime(id, initTime) {
        let curTime, hitter;
        if(!this.hitList[id]) return false;
        curTime = initTime + performance.now() / 1000;
        hitter = this.hitList[id];
        if(hitter.time < curTime) {
            return hitter;
        }
        return false;
    }

    checkAllHitTimes(initTime, scene) {
        const hitListKeys = Object.keys(this.hitList);
        let hitter,
            hitListLength = hitListKeys.length,
            i = 0,
            id;
        for(i=0; i<hitListLength; i++) {
            id = hitListKeys[i];
            hitter = this.checkHitTime(id, initTime);
            if(hitter) {
                this.doHitConsequence(id, scene, null);
            }
        }
    }

    checkIfAliveOnHitList(id) {
        return this.hitList[id];
    }

    removeProjectile(id, scene, animations) {
        let i=0,
            projIndex;
        const projLength = this.projectiles.length,
            projectiles = this.projectiles;
        for(i=0; i<projLength; i++) {
            if(projectiles[i].projectileId == id) {
                projIndex = i;
                break;
            }
        }
        if(projIndex !== undefined) {
            this.projectiles.splice(projIndex, 1);
        }
        if(animations) {
            const count = animations.count,
                fired = animations.fired;
            projIndex = undefined;
            for(i=0; i<count; i++) {
                if(fired[i].id == id) {
                    projIndex = i;
                    break;
                }
            }
            if(projIndex !== undefined) {
                animations.fired.splice(projIndex, 1);
                animations.count--;
            }
        }
        if(scene.remove && scene.getObjectByName) {
            scene.remove(scene.getObjectByName(id));
        }
    }

    removeFromHitList(id) {
        delete this.hitList[id];
    }
    
}

export default Consequences;