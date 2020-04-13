
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

    movePlayer() {

    }

    addProjectile(from, target, speed, life) {
        console.log(from, target, speed, life);
    }
}

export default Consequences;