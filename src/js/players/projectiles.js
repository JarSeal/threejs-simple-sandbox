import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { calculateAngle } from "../util";

class Projectiles {
    constructor(scene, sceneState, SoundController) {
        this.scene = scene;
        this.sceneState = sceneState;
        this.projectileGeoInside = new THREE.PlaneBufferGeometry();
        this.projectileGeoOutside = new THREE.PlaneBufferGeometry();
        this.projectileMatInside = new THREE.MeshBasicMaterial({
            color: 0xfffff0,
        });
        this.projectileMatOutside = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.2,
        });
        this.sparkSize = 0.1;
        this.sparkGeo = new THREE.PlaneBufferGeometry(this.sparkSize, this.sparkSize);
        this.sparkMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            name: "sparkMaterial",
        });
        this.sparkMat2 = new THREE.ShaderMaterial();
        this.burnMarkTexture = new THREE.TextureLoader().load('/images/sprites/burn-mark.png');
        this.smokeTexture = new THREE.TextureLoader().load('/images/sprites/smoke-01.png');
        this.fxSpark = new THREE.TextureLoader().load("/images/sprites/fx-spark.png");
        this.preCountedTurns = {
            fortyFive: 45 * (Math.PI/180),
            ninety: 90 * (Math.PI/180),
            hundredThirtyFive: 135 * (Math.PI/180),
            hundredEighty: 180 * (Math.PI/180),
        };
        this.sounds = SoundController.loadSoundsSprite("projectile", {volume: 0.1});
    }

    shootProjectile(shooter, target, scene, sceneState, AppUiLayer, camera) {
        
        // AppUiLayer.logMessage(
        //     performance.now(),
        //     sceneState.players.hero.name,
        //     'Shots fired..',
        //     'S'
        // );

        let from = [shooter.microPos[0], shooter.microPos[1]];
        if(from[0] < -256 || from[0] > 256 || from[1] < -256 || from[1] > 256) return; // Out of play area
        if((from[0] === target[0] && from[1] === target[1]) || (shooter.pos[0] === target[0] && shooter.pos[1] === target[1])) return; // Do not shoot your own legs

        let speedPerTile = 0.085 * sceneState.timeSpeed, // in seconds
            maxDistance = 20,
            raycaster = new THREE.Raycaster(),
            startPoint = new THREE.Vector3(from[0], from[1], 1),
            direction = new THREE.Vector3(),
            hitObject = this.scene.getObjectByName("king-mesh");
        direction.subVectors(new THREE.Vector3(target[0], target[1], 1), startPoint).normalize();;
        raycaster.set(startPoint, direction, true);
        let intersects = raycaster.intersectObject(hitObject, true);
        let angle = 0,
            name = "proje-" + shooter.id + "-" + performance.now();
        let tileMap = sceneState.shipMap[sceneState.floor];
        let targetPos = [];
        let projectileLife = this.getProjectileLife(intersects, from, target, speedPerTile, tileMap, maxDistance);

        if(!intersects.length || intersects[0].distance > maxDistance) {
            intersects = projectileLife.intersects;
        }

        //let helperLine = this.showProjectileHelper(startPoint, intersects, scene);
        targetPos = [intersects[0].point.x, intersects[0].point.y];
        angle = calculateAngle(from, targetPos);

        let speed = intersects[0].distance * speedPerTile;
        this.sceneState.consequences.addProjectile(shooter.id, name, projectileLife.route);
        let particles = 0;
        let meshInside = new THREE.Mesh(this.projectileGeoInside, this.projectileMatInside);
        meshInside.scale.set(0.35, 0.05, 1);
        meshInside.name = name + "-inside";
        let projectileGroup = new THREE.Group();
        projectileGroup.name = name + "-group";
        projectileGroup.add(meshInside);
        particles++;

        let meshOutside = new THREE.Mesh(this.projectileGeoInside, this.projectileMatOutside);
        meshOutside.scale.set(0.51, 0.21, 1);
        meshOutside.position.set(0, 0, -0.01);
        meshOutside.name = name + "-outside";
        projectileGroup.add(meshOutside);
        particles++;
        if(!this.sceneState.settings.useOpacity) {
            meshOutside.material.opacity = 1;
            meshOutside.material.color.setHex(0X664646);
        }
        projectileGroup.rotation.z = angle + 1.5708;
        projectileGroup.position.set(from[0], from[1], 1);
        scene.add(projectileGroup);
        this.sceneState.particles += particles; // ADD PARTICLE(S)
        let tl = new TimelineMax();
        tl.startTime = performance.now();
        this.sounds.play("projectile-002");
        this.sounds.play("whoosh-001");
        tl.to(projectileGroup.position, speed, {
            x: targetPos[0],
            y: targetPos[1],
            ease: Linear.easeNone,
            onUpdate: () => {
                let hitter = this.sceneState.consequences.checkHitTime(name, this.sceneState.initTime.s);
                if(hitter) {
                    this.sceneState.consequences.doHitConsequence(name, hitter, scene);
                    this.sceneState.particles -= particles;
                    this.hitObstacle(hitter.target, scene, name, camera, tileMap, hitter.hitPos, projectileLife);
                    tl.kill();
                    return;
                }
                let timeNow = this.sceneState.initTime.s + performance.now() / 1000;
                if(timeNow > projectileLife.route[projectileLife.route.length - 1].leaveTime + 0.5) {
                    this.sceneState.consequences.removeProjectile(name, scene);
                    this.sceneState.particles -= particles;
                    tl.kill();
                }
            },
            onComplete: () => {
                this.sceneState.particles -= particles; // REMOVE PARTICLE(S)
                if(!projectileLife.noHit) {
                    this.hitObstacle('solid', scene, name, camera, tileMap, targetPos, projectileLife);
                }
                this.sceneState.consequences.removeProjectile(name, scene);
                // scene.remove(helperLine);
            }
        });
    }

    getProjectileRoute(from, targetPos, speedPerTile, distance, dir) {
        let route = [],
            startTime = this.sceneState.initTime.s + performance.now() / 1000,
            xLength = 0,
            yLength = 0,
            xLen,
            yLen,
            angle,
            pos,
            posExact,
            travel = 0.2, // How much should the hypotenuse be travelled before the next check
            loopLength = Math.ceil(distance / travel),
            enterTime,
            i = 0;
        if(dir == 1 || dir == 3 || dir == 5 || dir == 7) {
            xLength = Math.abs(from[0] - targetPos[0]);
            yLength = Math.abs(from[1] - targetPos[1]);
            xLen = yLength > xLength ? yLength : xLength;
            yLen = yLength > xLength ? xLength : yLength;
            angle = Math.atan2(yLen, xLen);
        }
        for(i=0; i<loopLength; i++) {
            switch(dir) {
                case 0:
                    posExact = [
                        from[0],
                        from[1] - travel * i,
                    ];
                    pos = [
                        posExact[0],
                        Math.round(posExact[1]),
                    ];
                    break;
                case 2:
                    posExact = [
                        from[0] - travel * i,
                        from[1],
                    ];
                    pos = [
                        Math.round(posExact[0]),
                        posExact[1],
                    ];
                    break;
                case 4:
                    posExact = [
                        from[0],
                        from[1] + travel * i,
                    ];
                    pos = [
                        posExact[0],
                        Math.round(posExact[1]),
                    ];
                    break;
                case 6:
                    posExact = [
                        from[0] + travel * i,
                        from[1],
                    ];
                    pos = [
                        Math.round(posExact[0]),
                        posExact[1],
                    ];
                    break;
                case 1:
                    if(yLength > xLength) {
                        posExact = [
                            from[0] - Math.sin(angle) * travel * i,
                            from[1] - Math.cos(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    } else {
                        posExact = [
                            from[0] - Math.cos(angle) * travel * i,
                            from[1] - Math.sin(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    }
                    break;
                case 3:
                    if(yLength > xLength) {
                        posExact = [
                            from[0] - Math.sin(angle) * travel * i,
                            from[1] + Math.cos(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    } else {
                        posExact = [
                            from[0] - Math.cos(angle) * travel * i,
                            from[1] + Math.sin(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    }
                    break;
                case 5:
                    if(yLength > xLength) {
                        posExact = [
                            from[0] + Math.sin(angle) * travel * i,
                            from[1] + Math.cos(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    } else {
                        posExact = [
                            from[0] + Math.cos(angle) * travel * i,
                            from[1] + Math.sin(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    }
                    break;
                case 7:
                    if(yLength > xLength) {
                        posExact = [
                            from[0] + Math.sin(angle) * travel * i,
                            from[1] - Math.cos(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    } else {
                        posExact = [
                            from[0] + Math.cos(angle) * travel * i,
                            from[1] - Math.sin(angle) * travel * i,
                        ];
                        pos = [
                            Math.round(posExact[0]),
                            Math.round(posExact[1]),
                        ];
                    }
                    break;
            }
            if(!route.length || route[route.length-1].pos[0] !== pos[0] || route[route.length-1].pos[1] !== pos[1]) {
                enterTime = startTime + i * travel * speedPerTile;
                route.push({
                    pos: pos,
                    posExact: posExact,
                    enterTime: enterTime,
                    dir: dir,

                });
                if(route.length > 1) {
                    route[route.length - 2].leaveTime = enterTime;
                }
            }
        } // end loop
        if(route.length) {
            route[route.length-1].leaveTime = startTime + distance * speedPerTile;
        }

        return route;
    }

    createIntersector(from, target, maxDistance) {
        let targetPos = [0,0],
            dir,
            angle;
        if(from[0] === target[0] || from[1] === target[1]) {
            // Straight
            if(from[0] === target[0]) {
                from[1] > target[1] ? dir = 0 : dir = 4;
                targetPos[0] = from[0];
                dir == 4 ? targetPos[1] = from[1] + maxDistance : targetPos[1] = from[1] - maxDistance;
            } else {
                from[0] > target[0] ? dir = 2 : dir = 6;
                dir == 6 ? targetPos[0] = from[0] + maxDistance : targetPos[0] = from[0] - maxDistance;
                targetPos[1] = from[1];
            }
        } else {
            // Diagonal shot
            if(from[1] > target[1] && from[0] > target[0]) { dir = 1; } else
            if(from[1] < target[1] && from[0] > target[0]) { dir = 3; } else
            if(from[1] < target[1] && from[0] < target[0]) { dir = 5; } else
            if(from[1] > target[1] && from[0] < target[0]) { dir = 7; }
            angle = calculateAngle(from, target) + 1.5708;
            let xLength = Math.abs(Math.cos(angle) * maxDistance);
            let yLength = Math.abs(Math.sin(angle) * maxDistance);
            dir > 4 ? targetPos[0] = from[0] + xLength : targetPos[0] = from[0] - xLength;
            dir > 2 && dir < 6 ? targetPos[1] = from[1] + yLength : targetPos[1] = from[1] - yLength;
        }
        return {point: {x: targetPos[0], y: targetPos[1]}, distance: maxDistance, dir: dir};
    }

    getProjectileLife(intersects, from, target, speedPerTile, tileMap, maxDistance) {
        let noHit = false;
        if(!intersects.length || intersects[0].distance > maxDistance) {
            // Does not hit anything
            intersects = [];
            intersects.push(this.createIntersector(from, target, maxDistance));
            noHit = true;
        }
        let distance = intersects[0].distance;
        let life = {
            speed: speedPerTile * distance,
            dir: noHit ? intersects[0].dir : 0,
            turn: 0,
            xOffset: 0,
            yOffset: 0,
            route: [],
            special: false,
            intersects,
            noHit: noHit,
        },
        hitPos = [Math.round(intersects[0].point.x), Math.round(intersects[0].point.y)],
        wallType,
        defaultOffset = 0.05;

        if(!noHit) {
            // Check if the projectile travels on a straight line
            if(from[0] === target[0] || from[1] === target[1]) {
                // Straight
                if(from[0] === target[0]) {
                    if(from[1] > target[1]) {
                        life.dir = 0;
                        life.turn = this.preCountedTurns.ninety;
                        life.yOffset = defaultOffset;
                    } else {
                        life.dir = 4;
                        life.turn = -this.preCountedTurns.ninety;
                        life.yOffset = -defaultOffset;
                    }
                } else {
                    if(from[0] > target[0]) {
                        life.dir = 2;
                        life.turn = 0;
                        life.xOffset = defaultOffset;
                    } else {
                        life.dir = 6;
                        life.turn = this.preCountedTurns.hundredEighty;
                        life.xOffset = -defaultOffset;
                    }
                }
            } else {
                // Diagonal shot
                if(from[1] > target[1] && from[0] > target[0]) {
                    life.dir = 1;
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && !this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "y"; } else 
                    if(this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap)) { wallType = "x"; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "negEdge"; } else
                    { wallType = "posEdge" }
                    switch(wallType) {
                        case "y":
                            life.turn = 0;
                            life.xOffset = defaultOffset;
                            break;
                        case "x":
                            life.turn = this.preCountedTurns.ninety;
                            life.yOffset = defaultOffset;
                            break;
                        case "posEdge":
                            if(intersects[0].point.x > Math.round(intersects[0].point.x) + 0.25 && intersects[0].point.y > Math.round(intersects[0].point.y) + 0.25) {
                                life.turn = this.preCountedTurns.fortyFive;
                                break;
                            } else if(intersects[0].point.x > Math.round(intersects[0].point.x) + 0.25) {
                                life.turn = 0;
                                life.xOffset = defaultOffset;
                                life.special = true;
                                break;
                            } else {
                                life.turn = this.preCountedTurns.ninety;
                                life.yOffset = defaultOffset;
                                break;
                            }
                        case "negEdge":
                            life.turn = this.preCountedTurns.fortyFive;
                            break;
                    }
                } else
                if(from[1] < target[1] && from[0] > target[0]) {
                    life.dir = 3;
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && !this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "y"; } else 
                    if(this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) { wallType = "x"; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "negEdge"; } else
                    { wallType = "posEdge" }
                    switch(wallType) {
                        case "y":
                            life.turn = 0;
                            life.xOffset = defaultOffset;
                            break;
                        case "x":
                            life.turn = -this.preCountedTurns.ninety;
                            life.yOffset = -defaultOffset;
                            break;
                        case "posEdge":
                            if(intersects[0].point.x > Math.round(intersects[0].point.x) + 0.25 && intersects[0].point.y < Math.round(intersects[0].point.y) - 0.25) {
                                life.turn = -this.preCountedTurns.fortyFive;
                                break;
                            } else if(intersects[0].point.x > Math.round(intersects[0].point.x) + 0.25) {
                                life.turn = 0;
                                life.xOffset = defaultOffset;
                                life.special = true;
                                break;
                            } else {
                                life.turn = -this.preCountedTurns.ninety;
                                life.yOffset = -defaultOffset;
                                break;
                            }
                        case "negEdge":
                            life.turn = -this.preCountedTurns.fortyFive;
                            break;
                    }
                } else
                if(from[1] < target[1] && from[0] < target[0]) {
                    life.dir = 5;
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && !this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = "y"; } else 
                    if(this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) { wallType = "x"; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = "negEdge"; } else
                    { wallType = "posEdge" }
                    switch(wallType) {
                        case "y":
                            life.turn = this.preCountedTurns.hundredEighty;
                            life.xOffset = -defaultOffset;
                            break;
                        case "x":
                            life.turn = -this.preCountedTurns.ninety;
                            life.yOffset = -defaultOffset;
                            break;
                        case "posEdge":
                            if(intersects[0].point.x < Math.round(intersects[0].point.x) - 0.25 && intersects[0].point.y < Math.round(intersects[0].point.y) - 0.25) {
                                life.turn = -this.preCountedTurns.hundredThirtyFive;
                                break;
                            } else if(intersects[0].point.x < Math.round(intersects[0].point.x) - 0.25) {
                                life.turn = this.preCountedTurns.hundredEighty;
                                life.xOffset = -defaultOffset;
                                life.special = true;
                                break;
                            } else {
                                life.turn = -this.preCountedTurns.ninety;
                                life.yOffset = -defaultOffset;
                                break;
                            }
                        case "negEdge":
                            life.turn = -this.preCountedTurns.hundredThirtyFive;
                            break;
                    }
                } else
                if(from[1] > target[1] && from[0] < target[0]) {
                    life.dir = 7;
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && !this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = "y"; } else 
                    if(this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap)) { wallType = "x"; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = "negEdge"; } else
                    { wallType = "posEdge" }
                    switch(wallType) {
                        case "y":
                            life.turn = this.preCountedTurns.hundredEighty;
                            life.xOffset = -defaultOffset;
                            break;
                        case "x":
                            life.turn = this.preCountedTurns.ninety;
                            life.yOffset = defaultOffset;
                            break;
                        case "posEdge":
                            if(intersects[0].point.x < Math.round(intersects[0].point.x) - 0.25 && intersects[0].point.y > Math.round(intersects[0].point.y) + 0.25) {
                                life.turn = this.preCountedTurns.hundredThirtyFive;
                                break;
                            } else if(intersects[0].point.x < Math.round(intersects[0].point.x) - 0.25) {
                                life.turn = this.preCountedTurns.hundredEighty;
                                life.xOffset = -defaultOffset;
                                life.special = true;
                                break;
                            } else {
                                life.turn = this.preCountedTurns.ninety;
                                life.yOffset = defaultOffset;
                                break;
                            }
                        case "negEdge":
                            life.turn = this.preCountedTurns.hundredThirtyFive;
                            break;
                    }
                }
            }
        }

        let hitPosAccurate = [intersects[0].point.x, intersects[0].point.y];
        life.route = this.getProjectileRoute(from, hitPosAccurate, speedPerTile, distance, life.dir);
        life.intersects = intersects;

        return life;
    }

    checkIfWall(x, y, tileMap) {
        x = Math.round(x);
        y = Math.round(y);
        if(!tileMap[x] || !tileMap[x][y] || x < 0 || y < 0) return false;
        return tileMap[x][y].type === 2;
    }

    hitObstacle(type, scene, projectileName, camera, tileMap, targetPos, projectileLife) {
        let pos = [targetPos[0], targetPos[1]],
            posWOffset = [targetPos[0] + projectileLife.xOffset, targetPos[1] + projectileLife.yOffset],
            minFloorParticles = 3,
            maxFloorParticles = 36,
            floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles),
            i = 0,
            streaks,
            particles,
            maxParticles = this.sceneState.settings.maxSimultaneousParticles,
            curParticles = this.sceneState.particles;
        if(type == 'solid') {
            // floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles);
            // streaks = this._randomIntInBetween(2, 6);
            // particles = floorParticles + streaks;
            // if(curParticles + particles > maxParticles) {
            //     floorParticles = maxParticles - curParticles;
            //     if(floorParticles < 0) floorParticles = 0;
            //     streaks = 0;
            // }
            // this.sceneState.particles += streaks;
            //this.createStreaks(streaks, scene, posWOffset, pos, tileMap, projectileLife);
            //this.createBurnSpot(projectileLife, posWOffset, scene, camera);
            //this.createFloorSparks(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife, projectileName);
            this.createWallBurn(projectileLife, posWOffset, scene, camera);
            this.createSparkParticles(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife);
            this.sounds.play("ricochet-001");
        } else if(type == 'player' || type == 'door') {
            // floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles);
            // streaks = this._randomIntInBetween(2, 6);
            // particles = floorParticles + streaks;
            // if(curParticles + particles > maxParticles) {
            //     floorParticles = maxParticles - curParticles;
            //     if(floorParticles < 0) floorParticles = 0;
            //     streaks = 0;
            // }
            // this.sceneState.particles += floorParticles + streaks;
            // this.createFloorSparks(floorParticles, scene, camera, posWOffset, pos, "player", projectileLife, projectileName);
            // this.createStreaks(streaks, scene, posWOffset, pos, "player", projectileLife);
            this.createSparkParticles(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife);
            if(type == 'door') {
                this.sounds.play("ricochet-001");
            } else {
                this.sounds.play("zap-001");
            }
        }
    }

    createSparkParticles(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife) {
        let geometry = new THREE.BufferGeometry();
        let vertices = [];
        let targetPositions = [];
        let i = 0;
        for(i=0; i<floorParticles; i++) {
            vertices.push(posWOffset[0], posWOffset[1], 1);
            targetPositions.push([
                posWOffset[0] + this.random2dAmount(projectileLife.dir, 'x', tileMap, pos, projectileLife.special),
                posWOffset[1] + this.random2dAmount(projectileLife.dir, 'y', tileMap, pos, projectileLife.special),
                0.1
            ]);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        let material = new THREE.PointsMaterial({
            size: 10,
            sizeAttenuation: false,
            map: this.fxSpark,
            alphaTest: 0.5,
            transparent: true
        });
        material.color.setHSL(0.1805, 0, 1.0);
        let sparks = new THREE.Points(geometry, material);
        scene.add(sparks);
        for(i=0; i<floorParticles; i++) {
            (function(i, particles, sparks, targetPositions, scene, time) {
                let tl = new TimelineMax();
                let positions = sparks.geometry.attributes.position,
                    x = positions.getX(i),
                    y = positions.getY(i),
                    z = positions.getZ(i),
                    progressXY = {x: x, y: y},
                    progressZ = {z: z};
                tl.to(progressXY, time, {x: targetPositions[i][0], y: targetPositions[i][1], onUpdate: () => {
                    positions.setXY(i, progressXY.x, progressXY.y);
                }}).to(progressZ, time, {z: targetPositions[i][2], ease: Bounce.easeOut, onUpdate: () => {
                    positions.setZ(i, progressZ.z);
                    positions.needsUpdate = true;
                }}, "-="+time);
                if(i === 0) {
                    let materialValues = {size:10, h:0.5805, s:0.0, l:1.0};
                    let tl2 = new TimelineMax();
                    tl2.to(materialValues, 1.7, {size: 0.001, onUpdate: () => {
                        sparks.material.size = materialValues.size;
                    }}).to(materialValues, 1.7, {s: 0.55, onUpdate: () => {
                        sparks.material.color.setHSL(materialValues.h, materialValues.s, materialValues.l);
                        sparks.material.needsUpdate = true;
                    }}, "-=1.7");
                }
                if(i+1 == particles) {
                    setTimeout(() => {
                        sparks.geometry.dispose();
                        sparks.material.dispose();
                        scene.remove(sparks);
                    }, 2200);
                }
            })(i, floorParticles, sparks, targetPositions, scene, this._randomFloatInBetween(0.5, 1.7));
        }
    }

    createStreaks(streaks, scene, posWOffset, pos, tileMap, projectileLife) {
        let i = 0;
        for(i=0; i<streaks; i++) {
            (() => {
                let tl = new TimelineMax(),
                    lifeSpan = this._randomFloatInBetween(0.1, 0.2),
                    newX = posWOffset[0] + this.random2dAmount(projectileLife.dir, 'x', tileMap, pos, projectileLife.special),
                    newY = posWOffset[1] + this.random2dAmount(projectileLife.dir, 'y', tileMap, pos, projectileLife.special),
                    newZ = this._randomFloatInBetween(0.8, 1.6),
                    streakGeo = new THREE.Geometry();
                streakGeo.vertices.push(
                    new THREE.Vector3(posWOffset[0], posWOffset[1], 1),
                    new THREE.Vector3(posWOffset[0], posWOffset[1], 1),
                );
                let streak = new THREE.Line(streakGeo, new THREE.LineBasicMaterial({color: 0xffffff}));
                scene.add(streak);
                tl.to(streak.geometry.vertices[1], lifeSpan, {
                    x: newX,
                    y: newY,
                    z: newZ,
                    ease: Linear.easeNone,
                    onUpdate: () => {
                        if(streak) streak.geometry.verticesNeedUpdate = true;
                    }
                }).to(streak.geometry.vertices[0], lifeSpan, {
                    x: newX,
                    y: newY,
                    z: newZ,
                    ease: Linear.easeNone,
                    onUpdate: () => {
                        if(streak) streak.geometry.verticesNeedUpdate = true;
                    },
                    onComplete: () => {
                        if(streak) {
                            streak.geometry.dispose();
                            streak.material.dispose();
                            scene.remove(streak);
                            this.sceneState.particles--;
                        }
                    },
                }, "-="+lifeSpan/1.2);
            })();
        }
    }

    createSparkMaterial(uTime, pos) {
        const uniforms = {
            uTime: uTime,
            uResolution: { value: new THREE.Vector2(1.0, 1.0), type: "v2" },
            uColor1: { value: new THREE.Vector3(1.000, 0.833, 0.224), type: "v3" },
            uColor2: { value: new THREE.Vector3(1, 0, 0), type: "v3" },
            uPosX: { value: pos.x },
            uPosY: { value: pos.y },
            uPosZ: { value: pos.z },
        };

        const vertexShader = `
        uniform float uTime;
        uniform float uPosX;
        uniform float uPosY;
        uniform float uPosZ;
        varying vec2 vUv;
        varying float time;
        void main() {
            vUv = uv;
            time = uTime;
            vec3 newPos = position;
            newPos.x += uPosX;
            newPos.y += uPosY;
            newPos.z = uPosZ - 1.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }`;

        const fragmentShader = `
        #ifdef GL_ES
        precision mediump float;
        #endif

        uniform vec2 uResolution;
        uniform vec3 uColor1;
        uniform vec3 uColor2;

        varying vec2 vUv;
        varying float time;

        void main() {
            float border_size = 0.5;
            float disc_radius = 0.1;
            float blue = 1.0;
            float green = 1.0;
            if(time > 0.1) {
                blue = mix(1.0, 0.0, (time-0.1) / 0.3);
            }
            if(time > 0.5) {
                disc_radius -= time / 10.0;
                if(disc_radius < 0.0) {
                    disc_radius = 0.0;
                }
            }
            if(time > 0.8) {
                green = mix(1.0, 0.0, (time-0.7) / 0.2);
                border_size -= time / 10.0;
            }
            if(time >= 1.0) {
                disc_radius = 0.000001;
                border_size = 0.000001;
            }
            vec4 bkg_color = vec4(1.0, green, blue, 0.0);
            vec4 disc_color = vec4(1.0, green, blue, 1);
            
            vec2 uv = vUv;
            //uv -= vec2(0.5, 0.5);
            float dist = sqrt(dot(uv, uv));
            float t = smoothstep(disc_radius+border_size, disc_radius-border_size, dist);
            gl_FragColor = mix(bkg_color, disc_color, t);
        }
        `;

        return {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            //alphaTest: 0.5,
        }
    }

    createShaderSparks(scene, camera, posWOffset, tilePos, tileMap, projectileLife) {
        let uTime = {value: 0.0},
            pos = {x:posWOffset[0],y:posWOffset[1],z:1},
            newPos = {
                x: posWOffset[0] + this.random2dAmount(projectileLife.dir, 'x', tileMap, pos, projectileLife.special),
                y: posWOffset[1] + this.random2dAmount(projectileLife.dir, 'y', tileMap, pos, projectileLife.special),
                z: this.sparkSize,
            };
        let plane1 = new THREE.PlaneBufferGeometry(0.5, 0.5);
        let plane2 = new THREE.PlaneBufferGeometry(0.5, 0.5);
        let posAttribute = plane2.attributes.position,
            i = 0,
            attrLength = posAttribute.count;
        for(i=0; i<attrLength; i++) {

            let x = posAttribute.getX(i),
                y = posAttribute.getY(i);

            x += 0.5;
            y += 0.5;
            
            posAttribute.setXY(i, x, y);
            posAttribute.needsUpdate = true;
        }
        let merged = BufferGeometryUtils.mergeBufferGeometries([plane1, plane2], true);
        let spark = new THREE.Mesh(
            merged,
            new THREE.ShaderMaterial(this.createSparkMaterial(uTime, pos))
        );
        let speed = this._randomFloatInBetween(0.1, 1.2);
        console.log("MERGED", merged);
        spark.position.set(posWOffset[0], posWOffset[1], 1);
        spark.quaternion.copy(camera.quaternion);
        scene.add(spark);
        let tl = new TimelineMax();
        tl.to(pos, speed, {x:newPos.x, y:newPos.y, onUpdate: () => {
            spark.material.uniforms.uPosY.value = pos.x - posWOffset[0];
            spark.material.uniforms.uPosX.value = pos.y - posWOffset[1];
        }}).to(pos, speed, {z:newPos.z, ease: Bounce.easeOut, onUpdate: () => {
            spark.material.uniforms.uPosZ.value = pos.z;
            spark.material.uniforms.uTime.value = tl.progress();
        }}, "-="+speed);
    }

    createFloorSparks(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife, projectileName) {
        let i = 0;
        for(i=0; i<floorParticles; i++) {
            (() => {
                let sparkName = projectileName + "-spark-" + i,
                    startColor = {color:"#ffffff"},
                    spark = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
                spark.position.set(posWOffset[0], posWOffset[1], 1);
                spark.name = sparkName;
                spark.quaternion.copy(camera.quaternion);
                scene.add(spark);
                let tl = new TimelineMax(),
                    lifeSpan = this._randomFloatInBetween(0.1, 1.2),
                    newX = posWOffset[0] + this.random2dAmount(projectileLife.dir, 'x', tileMap, pos, projectileLife.special),
                    newY = posWOffset[1] + this.random2dAmount(projectileLife.dir, 'y', tileMap, pos, projectileLife.special);
                tl.to(scene.getObjectByName(sparkName).position, lifeSpan, {x: newX, y: newY})
                  .to(scene.getObjectByName(sparkName).position, lifeSpan, {z: this.sparkSize, ease: Bounce.easeOut}, "-="+lifeSpan)
                  .to(startColor, lifeSpan / 4, {color:"#ffff00", onUpdate: () => {
                    let sparkObj = scene.getObjectByName(sparkName);
                    if(sparkObj) {
                        sparkObj.material.color.set(startColor.color);
                    }
                  }}, "-="+(lifeSpan / 1.5))
                  .to(startColor, lifeSpan / 4, {color:"#ff0000", onUpdate: () => {
                    let sparkObj = scene.getObjectByName(sparkName);
                    if(sparkObj) {
                        sparkObj.material.color.set(startColor.color);
                    }
                  }}, "-="+(lifeSpan / 4))
                  .to(scene.getObjectByName(sparkName).scale, lifeSpan, {x: 0.05, y: 0.05, ease: Bounce.easeOut}, "-="+(lifeSpan / 1.5))
                  .to(scene.getObjectByName(sparkName).material, lifeSpan, {opacity: 0});
                setTimeout(() => {
                    let removeThis = scene.getObjectByName(sparkName);
                    if(removeThis) {
                        removeThis.material.dispose();
                        scene.remove(removeThis);
                    }
                    this.sceneState.particles--;
                }, lifeSpan * 1000 * 2);
            })();
        }
    }

    _randomIntInBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    _randomFloatInBetween(min, max) {
        min *= 10; max *= 10;
        return Math.floor(Math.random() * (max - min + 1) + min) / 10;
    }

    random2dAmount(dir, axis, target, hitPos, special) {
        let min = 0.4,
            max = 1.6,
            amount = this._randomFloatInBetween(min, max);
        if(target === "player" && (dir == 1 || dir == 3 || dir == 5 || dir == 7)) {
            let xOffset = hitPos[0] - Math.round(hitPos[0]);
            let yOffset = hitPos[1] - Math.round(hitPos[1]);
            switch(dir) {
                case 1:
                case 7:
                    if(axis == 'x') {
                        if(xOffset < 0) {
                            return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                        } else {
                            return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                        }
                    }
                    if(yOffset < 0) {
                        return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                    } else {
                        return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                    }
                case 3:
                case 5:
                    if(axis == 'x') {
                        if(xOffset < 0) {
                            return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                        } else {
                            return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                        }
                    }
                    if(yOffset < 0) {
                        return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                    } else {
                        return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                    }
            }
        }
        let tileMap = target;
        switch(dir) {
            case 0:
                if(axis == 'x') {
                    return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
                }
                return amount;
            case 1:
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) {
                    return amount;
                } else
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) || special) {
                    if(axis == 'y') {
                        return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                    }
                    return amount;
                } else {
                    if(axis == 'x') {
                        return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                    }
                    return amount;
                }
            case 2:
                if(axis == 'y') {
                    return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
                }
                return amount;
            case 3:
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) {
                    if(axis == 'y') { return -amount; }
                    return amount;
                } else
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) || special) {
                    if(axis == 'y') {
                        return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                    }
                    return amount;
                } else {
                    if(axis == 'x') {
                        return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                    }
                    return -amount;
                }
            case 4:
                if(axis == 'x') {
                    return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
                }
                return -amount;
            case 5:
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) {
                    return -amount;
                } else
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) || special) {
                    if(axis == 'y') {
                        return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                    }
                    return -amount;
                } else {
                    if(axis == 'x') {
                        return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                    }
                    return -amount;
                }
            case 6:
                if(axis == 'y') {
                    return Math.round(Math.random() * 10) % 2 == 0 ? -amount : amount;
                }
                return -amount;
            case 7:
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) {
                    if(axis == 'y') { return amount; }
                    return -amount;
                } else
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) || special) {
                    if(axis == 'y') {
                        return Math.round(Math.random() * 10) < 9 ? -amount : amount;
                    }
                    return -amount;
                } else {
                    if(axis == 'x') {
                        return Math.round(Math.random() * 10) < 9 ? amount : -amount;
                    }
                    return amount;
                }
        }
    }
    createSmoke(posWOffset, scene, camera) {
        let smoke1Opacity = this.sceneState.settings.useOpacity ? ((Math.random() * 7) + 1) / 10 : 1,
            smoke1 = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({map:this.smokeTexture,transparent:true,opacity:smoke1Opacity})),
            particles = 0,
            tlSmoke = new TimelineMax(),
            smokeLife = this._randomFloatInBetween(2.0, 3.8);
        smoke1.scale.set(0.3,5,1);
        smoke1.quaternion.copy(camera.quaternion);
        smoke1.position.set(posWOffset[0], posWOffset[1], 1);
        particles++;
        scene.add(smoke1);
        if(this.sceneState.settings.useOpacity) {
            tlSmoke.to(smoke1.position, smokeLife, {z: 2.5})
                   .to(smoke1.material, 2, {opacity: 0}, "-=2")
                   .to(smoke1.scale, smokeLife, {x: 8, y: 8}, "-="+smokeLife);
        } else {
            tlSmoke.to(smoke1.position, smokeLife, {z: 2.5})
                   .to(smoke1.scale, smokeLife / 3, {x: 3, y: 3}, "-="+smokeLife)
                   .to(smoke1.scale, smokeLife / 1.5, {x: 0.001, y: 0.001}, "-="+smokeLife / 1.25);
        }
        this.sceneState.particles += particles
        setTimeout(() => {
            smoke1.geometry.dispose();
            smoke1.material.dispose();
            scene.remove(smoke1);
            this.sceneState.particles -= particles;
        }, 3000);
    }

    wallBurnMaterial(uniforms) {

        const vertexShader = `
        uniform float uTime;
        uniform float uTotalTime;
        uniform float uBurnSize;
        uniform float uLavaSize;
        varying vec2 vUv;
        varying float time;
        varying float totalTime;
        varying float burnSize;
        varying float lavaSize;
        void main() {
            vUv = uv;
            time = uTime;
            totalTime = uTotalTime;
            burnSize = uBurnSize;
            lavaSize = uLavaSize;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`;

        const fragmentShader = `
        #ifdef GL_ES
        precision mediump float;
        #endif

        varying vec2 vUv;
        varying float time;
        varying float totalTime;
        varying float burnSize;
        varying float lavaSize;

        float drawLine (vec2 p1, vec2 p2, vec2 uv, float a) {
            float r = 0.;
            float one_px = 0.015; //not really one px
            
            // get dist between points
            float d = distance(p1, p2);
            
            // get dist between current pixel and p1
            float duv = distance(p1, uv);

            //if point is on line, according to dist, it should match current uv 
            r = 1.-floor(1.-(a*one_px)+distance (mix(p1, p2, clamp(duv/d, 0., 1.)), uv));
                
            return r;
        }

        void main() {
            vec4 black_alpha_color = vec4(0.0, 0.0, 0.0, 0.0);
            float burn_border_size = 0.1 * (1.0 - time);
            float burn_radius = burnSize * (1.0 - time);
            vec4 burn_color = vec4(0.0, 0.0, 0.0, 1.0);
            if(burn_radius < 0.01) {
                burn_radius = 0.0;
            }
            float lava_radius = lavaSize;
            vec4 lava_color = vec4(1.0, 0.4941, 0.0, 1.0);
            if(time > 0.4) {
                lava_radius = lavaSize * (1.4 - time * 1.5);
                lava_color.rgb = vec3(lava_color.r * (1.4 - time * 1.5),lava_color.g * (1.4 - time * 1.5),lava_color.b * (1.4 - time * 1.5));
            }
            if(lava_radius < 0.01) {
                lava_radius = 0.0;
                lava_color = vec4(0.0, 0.0, 0.0, 0.0);
            }
            
            vec2 uv = vUv;
            uv -= vec2(0.5, 0.5);
            float dist = sqrt(dot(uv, uv));
            float burn_t = smoothstep(burn_radius+burn_border_size, burn_radius-burn_border_size, dist);
            vec4 burnSpot = mix(black_alpha_color, burn_color, burn_t);
            float lava_t = smoothstep(lava_radius+0.000001, lava_radius-0.000001, dist);
            
            float speed = time;
            float line1 = 0.0;
            float line2 = 0.0;
            vec2 lStart = vec2(0.51, 0.5);
            vec2 l1p2 = vec2(0.51, 0.5);
            vec2 l2p1 = vec2(0.51, 0.65);
            vec2 l2p2 = vec2(0.51, 0.55);
            l1p2.y += speed;
            l2p2.y += speed;
            if(l1p2.y > 0.75) {
                l1p2 = vec2(0.51, 0.75);
            }
            if(l2p2.y > 0.8) {
                l2p2 = vec2(0.51, 0.8);
            }
            line1 = drawLine(lStart, l1p2, vUv.yx, 1.0);
            line2 = drawLine(lStart, l2p2, vUv.yx, 2.0);
            if(line1 == 1.0 && lavaSize > 0.055) {
                gl_FragColor = lava_color;
            } else if(line2 == 1.0 && lavaSize > 0.055) {
                gl_FragColor = vec4(lava_color.x, 0.2, lava_color.ba);
            } else {
                gl_FragColor = mix(burnSpot, lava_color, lava_t);
            }
        }
        `;

        return {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
        }
    }

    createWallBurn(projectileLife, posWOffset, scene, camera) {
        let uTime = { value: 0 },
            uTotalTime = { value: this._randomFloatInBetween(3.0, 6.0) },
            uBurnSize = { value: this._randomIntInBetween(6, 9) / 100 },
            uLavaSize = { value: this._randomIntInBetween(3, 6) / 100 },
            uniforms = {
                uTime: uTime,
                uTotalTime: uTotalTime,
                uBurnSize: uBurnSize,
                uLavaSize: uLavaSize,
            },
            plane = new THREE.PlaneBufferGeometry(1, 1),
            material = new THREE.ShaderMaterial(this.wallBurnMaterial(uniforms)),
            mesh = new THREE.Mesh(plane, material),
            group = new THREE.Group(),
            randomizer = Math.random() / 50,
            offset = this.getBurnSpotOffset(projectileLife, "burn", randomizer);
        console.log("YTootal", uTotalTime, material);
        mesh.rotation.set(0, 1.5708, 0);
        mesh.position.x = offset[0];
        mesh.position.y = offset[1];
        group.add(mesh);
        group.position.set(posWOffset[0], posWOffset[1], 1);
        group.rotation.z = projectileLife.turn;
        scene.add(group);
        let tl = new TimelineMax();
        tl.to(uTime, uTotalTime.value, {
            value: 1,
            ease: Linear.easeNone,
            onUpdate: () => {
                material.uniforms.uTime.value = tl.progress();
            },
            onComplete: () => {
                plane.dispose();
                material.dispose();
                scene.remove(mesh);
                scene.remove(group);
            }
        });
    }

    createBurnSpot(projectileLife, posWOffset, scene, camera) {
        let darkSpot1 = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({map:this.burnMarkTexture,transparent:true})),
            darkSpot2 = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone()),
            darkSpotGroup = new THREE.Group(),
            randomizer = Math.random() / 50,
            offset1 = this.getBurnSpotOffset(projectileLife, "mark", randomizer),
            offset2 = this.getBurnSpotOffset(projectileLife, "burn", randomizer),
            tl = new TimelineMax(),
            burnSize1 = Math.random() * 9,
            burnSize2 = Math.random() + 0.5,
            particles = 0;
        if(burnSize1 < 3) burnSize1 = 3;
        if(burnSize2 < 1) burnSize2 = 1;
        
        darkSpot1.material.opacity = 1;
        darkSpot1.material.depthWrite = false;
        darkSpot1.scale.set(burnSize1,burnSize1,1);
        darkSpot1.rotation.set(1.5708/2, 1.5708, 0);
        darkSpot2.material.opacity = 1;
        darkSpot2.material.depthWrite = false;
        darkSpot2.material.color.set("#ff862d");
        darkSpot2.scale.set(burnSize2,burnSize2,1);
        darkSpot2.rotation.set(1.5708/2, 1.5708, 0);
        darkSpotGroup.add(projectileLife.dir === 0 ? darkSpot2 : darkSpot1);
        darkSpotGroup.add(projectileLife.dir === 0 ? darkSpot1 : darkSpot2);
        particles += 2;
        darkSpotGroup.position.set(posWOffset[0], posWOffset[1], 1);
        darkSpotGroup.rotation.z = projectileLife.turn;
        darkSpotGroup.children[0].position.x = offset1[0];
        darkSpotGroup.children[0].position.y = offset1[1];
        darkSpotGroup.children[1].position.x = offset2[0];
        darkSpotGroup.children[1].position.y = offset2[1];

        this.createSmoke(posWOffset, scene, camera);

        scene.add(darkSpotGroup);

        if(this.sceneState.settings.useOpacity) {
            tl.to(darkSpot2.material, 2, {opacity:0})
              .to(darkSpot1.material, 3, {opacity:0}, "-=1");
        } else {
            tl.to(darkSpot2.scale, 2, {x: 0.001, y: 0.001})
              .to(darkSpot1.scale, 3, {x: 0.001, y: 0.001}, "-=1");
        }

        this.sceneState.particles += particles
        
        setTimeout(() => {
            darkSpot1.geometry.dispose();
            darkSpot1.material.dispose();
            scene.remove(darkSpot1);
            darkSpot2.geometry.dispose();
            darkSpot2.material.dispose();
            scene.remove(darkSpot2);
            scene.remove(darkSpotGroup);
            this.sceneState.particles -= particles;
        }, 4000);
    }

    getBurnSpotOffset(projectileLife, elem, randomizer) {
        let dir = projectileLife.dir,
            xPos = projectileLife.xOffset,
            yPos = projectileLife.yOffset,
            glowOffset = 0.015;
        switch(dir) {
            case 0:
                yPos += randomizer;
                if(elem == "mark") return [xPos, yPos];
                return [xPos, yPos + glowOffset];
            case 1:
                if(elem == "mark") return [xPos, yPos];
                return [xPos, yPos];
            case 2:
                xPos += randomizer;
                if(elem == "mark") return [xPos, yPos];
                return [xPos + glowOffset, yPos];
            case 3:
                if(elem == "mark") return [xPos, yPos];
                return [xPos, yPos];
            default:
                return [randomizer, randomizer];
        }
    }

    showProjectileHelper(startPoint, intersects, scene) {
        let geometry = new THREE.Geometry();
        geometry.vertices.push(startPoint);
        geometry.vertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 1));
        let material = new THREE.LineBasicMaterial({ color : 0xff0000 });
        let line = new THREE.Line(geometry, material);
        scene.add(line);
        return line;
    }
}

export default Projectiles; 