import { getPlayer } from '../data/dev-player.js'; // GET NEW PLAYER DUMMY DATA HERE

class PlayerController {
    constructor(sceneState) {
        this.sceneState = sceneState;
        // this.mouse = new THREE.Vector2();
        // window.addEventListener('click', this.onTileClick);
    }

    createNewPlayer(mtlLoader, objLoader, scene, renderer, sceneState, type) {
        let player;
        switch(type) {
            case 'hero':
                this.createHero(sceneState, scene);
                break;
            default:
                return;
        }
    }

    createHero(sceneState, scene) {
        let hero = getPlayer();
        sceneState.players.hero = hero;
        sceneState.players.hero.pos = [34,29,0];
        let heroGeometry = new THREE.BoxBufferGeometry(1,1,hero.height);
        let heroMaterial = new THREE.MeshPhongMaterial({color: 0xff0088});
        let heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
        heroMesh.position.x = sceneState.players.hero.pos[0];
        heroMesh.position.y = sceneState.players.hero.pos[1];
        heroMesh.position.z = 0.5;
        heroMesh.scale.x = 0.5;
        heroMesh.scale.y = 0.5;
        scene.add(heroMesh);
        sceneState.players.hero.mesh = heroMesh;
        // let TL = new TimelineMax();
        // console.log(heroMesh);
        // TL.to(heroMesh.position, 10, {y: 34, ease: Expo.easeOut}, "=3");
    }

    getStartingPosition(sceneState, type) {
        let startingPosition = sceneState.players[type].startingPos;
        // TODO: finish this. We need moduleMap and shipMap to determine actual tile..
    }

    setPositions() {
        let playerTypes = [
            "hero",
        ],
        playerTypesLength = playerTypes.length,
        t;
        for(t=0;t<playerTypesLength;t++) {
            switch(playerTypes[t]) {
                case "hero":
                    this.animateMovement(this.sceneState.players.hero);
                    break;
            }
        }
    }

    animateMovement(player) {
        let route = player.route,
            routeLength = route.length,
            tl = null,
            speed,
            ease,
            startEndMultiplier,
            now = performance.now();
        if(player.moving && routeLength) {
            if(player.routeIndex === 0 ||
                player.routeIndex == routeLength - 1) {
                startEndMultiplier = 1.5;
            } else {
                startEndMultiplier = 1;
            }
            if(player.pos[0] !== route[player.routeIndex].x &&
                player.pos[1] !== route[player.routeIndex].y) {
                speed = player.speed * 1.5 * startEndMultiplier;
            } else {
                speed = player.speed * startEndMultiplier;
            }
            if(!player.animatingPos) {
                player.moveStart = now;
                player.animatingPos = true;
                tl = new TimelineMax();
                if(player.routeIndex === 0) {
                    routeLength == 1 ? ease = Sine.easeInOut : ease = Sine.easeIn;
                } else {
                    player.routeIndex == routeLength - 1 ? ease = Sine.easeOut : ease = Power0.easeNone;
                }
                tl.to(player.mesh.position, speed / 1000, {
                    x: route[player.routeIndex].x,
                    y: route[player.routeIndex].y,
                    ease: ease,
                });
            } else {
                // Check if end of one tile
                if(player.moveStart + speed < now) {
                    player.pos = [route[player.routeIndex].x, route[player.routeIndex].y];
                    player.routeIndex++;
                    player.moveStart = null;
                    player.animatingPos = false;
                }

                // Check if full destination is reached
                if(player.routeIndex == routeLength) {
                    player.moveStart = null;
                    player.moving = false;
                    player.route = [];
                    player.routeIndex = 0;
                    console.log('ended animation');
                    return; // End animation
                }
            }
        }
    }
}

export default PlayerController