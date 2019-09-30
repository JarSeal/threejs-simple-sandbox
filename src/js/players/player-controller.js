import { getPlayer } from '../data/dev-player.js'; // GET NEW PLAYER DUMMY DATA HERE
import { calculateAngle } from '../util.js';

class PlayerController {
    constructor(sceneState) {
        this.sceneState = sceneState;
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
        let group = new THREE.Group();

        let heroGeometry = new THREE.BoxBufferGeometry(1,1,hero.height);
        let heroMaterial = new THREE.MeshPhongMaterial({color: 0xff0088});
        let heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
        heroMesh.scale.x = 0.5;
        heroMesh.scale.y = 0.5;
        group.add(heroMesh);

        let pointerGeo = new THREE.BoxBufferGeometry(0.2,0.2,0.2);
        let pointerMat = new THREE.MeshPhongMaterial({color: 0x550066});
        let pointerMesh = new THREE.Mesh(pointerGeo, pointerMat);
        pointerMesh.position.z = hero.height / 2;
        pointerMesh.position.y = -0.2;

        group.add(pointerMesh);

        group.position.x = sceneState.players.hero.pos[0];
        group.position.y = sceneState.players.hero.pos[1];
        group.position.z = 0.5;
        group.rotation.z = hero.dir;

        scene.add(group);
        sceneState.players.hero.mesh = group;
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
        let routeLength = player.route.length;
        if(player.moving && routeLength && !player.animatingPos) {
            this.newMove(player);
        }
    }

    newMove(player) {
        // One tile movement
        let route = player.route,
            routeLength = route.length,
            tl = new TimelineMax(),
            tlRotate = new TimelineMax(),
            ease,
            startEndMultiplier,
            speed,
            newDir = calculateAngle(
                player.pos,
                [route[player.routeIndex].x, route[player.routeIndex].y]
            );
            //newDir = this.getNewDirectionForMove(player, route);
        if(Math.abs(player.mesh.rotation.z - newDir) > Math.PI) {
            // prevent unnecessary spin moves :)
            newDir < 0 ? player.mesh.rotation.z = player.mesh.rotation.z + Math.PI * -2 :
                         player.mesh.rotation.z = player.mesh.rotation.z + Math.PI * 2;
        }
        tlRotate.to(player.mesh.rotation, 0.2, {
            z: newDir,
            ease: Sine.easeInOut,
            onComplete: () => {
                player.dir = newDir;
            }
        });
        if(player.routeIndex === 0) {
            // Player starts to move
            startEndMultiplier = player.startMultiplier;
        } else if(player.routeIndex == routeLength - 1) {
            // Player ends the movement
            startEndMultiplier = player.endMultiplier;
        } else {
            // Default speed
            startEndMultiplier = 1;
        }
        if(player.pos[0] !== route[player.routeIndex].x &&
            player.pos[1] !== route[player.routeIndex].y) {
            // Moving diagonally
            speed = player.speed * 1.5 * startEndMultiplier;
        } else {
            // Moving straigth in an axis
            speed = player.speed * startEndMultiplier;
        }
        player.curSpeed = speed;
        player.moveStart = performance.now();
        player.animatingPos = true;
        player.newPosSet = false;
        player.newPosTimestamp = speed / 2 + player.moveStart;
        if(player.routeIndex === 0) {
            routeLength == 1 ? ease = Sine.easeInOut : ease = Sine.easeIn;
        } else {
            player.routeIndex == routeLength - 1 ? ease = Sine.easeOut : ease = Power0.easeNone;
        }
        tl.to(player.mesh.position, player.curSpeed / 1000, {
            x: route[player.routeIndex].x,
            y: route[player.routeIndex].y,
            ease: ease,
            onUpdate: () => {
                if(!player.newPosSet && player.newPosTimestamp < performance.now()) {
                    player.pos = [route[player.routeIndex].x, route[player.routeIndex].y];
                    player.newPosSet = true;  
                }
            },
            onComplete: () => {
                player.pos = [route[player.routeIndex].x, route[player.routeIndex].y];
                player.moveStart = null;
                if(player.newRoute.length) {
                    player.route = player.newRoute.slice(0);
                    player.newRoute = [];
                    player.routeIndex = 0;
                } else {
                    player.routeIndex++;
                }

                // Check if full destination is reached
                if(player.routeIndex == routeLength) {
                    player.moveStart = null;
                    player.moving = false;
                    player.route = [];
                    player.routeIndex = 0;
                    player.curSpeed = 0;
                    console.log('ended hero movement');
                    return; // End animation
                }
                this.newMove(player);
            },
        });
    }

    
}

export default PlayerController