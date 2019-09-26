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
        let group = new THREE.Group();
        let heroGeometry = new THREE.BoxBufferGeometry(1,1,hero.height);
        let heroMaterial = new THREE.MeshPhongMaterial({color: 0xff0088});
        let heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
        heroMesh.scale.x = 0.5;
        heroMesh.scale.y = 0.5;
        group.add(heroMesh);
        group.position.x = sceneState.players.hero.pos[0];
        group.position.y = sceneState.players.hero.pos[1];
        group.position.z = 0.5;
        scene.add(group);
        sceneState.players.hero.mesh = group;
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
            routeLength = route.length;
        if(player.moving && routeLength) {
            // if(player.routeIndex === 0) {
            //     // Player starts to move
            //     startEndMultiplier = player.startMultiplier;
            // } else if(player.routeIndex == routeLength - 1) {
            //     // Player ends the movement
            //     startEndMultiplier = player.endMultiplier;
            // } else {
            //     startEndMultiplier = 1;
            // }
            // if(player.pos[0] !== route[player.routeIndex].x &&
            //     player.pos[1] !== route[player.routeIndex].y) {
            //     // Moving diagonnally
            //     speed = player.speed * 1.5 * startEndMultiplier;
            // } else {
            //     // Moving straigth in an axis
            //     speed = player.speed * startEndMultiplier;
            // }
            // player.curSpeed = speed;
            if(!player.animatingPos) {
                this.newMove(player);
            }
            // if(!player.animatingPos) {
            //     player.moveStart = now;
            //     player.animatingPos = true;
            //     tl = new TimelineMax();
            //     if(player.routeIndex === 0) {
            //         routeLength == 1 ? ease = Sine.easeInOut : ease = Sine.easeIn;
            //     } else {
            //         player.routeIndex == routeLength - 1 ? ease = Sine.easeOut : ease = Power0.easeNone;
            //     }
            //     tl.to(player.mesh.position, speed / 1000, {
            //         x: route[player.routeIndex].x,
            //         y: route[player.routeIndex].y,
            //         ease: ease,
            //         onComplete: () => {
            //             let routeLength = route.length;
            //             player.pos = [route[player.routeIndex].x, route[player.routeIndex].y];
            //             player.moveStart = null;
            //             player.animatingPos = false;
            //             if(player.newRoute.length) {
            //                 player.route = player.newRoute.slice(0);
            //                 player.newRoute = [];
            //                 player.routeIndex = 0;
            //             } else {
            //                 player.routeIndex++;
            //             }

            //             // Check if full destination is reached
            //             if(player.routeIndex == routeLength) {
            //                 player.moveStart = null;
            //                 player.moving = false;
            //                 player.route = [];
            //                 player.routeIndex = 0;
            //                 console.log('ended animation');
            //                 return; // End animation
            //             }
            //         },
            //     });
            // } else {
                // // Check if end of one tile
                // if(player.moveStart + speed < now) {
                //     player.pos = [route[player.routeIndex].x, route[player.routeIndex].y];
                //     player.moveStart = null;
                //     player.animatingPos = false;
                //     if(player.newRoute.length) {
                //         player.route = player.newRoute.slice(0);
                //         player.newRoute = [];
                //         player.routeIndex = 0;
                //     } else {
                //         player.routeIndex++;
                //     }
                // }

                // // Check if full destination is reached
                // if(player.routeIndex == routeLength) {
                //     player.moveStart = null;
                //     player.moving = false;
                //     player.route = [];
                //     player.routeIndex = 0;
                //     console.log('ended animation');
                //     return; // End animation
                // }
            // }
        }
    }

    newMove(player) {
        // One tile movement
        let route = player.route,
            routeLength = route.length,
            tl = new TimelineMax(),
            ease,
            startEndMultiplier,
            speed;
        if(player.routeIndex === 0) {
            // Player starts to move
            startEndMultiplier = player.startMultiplier;
        } else if(player.routeIndex == routeLength - 1) {
            // Player ends the movement
            startEndMultiplier = player.endMultiplier;
        } else {
            startEndMultiplier = 1;
        }
        if(player.pos[0] !== route[player.routeIndex].x &&
            player.pos[1] !== route[player.routeIndex].y) {
            // Moving diagonnally
            speed = player.speed * 1.5 * startEndMultiplier;
        } else {
            // Moving straigth in an axis
            speed = player.speed * startEndMultiplier;
        }
        player.curSpeed = speed;
        player.moveStart = performance.now();
        player.animatingPos = true;
        if(player.routeIndex === 0) {
            routeLength == 1 ? ease = Sine.easeInOut : ease = Sine.easeIn;
        } else {
            player.routeIndex == routeLength - 1 ? ease = Sine.easeOut : ease = Power0.easeNone;
        }
        tl.to(player.mesh.position, player.curSpeed / 1000, {
            x: route[player.routeIndex].x,
            y: route[player.routeIndex].y,
            ease: ease,
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