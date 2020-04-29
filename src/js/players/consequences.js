
class Consequences {
    constructor() {
        this.map = [];
        this.players = {};
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

    movePlayer(playerId, route, curPos) {
        let i, routeLength = route.length;
        // this.players[playerId] = [{
        //     pos: [curPos[0], curPos[1]],
        //     enterTime: 0,
        //     leaveTime: routeLength ? route[0].enterTime : 0,
        // }];
        this.players[playerId] = [];
        for(i=0; i<routeLength; i++) {
            this.players[playerId].push({
                pos: [route[i].x, route[i].y],
                posInt: [route[i].xInt, route[i].yInt],
                enterTime: route[i].enterTime,
                leaveTime: route[i].leaveTime ? route[i].leaveTime : 0,
            });
        }
        console.log(this.players);
    }

    addProjectile(projectileId, route) {
        console.log('projectile', projectileId, route);
    }

    
}

export default Consequences;