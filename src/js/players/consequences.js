
class Consequences {
    constructor() {
        this.map = [];
        this.players = [];
    }

    addMap(currentMap) {
        this.map = currentMap;
    }

    addPlayer(player) {
        this.players.push(player);
    }

    movePlayer(playerId, route) {

    }

    addProjectile(projectileId, route) {
        console.log('projectile', projectileId, route);
    }

    
}

export default Consequences;