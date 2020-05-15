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
        sceneState.players.hero.pos = [35,43,0];
        sceneState.players.hero.microPos = [35,43,0];
        sceneState.consequences.addPlayer(sceneState.players.hero);
        
        // TEMP DUDE
        let tempDudePos = [33, 43];
        sceneState.consequences.addPlayer({id:"testPLAYER",pos:[tempDudePos[0], tempDudePos[1],0]}); // TEMP PLAYER
        let tempGeometry = new THREE.BoxBufferGeometry(1,1,hero.height);
        let tempMaterial = new THREE.MeshPhongMaterial({color: 0xffEE44});
        let tempMesh = new THREE.Mesh(tempGeometry, tempMaterial);
        tempMesh.scale.x = 0.5;
        tempMesh.scale.y = 0.5;
        tempMesh.position.x = tempDudePos[0];
        tempMesh.position.y = tempDudePos[1];
        tempMesh.position.z = 0.5;
        scene.add(tempMesh);
        
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
            routeIndex = player.routeIndex,
            ease,
            speed,
            newDir = calculateAngle(
                player.pos,
                [route[routeIndex].x, route[routeIndex].y]
            );
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
        speed = route[routeIndex].speed * this.sceneState.timeSpeed;
        player.curSpeed = speed * this.sceneState.timeSpeed;
        player.animatingPos = true;
        if(routeIndex === 0) {
            routeLength == 1 ? ease = Sine.easeInOut : ease = Sine.easeIn;
        } else {
            routeIndex == routeLength - 1 ? ease = Sine.easeOut : ease = Power0.easeNone;
        }
        let realPosition = this.getRealPosition(player.route, routeIndex);
        if(routeIndex !== realPosition.routeIndex) {
            routeIndex = realPosition.routeIndex;
            player.routeIndex = realPosition.routeIndex;
            player.pos = realPosition.pos;
            player.mesh.position.x = realPosition.pos[0];
            player.mesh.position.y = realPosition.pos[1];
        }
        tl.to(player.mesh.position, route[routeIndex].duration, {
            x: route[routeIndex].x,
            y: route[routeIndex].y,
            ease: ease,
            onUpdate: () => {
                player.microPos = [player.mesh.position.x, player.mesh.position.y, player.pos[2]];
                player.pos = [route[routeIndex].xInt, route[routeIndex].yInt, player.pos[2]];
            },
            onComplete: () => {
                player.pos = [route[routeIndex].xInt, route[routeIndex].yInt, player.pos[2]];
                player.microPos = [route[routeIndex].x, route[routeIndex].y, player.pos[2]];
                let evenX = route[routeIndex].x - route[routeIndex].xInt;
                let evenY = route[routeIndex].y - route[routeIndex].yInt;
                if(player.newRoute.length && evenX === 0 && evenY === 0) {
                    let now = this.sceneState.initTime.s + performance.now(),
                        delay = now - player.newRoute[0].createdTime,
                        routeLength = player.newRoute.length,
                        i = 0;
                    for(i=0; i<routeLength; i++) {
                        if(player.newRoute[i].enterTime) {
                            player.newRoute[i].enterTime += delay;
                        }
                        if(player.newRoute[i].leaveTime) {
                            player.newRoute[i].leaveTime += delay;
                        }
                    }
                    player.route = player.newRoute.slice(0);
                    player.newRoute = [];
                    player.routeIndex = 0;
                    this.sceneState.consequences.movePlayer(player.id, player.route, player.pos);
                } else {
                    player.routeIndex++;
                    // Check if full destination is reached
                    if(routeIndex == routeLength - 1) {
                        player.moving = false;
                        player.route = [];
                        player.routeIndex = 0;
                        player.curSpeed = 0;
                        console.log('ended hero movement');
                        return; // End animation
                    }
                    let affectedDoors = this.sceneState.consequences.getDoorsWithPos(player.pos, this.getPrevRouteTile(player));
                    if(affectedDoors.openAnimation.length || affectedDoors.closeAnimation.length) {
                        console.log('AFFECTED DOORS', affectedDoors);
                    }
                }
                this.newMove(player);
            },
        });
    }

    getPrevRouteTile(player) {
        let curIndex = player.routeIndex,
            route = player.route,
            prevPos;
        if(curIndex == 1) return player.pos;
        prevPos = [route[curIndex - 1].xInt, route[curIndex - 1].yInt];
        if(curIndex - 1 !== 0 && prevPos[0] === player.pos[0] && prevPos[1] === player.pos[1]) {
            prevPos = [route[curIndex - 2].xInt, route[curIndex - 2].yInt];
        }
        return prevPos;
    }

    getRealPosition(route, index) {
        let curIndex = index,
            curPos = [],
            routeLength = route.length,
            i,
            timeNow = this.sceneState.initTime.s + performance.now() / 1000;
        for(i=index+1; i<routeLength; i++) {
            // Check how much player is behind of eta
            if((route[i].enterTime < timeNow && route[i].leaveTime > timeNow) || (i == routeLength - 1 && route[i].enterTime < timeNow)) {
                curIndex = i;
                curPos = [route[i].xInt, route[i].yInt, this.sceneState.players.hero.pos[2]];
            }
        }
        return {
            routeIndex: curIndex,
            pos: curPos
        };
    }
}

export default PlayerController