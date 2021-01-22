import * as THREE from 'three';
import { TimelineMax, Sine, Power0 } from 'gsap-ssr';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { astar, Graph } from '../vendor/astar.js';
import { calculateAngle, calculateAngle2 } from '../util.js';
import Projectiles from './projectiles.js';
import { logger } from '../util.js';

class PlayerController {
    constructor(data, scene, sceneState, doorAnimationController, SoundController, VisualEffects) {
        this.playerId = data.id;
        this.data = data;
        this.sceneState = sceneState;
        this.doorAnims = doorAnimationController;
        this.SoundController = SoundController;
        this.projectiles = new Projectiles(scene, sceneState, SoundController, VisualEffects);
        this.createNewPlayer(data, scene, sceneState);
        this.halfPI = Math.PI / 2;
    }

    createNewPlayer(data, scene, sceneState) {
        switch(data.type) {
        case 'hero':
            if(!sceneState.players.hero) {
                this.createHero(data, scene, sceneState, 'hero');
            } else {
                logger.error('Hero cannot be initiated twice (error at PlayerController -> createNewPlayer).');
            }
            break;
        case 'npc':
            this.createHero(data, scene, sceneState, data.id);
            break;
        default:
            logger.error('Player type was not recognized (error at PlayerController -> createNewPlayer).');
            return;
        }
    }

    createHero(data, scene, sceneState, handle) {
        sceneState.players[handle] = data;
        sceneState.players[handle].startAiming = this.startAiming;
        sceneState.players[handle].endAiming = this.endAiming;
        sceneState.players[handle].startFiring = this.startFiring;
        sceneState.consequences.addPlayer(data);
        this.importCharModel(scene, sceneState);
    }

    importCharModel(scene, sceneState) {
        const modelLoader = new GLTFLoader(),
            dracoLoader = new DRACOLoader(),
            textureLoader = new THREE.TextureLoader();
        const heroTexture = textureLoader.load('/images/objects/characters/basic-hero-clothes.png');
        dracoLoader.setDecoderPath('/js/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        modelLoader.load(
            'images/objects/characters/basic-hero.glb',
            (gltf) => {
                console.log('HERO IMPORT', gltf);
                const object = gltf.scene;
                object.name = this.playerId;
                const mixer = new THREE.AnimationMixer(object);
                const fileAnimations = gltf.animations,
                    idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'Idle'),
                    idle = mixer.clipAction(idleAnim),
                    walkAnim = THREE.AnimationClip.findByName(fileAnimations, 'Walk'),
                    walk = mixer.clipAction(walkAnim),
                    walkAndAimAnim = THREE.AnimationClip.findByName(fileAnimations, 'WalkAndAim'),
                    walkAndAim = mixer.clipAction(walkAndAimAnim),
                    aimAnim = THREE.AnimationClip.findByName(fileAnimations, 'AimHandGun'),
                    aim = mixer.clipAction(aimAnim);
                sceneState.mixers.push(mixer);
                this.data.anims = {
                    idle, walk, aim, walkAndAim
                };
                console.log(this.data.anims);
                this.data.animTimeline = new TimelineMax();
                this.data.anims.data = {
                    walkTimeScale: 0.96,
                    walkBackwardsTimeScale: -0.96
                };
                this.data.anims.idle.play();
                this.data.anims.idle.weight = 1;
                this.data.anims.aim.stop();
                this.data.anims.aim.weight = 0;
                this.data.anims.walk.stop();
                this.data.anims.walk.weight = 0;
                this.data.anims.walkAndAim.stop();
                this.data.anims.walkAndAim.weight = 0;
                this.data.anims.walk.timeScale = this.data.anims.data.walkTimeScale;
                this.data.anims.walkAndAim.timeScale = this.data.anims.data.walkTimeScale;

                // ANIMATIONS ARE HANDLED IN HERE:
                // calculateRoute() (to start walking)
                // newMove() (to end walking)
                // fire() method (to play shooting nudge)
                // ui/views/combat-view.js, uiData.action (to aim and return to idle or walk)
                object.scale.set(0.1214, 0.1214, 0.1214);
                object.position.x = this.data.pos[0];
                object.position.y = this.data.pos[1];
                object.position.z = 0;
                object.rotation.z = this.data.dir;
                object.traverse(o => {
                    if (o.isMesh) {
                        o.material = new THREE.MeshLambertMaterial({
                            map: heroTexture,
                            emissive: 0x442222,
                            emissiveMap: heroTexture,
                            skinning: true,
                        });
                        o.material.map.flipY = false;
                    }
                });
                const shadow = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(14, 14),
                    new THREE.MeshBasicMaterial({
                        map: textureLoader.load('/images/sprites/round-shadow-256x256.png'),
                        transparent: true,
                        depthWrite: false
                    })
                );
                shadow.position.z = 0.25;
                object.add(shadow);
                scene.add(object);
                this.data.mesh = object;
                this.data.animFns = {
                    shotKick: this.shootingAnimation(object)
                };
            },
            () => {},
            (error) => {
                logger.error('An GLTF loading error (loading hero) happened', error);
            }
        );
    }

    shootingAnimation(object) {
        // The nudge kick after a shot:
        return {
            timeKick: 0.05,
            timeReturn: 0.5,
            upperArmR: object.children[0].getObjectByName('UpperArmR'),
            upperArmRStartPos: 0.23127223520138918,
            upperArmRStartPosMoving: -0.1563762787215246,
            lowerArmR: object.children[0].getObjectByName('LowerArmR'),
            lowerArmRStartPos: -0.8660703441113196,
            lowerArmRStartPosMoving: -0.7410378740184024,
            upperArmL: object.children[0].getObjectByName('UpperArmL'),
            upperArmLStartPos: 0.11632805687631982,
            upperArmLStartPosMoving: -0.48482386836748914,
            lowerArmL: object.children[0].getObjectByName('LowerArmL'),
            lowerArmLStartPos: 1.5293015255195912,
            lowerArmLStartPosMoving: 1.5293015255195912,
            spine: object.children[0].getObjectByName('Spine1'),
            spineStartPos: 0.03215915581770319,
            spineStartPosMoving: 7.301161851467171,
            kickTL: new TimelineMax(),
            fn: function(moving) {
                if(this.kickTL._active) this.kickTL.kill();
                this.kickTL = new TimelineMax();
                if(moving) {
                    this.upperArmR.rotation.z = this.upperArmRStartPosMoving;
                    this.lowerArmR.rotation.z = this.lowerArmRStartPosMoving;
                    this.upperArmL.rotation.z = this.upperArmLStartPosMoving;
                    this.kickTL 
                        .to(this.upperArmR.rotation, this.timeKick, { z: -0.5 }, 0)
                        .to(this.upperArmR.rotation, this.timeReturn, { z: this.upperArmRStartPosMoving }, this.timeKick)
                        .to(this.lowerArmR.rotation, this.timeKick, { z: -1 }, 0)
                        .to(this.lowerArmR.rotation, this.timeReturn, { z: this.lowerArmRStartPosMoving }, this.timeKick)
                        .to(this.upperArmL.rotation, this.timeKick, { z: 0 }, 0)
                        .to(this.upperArmL.rotation, this.timeReturn, { z: this.upperArmLStartPosMoving }, this.timeKick)
                        .to(this.spine.rotation, this.timeKick, { x: -0.15 }, 0)
                        .to(this.spine.rotation, this.timeReturn, { x: this.spineStartPos }, this.timeKick);
                } else {
                    this.upperArmR.rotation.z = this.upperArmRStartPos;
                    this.lowerArmR.rotation.z = this.lowerArmRStartPos;
                    this.upperArmL.rotation.z = this.upperArmLStartPos;
                    this.lowerArmL.rotation.x = this.lowerArmLStartPos;
                    this.kickTL
                        .to(this.upperArmR.rotation, this.timeKick, { z: -0.2 }, 0)
                        .to(this.upperArmR.rotation, this.timeReturn, { z: this.upperArmRStartPos }, this.timeKick)
                        .to(this.lowerArmR.rotation, this.timeKick, { z: -1 }, 0)
                        .to(this.lowerArmR.rotation, this.timeReturn, { z: this.lowerArmRStartPos }, this.timeKick)
                        .to(this.upperArmL.rotation, this.timeKick, { z: 0.8 }, 0)
                        .to(this.upperArmL.rotation, this.timeReturn, { z: this.upperArmLStartPos }, this.timeKick)
                        .to(this.lowerArmL.rotation, this.timeKick, { x: 1 }, 0)
                        .to(this.lowerArmL.rotation, this.timeReturn, { x: this.lowerArmLStartPos }, this.timeKick)
                        .to(this.spine.rotation, this.timeKick, { x: -0.15 }, 0)
                        .to(this.spine.rotation, this.timeReturn, { x: this.spineStartPos }, this.timeKick);
                }
            }
        };
    }

    getStartingPosition(sceneState, type) {
        let startingPosition = sceneState.players[type].startingPos;
        return startingPosition;
        // TODO: finish this. We need moduleMap and shipMap to determine actual tile..
    }

    setPositions() {
        let playerTypes = [
                'hero',
                'npc'
            ],
            playerTypesLength = playerTypes.length,
            t;
        for(t=0;t<playerTypesLength;t++) {
            switch(playerTypes[t]) {
            case 'hero':
                this.animateMovement(this.data);
                break;
            case 'npc':
                this.animateMovement(this.data);
                break;
            }
        }
    }

    fire(player, target, scene, sceneState, AppUiLayer, delay) {
        player.aimingStarted = performance.now();
        // Player shooting animation:
        if(player.animFns && player.animFns.shotKick) {
            player.animFns.shotKick.fn(player.moving);
        }
        setTimeout(() => {
            this.projectiles.shootProjectile(
                player,
                target,
                scene,
                sceneState,
                AppUiLayer
            );
        }, delay * 1000);
    }

    animateMovement(player) {
        const routeLength = player.route ? player.route.length : 0;
        if(player.moving && routeLength && !player.animatingPos) {
            this.newMove(player);
        }
    }

    calculateRoute(dx, dy, newRoute) {
        const startTime = performance.now(); // Debugging (counting the time to create route)
        const newGraph = new Graph(
            this.sceneState.astar[this.sceneState.floor],
            { diagonal: true }
        );
        let playerPos = [this.data.pos[0], this.data.pos[1]];
        if(this.data.moving) {
            playerPos = [
                this.data.route[this.data.routeIndex].xInt,
                this.data.route[this.data.routeIndex].yInt,
            ];
        }
        let resultRoute;
        if(this.data && !this.data.moving) {
            resultRoute = astar.search(
                newGraph, newGraph.grid[playerPos[0]][playerPos[1]],
                newGraph.grid[dx][dy],
                { closest: true }
            );
            resultRoute.unshift({x:playerPos[0],y:playerPos[1]});
            resultRoute = this.predictAndDividePositions(resultRoute, this.data);
            const pid = 'move-' + this.data.id + '-' + performance.now();
            this.sceneState.consequences.movePlayer(this.data.id, resultRoute, pid).onmessage = (e) => {
                if(e.data.pid !== pid) return;
                this.sceneState.consequences.movePlayerCallBack(e.data);
                this.data.route = resultRoute;
                this.data.routeIndex = 0;
                this.data.animatingPos = false;
                this.data.moving = true;
                if (!this.data.anims.walk.isRunning() ||
                    this.data.movingInLastTile ||
                    newRoute) {
                    if(this.data.anims.idle.isRunning()) {
                        let fadeTime = 0.5;
                        if(this.data.route.length === 2) {
                            fadeTime = 0.3;
                        }
                        this.data.movingInLastTile = false;
                        this.data.anims.aim.stop();
                        this.data.anims.aim.weight = 0;
                        const from = this.data.anims.idle,
                            to = this.data.anims.walk,
                            to2 = this.data.anims.walkAndAim;
                        if(this.data.animTimeline._active) {
                            this.data.animTimeline.kill();
                            this.data.animTimeline = new TimelineMax();
                        }
                        to.reset();
                        to2.reset();
                        to.play();
                        to2.play();
                        this.data.animTimeline.to(from, fadeTime, {
                            weight: 0,
                            onUpdate: () => {
                                to.weight = 1 - from.weight;
                            },
                            onComplete: () => {
                                from.weight = 0;
                                from.stop();
                            }
                        });
                    }
                }
            };
        } else if(this.data.moving) {
            // Route change during movement:
            this.data.newRoute = [dx, dy];
        }
        const endTime = performance.now(); // FOR DEBUGGING PURPOSES ONLY
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
            speed;
        if(player.aimingStarted + 2500 < performance.now()) {
            player.moveBackwards = false;
            player.anims.walk.timeScale = player.anims.data.walkTimeScale;
            player.anims.walkAndAim.timeScale = player.anims.data.walkTimeScale;
        }
        if(!player.rotationAnim) {
            let newDir = calculateAngle(
                player.pos,
                [route[routeIndex].x, route[routeIndex].y]
            );
            if(player.moveBackwards && newDir < 0) {
                newDir += Math.PI;
                player.anims.walk.timeScale = player.anims.data.walkBackwardsTimeScale;
                player.anims.walkAndAim.timeScale = player.anims.data.walkBackwardsTimeScale;
            } else if(player.moveBackwards && newDir >= 0) {
                newDir -= Math.PI;
                player.anims.walk.timeScale = player.anims.data.walkBackwardsTimeScale;
                player.anims.walkAndAim.timeScale = player.anims.data.walkBackwardsTimeScale;
            } else if(!player.moveBackwards) {
                player.anims.walk.timeScale = player.anims.data.walkTimeScale;
                player.anims.walkAndAim.timeScale = player.anims.data.walkTimeScale;
            }
            if(Math.abs(player.mesh.rotation.z - newDir) > Math.PI) {
                // prevent unnecessary spin moves :)
                newDir < 0
                    ? player.mesh.rotation.z = player.mesh.rotation.z + Math.PI * -2
                    : player.mesh.rotation.z = player.mesh.rotation.z + Math.PI * 2;
            }
            tlRotate.to(player.mesh.rotation, 0.3, {
                z: newDir,
                ease: Sine.easeInOut,
                onComplete: () => {
                    player.dir = newDir;
                }
            });
        }
        speed = route[routeIndex].speed * this.sceneState.timeSpeed;
        player.curSpeed = speed * this.sceneState.timeSpeed;
        player.animatingPos = true;
        if(routeIndex === 0) {
            routeLength == 1 ? ease = Sine.easeInOut : ease = Sine.easeIn;
        } else {
            routeIndex == routeLength - 1 ? ease = Sine.easeOut : ease = Power0.easeNone;
        }
        const realPosition = this.getRealPosition(player.route, routeIndex);
        if(routeIndex !== realPosition.routeIndex) {
            routeIndex = realPosition.routeIndex;
            player.routeIndex = realPosition.routeIndex;
            player.pos = realPosition.pos;
            player.mesh.position.x = realPosition.pos[0];
            player.mesh.position.y = realPosition.pos[1];
        }
        const checkDoorsPid = 'doorCheck-' + player.id + '-' + performance.now();
        this.doorAnims.checkDoors(checkDoorsPid);
        tl.to(player.mesh.position, route[routeIndex].duration, {
            x: route[routeIndex].x,
            y: route[routeIndex].y,
            ease: ease,
            onUpdate: () => {
                player.microPos = [player.mesh.position.x, player.mesh.position.y, player.pos[2]];
                player.pos = [route[routeIndex].xInt, route[routeIndex].yInt, player.pos[2]];
                if(player.isAiming) {
                    if(player.anims.walkAndAim.weight === 0) {
                        player.anims.walkAndAim.weight = 1;
                        player.anims.walk.weight = 0;
                        player.anims.idle.weight = 0;
                        player.anims.aim.weight = 0;
                    }
                } else {
                    if(player.anims.walk.weight === 0) {
                        player.anims.walk.weight = 1;
                        player.anims.walkAndAim.weight = 0;
                        player.anims.idle.weight = 0;
                        player.anims.aim.weight = 0;
                    }
                }
            },
            onComplete: () => {
                player.pos = [route[routeIndex].xInt, route[routeIndex].yInt, player.pos[2]];
                player.microPos = [route[routeIndex].x, route[routeIndex].y, player.pos[2]];
                const evenX = route[routeIndex].x - route[routeIndex].xInt;
                const evenY = route[routeIndex].y - route[routeIndex].yInt;
                if(player.newRoute.length && evenX === 0 && evenY === 0) {
                    const dx = player.newRoute[0],
                        dy = player.newRoute[1];
                    player.newRoute = [];
                    player.moving = false;
                    player.route = [];
                    player.routeIndex = 0;
                    player.curSpeed = 0;
                    if(dx === route[routeIndex].xInt && dy === route[routeIndex].yInt) {
                        this.sceneState.consequences.stopPlayerMovement(player.id, [dx, dy]);
                        this.endPlayerAnimations(routeLength, true);
                        return;
                    }
                    this.calculateRoute(dx, dy, true);
                } else {
                    player.routeIndex++;
                    // Check if full destination is reached
                    if(routeIndex === routeLength - 1) {
                        player.moving = false;
                        player.route = [];
                        player.routeIndex = 0;
                        player.curSpeed = 0;
                        const checkDoorsPid = 'doorCheck-' + player.id + '-' + performance.now();
                        this.doorAnims.checkDoors(checkDoorsPid);
                        if(player.newRoute.length) {
                            const dx = player.newRoute[0],
                                dy = player.newRoute[1];
                            player.newRoute = [];
                            this.calculateRoute(dx, dy, true);
                        } else {
                            this.endPlayerAnimations(routeLength, true);
                        }
                        return; // End animation
                    } else if(routeIndex === routeLength - 2) {
                        this.endPlayerAnimations(routeLength);
                    }
                    this.newMove(player);
                }
            },
        });
    }

    endPlayerAnimations(routeLength, lastTile) {
        this.data.movingInLastTile = lastTile;
        if(lastTile) this.data.moveBackwards = false;
        if (this.data.anims.walk.weight > 0 ||
            this.data.anims.walkAndAim.weight > 0) {
            let fadeTime = 0.7;
            if(routeLength === 2) fadeTime = 0.5;
            if(lastTile) fadeTime = 0.3;
            let to = this.data.anims.idle;
            if(this.data.isAiming) {
                to = this.data.anims.aim;
            }
            const from = this.data.anims.walk,
                from2 = this.data.anims.walkAndAim,
                from3 = this.data.anims.aim;
            to.play();
            if(this.data.animTimeline._active) {
                this.data.animTimeline.kill();
                this.data.animTimeline = new TimelineMax();
            }
            const spine = this.data.mesh.children[0].getObjectByName('Spine1');
            this.data.animTimeline.to(to, fadeTime, {
                weight: 1,
                ease: Sine.easeInOut,
                onUpdate: () => {
                    if(from.weight > 0) {
                        from.weight = 1 - to.weight;
                    }
                    if(from2.weight > 0) {
                        from2.weight = 1 - to.weight;
                    }
                    if(lastTile && !this.data.isAiming && from3.weight > 0) {
                        from3.weight = 1 - to.weight;
                    }
                    if(this.data.spineRotated) {
                        spine.rotation.y = this.data.spineRotated;
                    }
                },
                onComplete: () => {
                    if(lastTile) {
                        from.weight = 0;
                        from2.weight = 0;
                        from.stop();
                        from2.stop();
                        if(!this.data.isAiming) {
                            from3.weight = 0;
                            from3.stop();
                        } else {
                            // TODO: THIS MAKES A NUDGE, FIX AT SOME POINT
                            from3.weight = 1;
                            from3.play();
                            this.data.anims.idle.weight = 0;
                            this.data.anims.idle.stop();
                            if(lastTile) {
                                this.data.movingInLastTile = false;
                            }
                        }
                        if(this.data.spineRotated) {
                            spine.rotation.y = this.data.spineRotated;
                            new TimelineMax().to(
                                spine.rotation,
                                0.2,
                                {
                                    y: 0,
                                    ease: Sine.easeInOut,
                                    onUpdate: () => {
                                        this.data.spineRotated = spine.rotation.y;
                                    },
                                }
                            );
                        }
                    }
                }
            });
        }
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
                curPos = [route[i].xInt, route[i].yInt, this.data.pos[2]];
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

    rotatePlayer(player, angle, turnTimeScale) {
        const spine = player.mesh.children[0].getObjectByName('Spine1');
        if (player.moving &&
            !player.moveBackwards &&
            angle !== player.dir &&
            player.routeIndex < player.route.length - 2) {
            let newSpineAngle;
            player.anims.walk.timeScale = player.anims.data.walkTimeScale;
            player.anims.walkAndAim.timeScale = player.anims.data.walkTimeScale;
            if(angle <= 0) {
                newSpineAngle = angle - player.dir * -1;
            } else {
                newSpineAngle = angle - player.dir;
            }
            player.rotationAnim = new TimelineMax().to(
                spine.rotation,
                turnTimeScale,
                {
                    y: newSpineAngle,
                    ease: Sine.easeInOut,
                    onUpdate: () => {
                        player.spineRotated = spine.rotation.y;
                    },
                    onComplete: () => {
                        player.rotationAnim = false;
                        if(player.curRotationAnim && player.rotationAnims[player.curRotationAnim]) {
                            player.rotationAnims[player.curRotationAnim].done = true;
                            let keys = Object.keys(player.rotationAnims);
                            if(keys.length) {
                                keys.sort();
                                for(let i=0; i<keys.length; i++) {
                                    let difference = 0, prevTime;
                                    if(i !== 0) {
                                        prevTime = player.rotationAnims[keys[i-1]].clickTime;
                                        difference = player.rotationAnims[keys[i]].clickTime - prevTime;
                                    }
                                    if(!player.rotationAnims[keys[i]].done) {
                                        player.curRotationAnim = keys[i];
                                        player.rotationAnims[keys[i]].waitTime = difference;
                                        this.sceneState.ui.curSecondaryTarget = player.rotationAnims[keys[i]].target;
                                        break;
                                    }
                                }
                            }
                        } else { 
                            // Brutal reset in case of trouble
                            player.rotationAnims = {};
                        }
                        clearTimeout(player.rotateSpineBackTimer);
                        player.rotateSpineBackTimer = setTimeout(() => {
                            new TimelineMax().to(
                                spine.rotation, 0.5,
                                {
                                    y: 0,
                                    ease: Sine.easeInOut,
                                    onUpdate: () => {
                                        player.spineRotated = spine.rotation.y;
                                    },
                                    onComplete: () => {
                                        player.spineRotated = 0;
                                    }
                                }
                            );
                        }, 500);
                    }
                }, turnTimeScale
            );
        } else {
            if(player.spineRotated) {
                spine.rotation.y = 0;
            }
            player.rotationAnim = new TimelineMax().to(
                player.mesh.rotation,
                turnTimeScale,
                {
                    z: angle,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        player.dir = angle;
                        player.rotationAnim = false;
                        if(player.curRotationAnim && player.rotationAnims[player.curRotationAnim]) {
                            player.rotationAnims[player.curRotationAnim].done = true;
                            let keys = Object.keys(player.rotationAnims);
                            if(keys.length) {
                                keys.sort();
                                for(let i=0; i<keys.length; i++) {
                                    let difference = 0, prevTime;
                                    if(i !== 0) {
                                        prevTime = player.rotationAnims[keys[i-1]].clickTime;
                                        difference = player.rotationAnims[keys[i]].clickTime - prevTime;
                                    }
                                    if(!player.rotationAnims[keys[i]].done) {
                                        player.curRotationAnim = keys[i];
                                        player.rotationAnims[keys[i]].waitTime = difference;
                                        this.sceneState.ui.curSecondaryTarget = player.rotationAnims[keys[i]].target;
                                        break;
                                    }
                                }
                            }
                        } else {
                            // Brutal reset in case of trouble
                            player.rotationAnims = {};
                        }
                    }
                }
            );
        }
    }

    startFiring(player, target, sceneState) {
        // Calculate angle for player to turn to
        const angle = calculateAngle2(player.pos, target),
            curAngle = player.mesh.rotation.z;
        // prevent unnecessary spin moves :)
        let difference, newExessiveAngle, exessDiff, normalDiff,
            turnAmount = curAngle > angle ? curAngle - angle : angle - curAngle;
        // if(angle < 0 && curAngle > 0) {
        //     difference = Math.PI - curAngle;
        //     newExessiveAngle = -Math.PI - difference;
        //     exessDiff = Math.abs(newExessiveAngle - angle);
        //     normalDiff = Math.abs(curAngle - angle);
        //     if(exessDiff < normalDiff) {
        //         player.mesh.rotation.z = newExessiveAngle;
        //         turnAmount = exessDiff;
        //     } else {
        //         turnAmount = normalDiff;
        //     }
        // }
        // if(angle > 0 && curAngle < 0) {
        //     difference = Math.PI - Math.abs(curAngle);
        //     newExessiveAngle = difference + Math.PI;
        //     exessDiff = Math.abs(newExessiveAngle - angle);
        //     normalDiff = Math.abs(curAngle - angle);
        //     if(exessDiff < normalDiff) {
        //         player.mesh.rotation.z = newExessiveAngle;
        //         turnAmount = exessDiff;
        //     } else {
        //         turnAmount = normalDiff;
        //     }
        // }
        if(angle < 0 && curAngle > 0) {
            difference = Math.PI - curAngle;
            newExessiveAngle = -Math.PI - difference;
            exessDiff = Math.abs(newExessiveAngle - angle);
            normalDiff = Math.abs(curAngle - angle);
            if(exessDiff < normalDiff) {
                player.mesh.rotation.z = newExessiveAngle;
                turnAmount = exessDiff;
            } else {
                turnAmount = normalDiff;
            }
        }
        if(angle > 0 && curAngle < 0) {
            difference = Math.PI - Math.abs(curAngle);
            newExessiveAngle = difference + Math.PI;
            exessDiff = Math.abs(newExessiveAngle - angle);
            normalDiff = Math.abs(curAngle - angle);
            if(exessDiff < normalDiff) {
                player.mesh.rotation.z = newExessiveAngle;
                turnAmount = exessDiff;
            } else {
                turnAmount = normalDiff;
            }
        }
        if ((player.moving && !player.moveBackwards && turnAmount > this.halfPI) ||
            (player.moving && player.moveBackwards && turnAmount <= this.halfPI)) {
            player.moveBackwards = true;
        } else {
            player.moveBackwards = false;
        }
        const turnTimeScale = turnAmount / Math.PI * 0.2;
        player.rotationTime = turnTimeScale;
        if(player.rotationAnims[player.curRotationAnim]) {
            const waitTime = player.rotationAnims[player.curRotationAnim].waitTime / 1000;
            player.rotationAnims[player.curRotationAnim].waitTime = turnTimeScale < waitTime ? waitTime - turnTimeScale : waitTime;
        }
        const spine = player.mesh.children[0].getObjectByName('Spine1');
        if (player.moving &&
            !player.moveBackwards &&
            angle !== player.dir &&
            player.routeIndex < player.route.length - 2) {
            let newSpineAngle;
            player.anims.walk.timeScale = player.anims.data.walkTimeScale;
            player.anims.walkAndAim.timeScale = player.anims.data.walkTimeScale;
            if(angle <= 0) {
                newSpineAngle = angle - player.dir * -1;
            } else {
                newSpineAngle = angle - player.dir;
            }
            player.rotationAnim = new TimelineMax().to(
                spine.rotation,
                turnTimeScale,
                {
                    y: newSpineAngle,
                    ease: Sine.easeInOut,
                    onUpdate: () => {
                        player.spineRotated = spine.rotation.y;
                    },
                    onComplete: () => {
                        player.rotationAnim = false;
                        if(player.curRotationAnim && player.rotationAnims[player.curRotationAnim]) {
                            player.rotationAnims[player.curRotationAnim].done = true;
                            let keys = Object.keys(player.rotationAnims);
                            if(keys.length) {
                                keys.sort();
                                for(let i=0; i<keys.length; i++) {
                                    let difference = 0, prevTime;
                                    if(i !== 0) {
                                        prevTime = player.rotationAnims[keys[i-1]].clickTime;
                                        difference = player.rotationAnims[keys[i]].clickTime - prevTime;
                                    }
                                    if(!player.rotationAnims[keys[i]].done) {
                                        player.curRotationAnim = keys[i];
                                        player.rotationAnims[keys[i]].waitTime = difference;
                                        sceneState.ui.curSecondaryTarget = player.rotationAnims[keys[i]].target;
                                        break;
                                    }
                                }
                            }
                        } else { 
                            // Brutal reset in case of trouble
                            player.rotationAnims = {};
                        }
                        clearTimeout(player.rotateSpineBackTimer);
                        player.rotateSpineBackTimer = setTimeout(() => {
                            new TimelineMax().to(
                                spine.rotation, 0.5,
                                {
                                    y: 0,
                                    ease: Sine.easeInOut,
                                    onUpdate: () => {
                                        player.spineRotated = spine.rotation.y;
                                    },
                                    onComplete: () => {
                                        player.spineRotated = 0;
                                    }
                                }
                            );
                        }, 500);
                    }
                }, turnTimeScale
            );
        } else {
            if(player.spineRotated) {
                spine.rotation.y = 0;
            }
            player.rotationAnim = new TimelineMax().to(
                player.mesh.rotation,
                turnTimeScale,
                {
                    z: angle,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        player.dir = angle;
                        player.rotationAnim = false;
                        if(player.curRotationAnim && player.rotationAnims[player.curRotationAnim]) {
                            player.rotationAnims[player.curRotationAnim].done = true;
                            let keys = Object.keys(player.rotationAnims);
                            if(keys.length) {
                                keys.sort();
                                for(let i=0; i<keys.length; i++) {
                                    let difference = 0, prevTime;
                                    if(i !== 0) {
                                        prevTime = player.rotationAnims[keys[i-1]].clickTime;
                                        difference = player.rotationAnims[keys[i]].clickTime - prevTime;
                                    }
                                    if(!player.rotationAnims[keys[i]].done) {
                                        player.curRotationAnim = keys[i];
                                        player.rotationAnims[keys[i]].waitTime = difference;
                                        sceneState.ui.curSecondaryTarget = player.rotationAnims[keys[i]].target;
                                        break;
                                    }
                                }
                            }
                        } else {
                            // Brutal reset in case of trouble
                            player.rotationAnims = {};
                        }
                    }
                }
            );
        }
    }

    startAiming(player) {
        if(player.animTimeline._active) {
            player.animTimeline.kill();
            player.animTimeline = new TimelineMax();
        }
        player.isAiming = true;
        player.aimingStarted = performance.now();
        const fadeTime = 0.2;
        if(player.anims.idle.isRunning()) {
            if(player.animTimeline._active) {
                player.animTimeline.kill();
                player.animTimeline = new TimelineMax();
            }
            if(!player.moving) {
                const from = player.anims.idle;
                let to = player.anims.aim,
                    from2;
                if (player.anims.walk.weight > 0 &&
                    !player.movingInLastTile) {
                    to = player.anims.walkAndAim;
                    from2 = player.anims.walk;
                    from2.weight = 0;
                } else {
                    if(player.movingInLastTile) {
                        player.anims.walk.weight = 0;
                        player.anims.walk.stop();
                        player.anims.walkAndAim.weight = 0;
                        player.anims.walkAndAim.stop();
                    }
                    to.play();
                }
                player.animTimeline.to(to, fadeTime, {
                    weight: 1,
                    ease: Sine.easeInOut,
                    onUpdate: () => {
                        from.weight = 1 - to.weight;
                        if(from2) {
                            from2.weight = 0;
                        }
                    },
                    onComplete: () => {
                        from.weight = 0;
                        from.stop();
                        if(from2) {
                            from2.weight = 0;
                        }
                    }
                });
            } else {
                const from = player.anims.idle,
                    to = player.anims.walkAndAim,
                    from2 = player.anims.walk,
                    from3 = player.anims.aim,
                    from4 = player.anims.idle;
                player.animTimeline.to(to, fadeTime, {
                    weight: 1,
                    ease: Sine.easeInOut,
                    onUpdate: () => {
                        from.weight = 1 - to.weight;
                        if(from2.weight > 0) {
                            from2.weight = 0;
                        }
                        if(from3.weight > 0) {
                            from3.weight = 0;
                            from3.stop();
                        }
                        if(from4.weight > 0) {
                            from4.weight = 0;
                            from4.stop();
                        }
                    },
                    onComplete: () => {
                        from.weight = 0;
                        from.stop();
                    }
                });
            }
        } else if(player.anims.walk.isRunning()) {
            if(player.animTimeline._active) {
                player.animTimeline.kill();
                player.animTimeline = new TimelineMax();
            }
            const from = player.anims.walk,
                to = player.anims.walkAndAim,
                from2 = player.anims.aim,
                from3 = player.anims.idle;
            player.animTimeline.to(to, fadeTime, {
                weight: 1,
                ease: Sine.easeInOut,
                onUpdate: () => {
                    from.weight = 1 - to.weight;
                    if(from2.weight > 0) {
                        from2.weight = 0;
                        from2.stop();
                    }
                    if(from3.weight > 0) {
                        from3.weight = 0;
                        from3.stop();
                    }
                },
                onComplete: () => {
                    from.weight = 0;
                    from2.weight = 0;
                    from2.stop();
                    from3.weight = 0;
                    from3.stop();
                }
            });
        }
    }

    endAiming(player) {
        player.isAiming = false;
        player.aimingStarted = performance.now() - 2000;
        const fadeTime = 0.3;
        let from, from2, to;
        if(player.moving) {
            to = player.anims.walk;
            to.weight = 0;
        } else {
            to = player.anims.idle;
            to.weight = 0;
            player.anims.walk.weight = 0;
            player.anims.walk.stop();
        }
        to.play();
        if(player.animTimeline._active) {
            player.animTimeline.kill();
            player.animTimeline = new TimelineMax();
        }
        if(player.anims.walkAndAim.weight > 0) {
            from = player.anims.walkAndAim;
            from2 = player.anims.aim;
            if(from.weight < 1) {
                to = player.anims.idle;
                to.play();
            } else {
                to = player.anims.walk;
            }
            player.animTimeline.to(to, fadeTime, {
                weight: 1,
                ease: Sine.easeInOut,
                onUpdate: () => {
                    from.weight = 1 - to.weight;
                    if(from2.weight > 0) {
                        from2.weight = from.weight;
                    }
                },
                onComplete: () => {
                    from.weight = 0;
                    from2.weight = 0;
                    from2.stop();
                    if(player.anims.idle.isRunning()) {
                        player.anims.walk.stop();
                        player.anims.walkAndAim.stop();
                    }
                }
            });
        } else {
            from = player.anims.aim;
            player.animTimeline.to(to, fadeTime, {
                weight: 1,
                ease: Sine.easeInOut,
                onUpdate: () => {
                    from.weight = 1 - to.weight;
                },
                onComplete: () => {
                    from.weight = 0;
                    from.stop();
                }
            });
        }
    }
}

export default PlayerController;