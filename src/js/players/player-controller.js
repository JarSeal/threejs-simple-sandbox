import * as THREE from 'three';
import { TimelineMax, Sine, Power0 } from 'gsap-ssr';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { astar, Graph } from '../vendor/astar.js';
import { getPlayer } from '../data/dev-player.js'; // GET NEW PLAYER DUMMY DATA HERE
import { calculateAngle } from '../util.js';
import Projectiles from './projectiles.js';
import { logger, fixAnimClips } from '../util.js';

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
        let tempMaterial = new THREE.MeshLambertMaterial({color: 0x333333});
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
            dracoLoader = new DRACOLoader(),
            textureLoader = new THREE.TextureLoader();
        const heroTexture = textureLoader.load('/images/objects/characters/basic-hero-clothes.png');
        const pisa = ['nx.png', 'px.png', 'pz.png', 'nz.png', 'py.png', 'ny.png'];
        const test = [
            'envMapTestNegY.jpg',
            'envMapTestNegY.jpg',
            'envMapTestPosX.jpg',
            'envMapTestPosZ.jpg',
            'envMapTestPosZ.jpg',
            'envMapTestPosZ.jpg',
        ];
        const envMap = new THREE.CubeTextureLoader()
            .setPath('/images/objects/characters/envMapTest2/')
            .load(test, () => {
                envMap.encoding = THREE.sRGBEncoding;
            });
        dracoLoader.setDecoderPath('/js/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        modelLoader.load(
            'images/objects/characters/basic-hero.glb',
            (gltf) => {
                console.log('HERO IMPORT', gltf);
                //gltf = fixAnimClips(gltf);
                let charId = 'hero',
                    object = gltf.scene;
                sceneState.mixer = new THREE.AnimationMixer(object);
                let fileAnimations = gltf.animations,
                    idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'Idle'),
                    idle = sceneState.mixer.clipAction(idleAnim),
                    walkAnim = THREE.AnimationClip.findByName(fileAnimations, 'Walk'),
                    walk = sceneState.mixer.clipAction(walkAnim),
                    walkAndAimAnim = THREE.AnimationClip.findByName(fileAnimations, 'WalkAndAim'),
                    walkAndAim = sceneState.mixer.clipAction(walkAndAimAnim),
                    aimAnim = THREE.AnimationClip.findByName(fileAnimations, 'AimHandGun'),
                    aim = sceneState.mixer.clipAction(aimAnim);
                sceneState.players.hero.anims = {
                    idle, walk, aim, walkAndAim
                };
                console.log(sceneState.players.hero.anims);
                sceneState.players.hero.animTimeline = new TimelineMax();
                sceneState.players.hero.anims.data = {
                    walkTimeScale: 0.96,
                    walkBackwardsTimeScale: -0.96
                };
                sceneState.players.hero.anims.idle.play();
                sceneState.players.hero.anims.idle.weight = 1;
                sceneState.players.hero.anims.aim.stop();
                sceneState.players.hero.anims.aim.weight = 0;
                sceneState.players.hero.anims.walk.stop();
                sceneState.players.hero.anims.walk.weight = 0;
                sceneState.players.hero.anims.walkAndAim.stop();
                sceneState.players.hero.anims.walkAndAim.weight = 0;
                sceneState.players.hero.anims.walk.timeScale = sceneState.players.hero.anims.data.walkTimeScale;
                sceneState.players.hero.anims.walkAndAim.timeScale = sceneState.players.hero.anims.data.walkTimeScale;

                // ANIMATIONS ARE HANDLED IN HERE:
                // player-controller.js, calculateRoute (to start walking)
                // player-controller.js, newMove (to end walking)
                // projectiles.js, shootProjectile (to play shooting nudge)
                // ui/views/combat-view.js, uiData.action (to aim and return to idle or walk)
                this.chars[charId] = {
                    object: object,
                    anims: gltf.animations,
                };
                object.scale.set(0.1214, 0.1214, 0.1214);
                object.position.x = sceneState.players.hero.pos[0];
                object.position.y = sceneState.players.hero.pos[1];
                object.position.z = 0;
                object.rotation.z = sceneState.players.hero.dir;
                object.traverse(o => {
                    if (o.isMesh) {
                        o.material = new THREE.MeshLambertMaterial({
                            // color: 'red',
                            map: heroTexture,
                            emissive: 0x442222,
                            emissiveMap: heroTexture,
                            skinning: true,
                            // envMap: envMap,
                            // reflectivity: 0.1,
                            // combine: THREE.AddOperation
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
                sceneState.players.hero.mesh = object;
                sceneState.players.hero.animFns = {
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

    fire(player, target, scene, sceneState, AppUiLayer, delay) {
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
        const routeLength = player.route.length;
        if(player.moving && routeLength && !player.animatingPos) {
            this.newMove(player);
        }
    }

    calculateRoute(player, dx, dy, newRoute) {
        const startTime = performance.now(); // Debugging (counting the time to create route)
        const newGraph = new Graph(
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
            const pid = 'move-' + this.sceneState.players.hero.id + '-' + performance.now();
            this.sceneState.consequences.movePlayer(this.sceneState.players.hero.id, resultRoute, pid).onmessage = (e) => {
                if(e.data.pid !== pid) return;
                this.sceneState.consequences.movePlayerCallBack(e.data);
                this.sceneState.players.hero.route = resultRoute;
                this.sceneState.players.hero.routeIndex = 0;
                this.sceneState.players.hero.animatingPos = false;
                this.sceneState.players.hero.moving = true;
                if (!this.sceneState.players.hero.anims.walk.isRunning() ||
                    this.sceneState.players.hero.movingInLastTile ||
                    newRoute) {
                    if(this.sceneState.players.hero.anims.idle.isRunning()) {
                        let fadeTime = 0.5;
                        if(this.sceneState.players.hero.route.length === 2) {
                            fadeTime = 0.3;
                        }
                        this.sceneState.players.hero.movingInLastTile = false;
                        this.sceneState.players.hero.anims.aim.stop();
                        this.sceneState.players.hero.anims.aim.weight = 0;
                        const from = this.sceneState.players.hero.anims.idle,
                            to = this.sceneState.players.hero.anims.walk,
                            to2 = this.sceneState.players.hero.anims.walkAndAim;
                        if(this.sceneState.players.hero.animTimeline._active) {
                            this.sceneState.players.hero.animTimeline.kill();
                            this.sceneState.players.hero.animTimeline = new TimelineMax();
                        }
                        to.reset();
                        to2.reset();
                        to.play();
                        to2.play();
                        this.sceneState.players.hero.animTimeline.to(from, fadeTime, {
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
        } else if(this.sceneState.players.hero.moving) {
            // Route change during movement:
            this.sceneState.players.hero.newRoute = [dx, dy];
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
                    this.calculateRoute('hero', dx, dy, true);
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
                            this.calculateRoute('hero', dx, dy, true);
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
        this.sceneState.players.hero.movingInLastTile = lastTile;
        if(lastTile) this.sceneState.players.hero.moveBackwards = false;
        if (this.sceneState.players.hero.anims.walk.weight > 0 ||
            this.sceneState.players.hero.anims.walkAndAim.weight > 0) {
            let fadeTime = 0.7;
            if(routeLength === 2) fadeTime = 0.5;
            if(lastTile) fadeTime = 0.3;
            let to = this.sceneState.players.hero.anims.idle;
            if(this.sceneState.players.hero.isAiming) {
                to = this.sceneState.players.hero.anims.aim;
            }
            const from = this.sceneState.players.hero.anims.walk,
                from2 = this.sceneState.players.hero.anims.walkAndAim,
                from3 = this.sceneState.players.hero.anims.aim;
            to.play();
            if(this.sceneState.players.hero.animTimeline._active) {
                this.sceneState.players.hero.animTimeline.kill();
                this.sceneState.players.hero.animTimeline = new TimelineMax();
            }
            this.sceneState.players.hero.animTimeline.to(to, fadeTime, {
                weight: 1,
                ease: Sine.easeInOut,
                onUpdate: () => {
                    if(from.weight > 0) {
                        from.weight = 1 - to.weight;
                    }
                    if(from2.weight > 0) {
                        from2.weight = 1 - to.weight;
                    }
                    if(lastTile && !this.sceneState.players.hero.isAiming && from3.weight > 0) {
                        from3.weight = 1 - to.weight;
                    }
                },
                onComplete: () => {
                    if(lastTile) {
                        from.weight = 0;
                        from2.weight = 0;
                        from.stop();
                        from2.stop();
                        if(!this.sceneState.players.hero.isAiming) {
                            from3.weight = 0;
                            from3.stop();
                        } else {
                            // TODO: THIS MAKES A NUDGE, FIX AT SOME POINT
                            from3.weight = 1;
                            from3.play();
                            this.sceneState.players.hero.anims.idle.weight = 0;
                            this.sceneState.players.hero.anims.idle.stop();
                            if(lastTile) {
                                this.sceneState.players.hero.movingInLastTile = false;
                            }
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