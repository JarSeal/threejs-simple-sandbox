import * as THREE from 'three';
import { TimelineMax, Sine, Power0 } from 'gsap-ssr';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { astar, Graph } from '../vendor/astar.js';
import { getPlayer } from '../data/dev-player.js'; // GET NEW PLAYER DUMMY DATA HERE
import { calculateAngle } from '../util.js';
import Projectiles from './projectiles.js';
import { logger } from '../util.js';

class PlayerController {
    constructor(scene, sceneState, doorAnimationController, SoundController, VisualEffects) {
        this.sceneState = sceneState;
        this.chars = {};
        this.doorAnims = doorAnimationController;
        this.SoundController = SoundController;
        this.projectiles = new Projectiles(scene, sceneState, SoundController, VisualEffects);
    }

    createNewPlayer(scene, renderer, sceneState, type) {
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
        sceneState.consequences.addPlayer({id:'testPLAYER',pos:[tempDudePos[0], tempDudePos[1],0]}); // TEMP PLAYER
        let tempGeometry = new THREE.BoxBufferGeometry(1,1,hero.height);
        let tempMaterial = new THREE.MeshLambertMaterial({color: 0xffEE44});
        let tempMesh = new THREE.Mesh(tempGeometry, tempMaterial);
        tempMesh.scale.x = 0.5;
        tempMesh.scale.y = 0.5;
        tempMesh.position.x = tempDudePos[0];
        tempMesh.position.y = tempDudePos[1];
        tempMesh.position.z = 1;
        scene.add(tempMesh);
        
        let group = new THREE.Group();
        let heroGeometry = new THREE.BoxBufferGeometry(1,1,hero.height);
        let heroMaterial = new THREE.MeshLambertMaterial({color: 0xff0088});
        let heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
        heroMesh.scale.x = 0.5;
        heroMesh.scale.y = 0.5;
        group.add(heroMesh);

        let pointerGeo = new THREE.BoxBufferGeometry(0.2,0.2,0.2);
        let pointerMat = new THREE.MeshLambertMaterial({color: 0x550066});
        let pointerMesh = new THREE.Mesh(pointerGeo, pointerMat);
        pointerMesh.position.z = hero.height / 2;
        pointerMesh.position.y = -0.2;

        group.add(pointerMesh);

        this.importCharModel(scene, sceneState);

        group.position.x = sceneState.players.hero.pos[0];
        group.position.y = sceneState.players.hero.pos[1];
        group.position.z = 0.5;
        group.rotation.z = hero.dir;

        //scene.add(group);
        //sceneState.players.hero.mesh = group;
    }

    importCharModel(scene, sceneState) {
        let modelLoader = new GLTFLoader(),
            dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/js/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        modelLoader.load(
            'images/objects/characters/hero1.glb',
            (gltf) => {
                let charId = 'hero',
                    object = gltf.scene;
                sceneState.mixer = new THREE.AnimationMixer(object);
                let fileAnimations = gltf.animations,
                    idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'Idle'),
                    idle = sceneState.mixer.clipAction(idleAnim);
                idle.play();
                this.chars[charId] = {
                    object: object,
                    anims: gltf.animations,
                };
                //object.scale.set(1.4, 1.4, 1.4);
                object.position.x = sceneState.players.hero.pos[0];
                object.position.y = sceneState.players.hero.pos[1];
                object.position.z = 0;
                object.rotation.z = sceneState.players.hero.dir;
                object.traverse(o => {
                    if (o.isMesh) {
                        o.material = new THREE.MeshLambertMaterial({color: 'lime', skinning: true});
                    }
                });
                scene.add(object);
                sceneState.players.hero.mesh = object;
                sceneState.postProcess.outlinePass.selectedObjects = [object.children[0].children[1]];
            },
            () => {},
            (error) => {
                logger.error('An GLTF loading error (loading hero) happened', error);
            }
        );
    }

    getStartingPosition(sceneState, type) {
        let startingPosition = sceneState.players[type].startingPos;
        return startingPosition;
        // TODO: finish this. We need moduleMap and shipMap to determine actual tile..
    }

    setPositions() {
        let playerTypes = [
                'hero',
            ],
            playerTypesLength = playerTypes.length,
            t;
        for(t=0;t<playerTypesLength;t++) {
            switch(playerTypes[t]) {
            case 'hero':
                this.animateMovement(this.sceneState.players.hero);
                break;
            }
        }
    }

    fire(player, target, scene, sceneState, AppUiLayer, camera) {
        this.projectiles.shootProjectile(
            player,
            target,
            scene,
            sceneState,
            AppUiLayer,
            camera
        );
    }

    animateMovement(player) {
        let routeLength = player.route.length;
        if(player.moving && routeLength && !player.animatingPos) {
            this.newMove(player);
        }
    }

    calculateRoute(player, dx, dy) {
        let startTime = performance.now(); // Debugging (counting the time to create route)
        let newGraph = new Graph(
            this.sceneState.astar[this.sceneState.floor],
            { diagonal: true }
        );
        let playerPos = [this.sceneState.players.hero.pos[0], this.sceneState.players.hero.pos[1]];
        if(this.sceneState.players.hero.moving) {
            playerPos = [
                this.sceneState.players.hero.route[this.sceneState.players.hero.routeIndex].xInt,
                this.sceneState.players.hero.route[this.sceneState.players.hero.routeIndex].yInt,
            ];
        }
        let resultRoute;
        if(this.sceneState.players.hero && !this.sceneState.players.hero.moving) {
            resultRoute = astar.search(
                newGraph, newGraph.grid[playerPos[0]][playerPos[1]],
                newGraph.grid[dx][dy],
                { closest: true }
            );
            resultRoute.unshift({x:playerPos[0],y:playerPos[1]});
            resultRoute = this.predictAndDividePositions(resultRoute, this.sceneState.players.hero);
            this.sceneState.players.hero.route = resultRoute;
            this.sceneState.players.hero.routeIndex = 0;
            this.sceneState.players.hero.animatingPos = false;
            this.sceneState.players.hero.moving = true;
            this.sceneState.consequences.movePlayer(this.sceneState.players.hero.id, resultRoute);
        } else if(this.sceneState.players.hero.moving) {
            // Route change during movement:
            this.sceneState.players.hero.newRoute = [dx, dy];
        }
        let endTime = performance.now(); // FOR DEBUGGING PURPOSES ONLY
        logger.log(dx, dy, 'route', (endTime - startTime) + 'ms', resultRoute, this.sceneState, this.sceneState.shipMap[this.sceneState.floor][dx][dy]);
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
            newDir < 0
                ? player.mesh.rotation.z = player.mesh.rotation.z + Math.PI * -2
                : player.mesh.rotation.z = player.mesh.rotation.z + Math.PI * 2;
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
        this.doorAnims.checkDoors();
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
                    let dx = player.newRoute[0],
                        dy = player.newRoute[1];
                    player.newRoute = [];
                    player.moving = false;
                    player.route = [];
                    player.routeIndex = 0;
                    player.curSpeed = 0;
                    this.doorAnims.checkDoors();
                    this.calculateRoute('hero', dx, dy);
                } else {
                    player.routeIndex++;
                    // Check if full destination is reached
                    if(routeIndex == routeLength - 1) {
                        player.moving = false;
                        player.route = [];
                        player.routeIndex = 0;
                        player.curSpeed = 0;
                        this.doorAnims.checkDoors();
                        return; // End animation
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

    predictAndDividePositions(route, player) {
        route = this.checkLockedDoors(route);
        if(route.length <= 1) return [];
        let routeLength = route.length,
            i,
            speed,
            duration = 0,
            nextX = 0,
            nextY = 0,
            startTime = this.sceneState.initTime.s + performance.now() / 1000,
            previousTime = 0,
            dividedRoute = [];
        for(i=0; i<routeLength; i++) {

            if(i === 0) {
                speed = player.pos[0] !== route[1].x && player.pos[1] !== route[1].y ?
                    player.speed * 1.5 * player.startMultiplier :
                    player.speed * player.startMultiplier;
                duration = (speed / 2) / 1000;
                nextX = player.pos[0] + (route[i + 1].x - player.pos[0]) / 2;
                nextY = player.pos[1] + (route[i + 1].y - player.pos[1]) / 2;
                dividedRoute.push({
                    x: nextX,
                    y: nextY,
                    xInt: route[i].x,
                    yInt: route[i].y,
                    enterTime: 0,
                    leaveTime: startTime + duration,
                    duration: duration,
                });
                previousTime = startTime + duration;
            } else if(i == routeLength - 1) {
                speed = route[i - 1].x !== route[i].x && route[i - 1].y !== route[i].y ?
                    player.speed * 1.5 * player.endMultiplier :
                    player.speed * player.endMultiplier;
                duration = (speed / 2) / 1000;
                dividedRoute.push({
                    x: route[i].x,
                    y: route[i].y,
                    xInt: route[i].x,
                    yInt: route[i].y,
                    enterTime: previousTime,
                    leaveTime: previousTime + duration,
                    duration: duration,
                });
            } else {
                speed = route[i - 1].x !== route[i].x && route[i - 1].y !== route[i].y ?
                    player.speed * 1.5 :
                    player.speed;
                duration = (speed / 2) / 1000;
                dividedRoute.push({
                    x: route[i].x,
                    y: route[i].y,
                    xInt: route[i].x,
                    yInt: route[i].y,
                    enterTime: previousTime,
                    leaveTime: previousTime + duration,
                    duration: duration,
                });
                previousTime += duration;
                speed = route[i + 1].x !== route[i].x && route[i + 1].y !== route[i].y ?
                    player.speed * 1.5 :
                    player.speed;
                duration = (speed / 2) / 1000;
                nextX = route[i].x + (route[i + 1].x - route[i].x) / 2;
                nextY = route[i].y + (route[i + 1].y - route[i].y) / 2;
                dividedRoute.push({
                    x: nextX,
                    y: nextY,
                    xInt: route[i].x,
                    yInt: route[i].y,
                    enterTime: previousTime,
                    leaveTime: previousTime + duration,
                    duration: duration,
                });
                previousTime += duration;
            }
        }
        return dividedRoute;
    }

    checkLockedDoors(route) {
        let routeLength = route.length,
            i = 0,
            tileMap = this.sceneState.shipMap[this.sceneState.floor],
            parsedRoute = [],
            x,
            y;
        for(i=0; i<routeLength; i++) {
            x = route[i].x;
            y = route[i].y;
            if(tileMap[x][y].type === 3 && tileMap[x][y].doorParams[0] && tileMap[x][y].doorParams[0].locked) {
                break;
            }
            parsedRoute.push(route[i]);
        }
        return parsedRoute;
    }
}

export default PlayerController;