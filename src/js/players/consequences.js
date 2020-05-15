
class Consequences {
    constructor() {
        this.map = [];
        this.hitList = {}; // {"someId": {type:"projectile", time:153.., pos:[25,25], shooterId:"someId", target:"player"||"object"||"turret", targetId:"someId"}}
        this.players = {}; // {playerId: [{pos:[25.555,25], posInt:[25,25],  enterTime:154..., leaveTime:155...}]}
        this.projectiles = []; // [{shooterId:"someId", projectileId:"someId", route:[{pos:[25,25], enterTime:154..., leaveTime:155...}]}]
        this.doors = [];
        this.initTime = 0;
    }

    addMapAndInitTime(currentMap, initTime) {
        this.map = currentMap;
        this.initTime = initTime;
    }

    addPlayer(player) {
        this.players[player.id] = [{
            pos: player.pos,
            enterTime: 0,
            leaveTime: 0,
        }];
    }

    movePlayer(playerId, route) {
        let i, routeLength = route.length;
        this.players[playerId] = [];
        for(i=0; i<routeLength; i++) {
            this.players[playerId].push({
                pos: [route[i].x, route[i].y],
                posInt: [route[i].xInt, route[i].yInt],
                enterTime: route[i].enterTime,
                leaveTime: route[i].leaveTime ? route[i].leaveTime : 0,
            });
        }
        this.createHitList();
    }

    addDoor(door) {
        console.log('ADD DOOR', door);
        this.doors.push(door);
    }

    getDoorsWithPos(newPos, lastPos) {
        // For animating the doors
        let d = 0,
            doorsLength = this.doors.length,
            affectedDoors = {
                openAnimation: [],
                closeAnimation: [],
            },
            closingDoor,
            curDoor,
            t = 0,
            triggersLength;
        // if(newPos[0] === lastPos[0] && newPos[1] === lastPos[1]) return affectedDoors;
        for(d=0; d<doorsLength; d++) {
            closingDoor = undefined;
            curDoor = this.doors[d];
            // triggersLength = curDoor.localTriggers.length;
            // // Check if the tile the player is leaving is a trigger
            // for(t=0; t<triggersLength; t++) {
            //     if(d===0 && t===1) {
            //         //console.log('POOT', curDoor, curDoor.localTriggers[t][0] === lastPos[0] - curDoor.modulePos[0], curDoor.localTriggers[t][1] === lastPos[1] - curDoor.modulePos[1]);
            //     }
            //     if(curDoor.localTriggers[t][0] === lastPos[0] - curDoor.modulePos[0] && curDoor.localTriggers[t][1] === lastPos[1] - curDoor.modulePos[1]) {
            //         console.log('CLOSE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            //     }
            //     if(curDoor.localTriggers[t][0] === newPos[0] - curDoor.modulePos[0] && curDoor.localTriggers[t][1] === newPos[1] - curDoor.modulePos[1]) {
            //         console.log("OPEN OPEN OPEN OPEN !!!!!!!!!!!!!!!!!!!!!!!!!!");
            //     }
            //     if(curDoor.localTriggers[t][0] === lastPos[0] - curDoor.modulePos[0] && curDoor.localTriggers[t][1] === lastPos[1] - curDoor.modulePos[1]) {
            //         closingDoor = curDoor;
            //     }
            //     if(curDoor.localTriggers[t][0] === newPos[0] - curDoor.modulePos[0] && curDoor.localTriggers[t][1] === newPos[1] - curDoor.modulePos[1]) {
            //         if(!closingDoor || closingDoor.groupId != curDoor.groupId) {
            //             affectedDoors.openAnimation.push(curDoor);
            //         } else {
            //             closingDoor = undefined;
            //         }
            //         break;
            //     }
            // }
            if(closingDoor !== undefined) {
                affectedDoors.closeAnimation.push(closingDoor);
            }
        }
        return affectedDoors;
    }

    addProjectile(shooterId, projectileId, route) {
        this.projectiles.push({shooterId: shooterId, projectileId: projectileId, route: route});
        this.createHitList(this.projectiles.length - 1);
    }
    
    createHitList(index) {
        let pr = 0,
            projLength = this.projectiles.length;
        if(index === undefined) {
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
        if(!this.projectiles || index === undefined || !this.projectiles[index]) return;
        const playerKeys = Object.keys(this.players);
        let projectile = this.projectiles[index],
            r = 0,
            routeLength = projectile.route.length,
            pl = 0,
            playersLength = playerKeys.length,
            plR = 0,
            plRLength,
            d = 0,
            doorsLength = this.doors.length,
            hitFound = false;
        for(r=1; r<routeLength; r++) { // Skip the first tile
            let prEnterTime = projectile.route[r].enterTime,
                prLeaveTime = projectile.route[r].leaveTime,
                prPos = projectile.route[r].pos;
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
                        // Add hit to hitList
                        this.hitList[projectile.projectileId] = {
                            type: "projectile",
                            shooterId: projectile.shooterId,
                            projectileId: projectile.projectileId,
                            time: prEnterTime,
                            target: "player",
                            targetId: playerKeys[pl],
                            pos: prPos,
                            hitPos: projectile.route[r].posExact,
                            dir: projectile.route[r].dir,
                        };
                        hitFound = true;
                        break;
                    }
                    // CHECK THE DOOR HITS HERE!
                    for(d=0; d<doorsLength; d++) {

                    }
                    if(hitFound) break;
                }
                if(hitFound) break;
            }
            if(hitFound) break;
        }
    }

    doHitConsequence(id, hitter, scene) {
        // TODO: Do the damage for the player here...
        this.removeFromHitList(id);
        this.removeProjectile(id, scene);
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
                this.doHitConsequence(id, hitter, scene);
            }
        }
    }

    checkIfAliveOnHitList(id) {
        return this.hitList[id];
    }

    removeProjectile(id, scene) {
        let i=0,
            projLength = this.projectiles.length,
            projIndex,
            projectiles = this.projectiles;
        for(i=0; i<projLength; i++) {
            if(projectiles[i].projectileId == id) {
                projIndex = i;
            }
        }
        if(projIndex !== undefined) {
            this.projectiles.splice(projIndex, 1);
        }
        if(scene.remove && scene.getObjectByName) {
            scene.remove(scene.getObjectByName(id + "-inside"));
            scene.remove(scene.getObjectByName(id + "-outside"));
            scene.remove(scene.getObjectByName(id + "-group"));
        }
    }

    removeFromHitList(id) {
        delete this.hitList[id];
    }
    
}

export default Consequences;