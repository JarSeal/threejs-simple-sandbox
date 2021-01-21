
class Consequences {
    constructor() {
        this.tileMap = [];
        this.hitList = {}; // {'someId': {type:'projectile', time:153.., pos:[25,25], shooterId:'someId', target:'player'||'object'||'turret', targetId:'someId'}}
        this.players = {}; // {playerId: [{pos:[25.555,25], posInt:[25,25],  enterTime:154..., leaveTime:155...}]}
        this.projectiles = []; // [{shooterId:'someId', projectileId:'someId', route:[{pos:[25,25], enterTime:154..., leaveTime:155...}]}]
        this.doors = {}; // {'doorID':'playerId':{enterTime:154..., leaveTime:155...}}
        this.initTime = 0;

        this.worker = new Worker('/webworkers/workerConsequences.js');
        this.movingWorker = new Worker('/webworkers/workerConsequences.js');
        this.projectileWorker = new Worker('/webworkers/workerConsequences.js');
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

    movePlayer(playerId, route, pid) {
        this.movingWorker.postMessage({
            task: 'movePlayer',
            data: {
                pid: pid,
                playerId: playerId,
                playerRoute: route,
                doors: this.doors,
                players: this.players,
                tileMap: this.tileMap,
                initTime: this.initTime,
                microTime: performance.now()
            }
        });
        return this.movingWorker;
    }

    stopPlayerMovement(playerId, tile) {
        this.players[playerId] = [{
            pos: tile,
            posInt: tile,
            enterTime: this.initTime + performance.now() / 1000,
            leaveTime: 0
        }];
    }

    movePlayerCallBack(data) {
        this.players = data.players;
        this.doors = data.doors;
        this.createHitList().onmessage = (e) => { // TODO: (move this to the player-controller.js) DO THIS IN THE movePlayer Worker
            this.updateHitList(e.data);
        };
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

    checkDoors(pid) {
        this.worker.postMessage({
            task: 'checkDoors',
            data: {
                pid: pid,
                doors: this.doors,
                players: this.players,
                tileMap: this.tileMap,
                initTime: this.initTime,
                microTime: performance.now()
            }
        });
        return this.worker;
    }

    getDoors() {
        return this.doors;
    }

    addProjectile(shooterId, projectileId, route) {
        this.projectiles.push({shooterId, projectileId, route});
        return this.createHitList(this.projectiles.length - 1, 'projectileWorker');
    }

    updateHitList(newHitList) {
        this.hitList = Object.assign({}, this.hitList, newHitList);
    }
    
    createHitList(index, targetWorker) {
        if(!targetWorker) targetWorker = 'worker';
        this[targetWorker].postMessage({
            task: 'createHitList',
            data: {
                index: index,
                doors: this.doors,
                players: this.players,
                projectiles: this.projectiles,
                tileMap: this.tileMap,
            }
        });
        return this[targetWorker];
    }

    doHitConsequence(id, scene, removeAnim) {
        // TODO: Do the damage for the player here...
        this.removeFromHitList(id);
        this.removeProjectile(id, scene, removeAnim);
    }

    removeProjectile(id, scene, removeAnim) {
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
        if(removeAnim) removeAnim(id);
        if(scene.remove && scene.getObjectByName) {
            scene.remove(scene.getObjectByName(id));
        }
    }

    removeFromHitList(id) {
        delete this.hitList[id];
    }

    checkHitTime(id) {
        let curTime, hitter;
        if(!this.hitList[id]) return false;
        curTime = this.initTime + performance.now() / 1000;
        hitter = this.hitList[id];
        if(hitter.time < curTime) {
            return hitter;
        }
        return false;
    }

    checkAllHitTimes(scene) {
        this.worker.postMessage({
            task: 'checkHitTime',
            data: {
                hitList: this.hitList,
                initTime: this.initTime,
                microTime: performance.now()
            }
        });
        this.worker.onmessage = (e) => {
            if(e.data.length) {
                const list = e.data,
                    listLength = e.data.length;
                let i = 0;
                for(i=0; i<listLength; i++) {
                    this.doHitConsequence(list[i], scene, null);
                }
            }
        };
    }

    checkIfAliveOnHitList(id) {
        return this.hitList[id];
    }
    
}

export default Consequences;