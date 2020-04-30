
class Consequences {
    constructor() {
        this.map = [];
        this.hitList = {}; // {"someId": {type:"projectile", time:153.., pos:[25,25], shooterId:"someId", target:"player"||"object"||"turret", targetId:"someId"}}
        this.players = {}; // {playerId: [{pos:[25.555,25], posInt:[25,25],  enterTime:154..., leaveTime:155...}]}
        this.projectiles = []; // [{shooterId:"someId", projectileId:"someId", route:[{pos:[25,25], enterTime:154..., leaveTime:155...}]}]
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

    addProjectile(shooterId, projectileId, route) {
        this.projectiles.push({shooterId: shooterId, projectileId: projectileId, route: route});
        this.createHitList(this.projectiles.length - 1);
    }
    
    createHitList(index) {
        const playerKeys = Object.keys(this.players);
        let pr = 0,
            projLength,
            projectile,
            r = 0,
            routeLength,
            pl = 0,
            playersLength = playerKeys.length,
            plR = 0,
            plRLength,
            hitFound = false;
        if(index === undefined) {
            projLength = this.projectiles.length;
            // Go through all projectiles
            for(pr=0; pr<projLength; pr++) {

            }
        } else {
            // Add only one projectile's hits to hitList
            projectile = this.projectiles[index];
            routeLength = projectile.route.length;
            for(r=1; r<routeLength; r++) { // Skip the first tile
                let prEnterTime = projectile.route[r].enterTime,
                    prLeaveTime = projectile.route[r].leaveTime,
                    prPos = projectile.route[r].pos;
                for(pl=0; pl<playersLength; pl++) {
                    plRLength = this.players[playerKeys[pl]].length;
                    for(plR=0; plR<plRLength; plR++) {
                        let plEnterTime = this.players[playerKeys[pl]][plR].enterTime,
                            plLeaveTime = this.players[playerKeys[pl]][plR].leaveTime,
                            plPos = this.players[playerKeys[pl]][plR].pos;
                        if((plPos[0] === prPos[0] && plPos[1] === prPos[1]) &&
                           (plLeaveTime === 0 || (prEnterTime < plLeaveTime && prEnterTime > plEnterTime) ||
                            (plEnterTime < prLeaveTime && plEnterTime > prEnterTime))) {
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
                    }
                    if(hitFound) break;
                }
                if(hitFound) break;
            }
        }
    }

    doHitConsequence(id, hitter) {
        // TODO: Do the damage for the player here...
        this.removeFromHitList(id);
        this.removeProjectile(id);
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

    removeProjectile(id) {
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
    }

    removeFromHitList(id) {
        delete this.hitList[id];
    }
    
}

export default Consequences;