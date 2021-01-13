import * as THREE from 'three';
import { calculateAngle } from '../util';
import { TimelineMax, Linear } from 'gsap-ssr';

class Projectiles {
    constructor(scene, sceneState, SoundController, VisualEffects) {
        this.scene = scene;
        this.sceneState = sceneState;
        this.VisualEffects = VisualEffects;
        this.shotHeight = 1.4;
        this.vfxMap = new THREE.TextureLoader().load('/images/sprites/vfx-atlas-01.png');
        this.projectileAnims = {
            count: 0,
            fired: []
        };
        this.laserObjects = {
            spriteXlen: 128 / 4096,
            spriteYlen: 64 / 4096,
        };
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
        this.fxSpark = new THREE.TextureLoader().load('/images/sprites/fx-spark.png');
        this.sparkMaterial = new THREE.PointsMaterial({
            size: 1,
            sizeAttenuation: true,
            map: this.fxSpark,
            transparent: true,
        });
        this.preCountedTurns = {
            fortyFive: 45 * (Math.PI/180),
            ninety: 90 * (Math.PI/180),
            hundredThirtyFive: 135 * (Math.PI/180),
            hundredEighty: 180 * (Math.PI/180),
        };
        this.sounds = SoundController.loadSoundsSprite('projectile', {volume: 0.1});
        this.Sound = SoundController;

        VisualEffects.createEffect('projectile', 'redBlast');
        VisualEffects.createEffect('hitBlast', 'basic');
        VisualEffects.createEffect('sparks', 'wallHit');
    }

    shootProjectile(shooter, target, scene, sceneState, AppUiLayer) {
        
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
            startPoint = new THREE.Vector3(from[0], from[1], this.shotHeight),
            direction = new THREE.Vector3(),
            hitObject = this.scene.getObjectByName('king-mesh');
        direction.subVectors(new THREE.Vector3(target[0], target[1], this.shotHeight), startPoint).normalize();
        raycaster.set(startPoint, direction, true);
        let intersects = raycaster.intersectObject(hitObject, true);
        let angle = 0,
            name = 'proje-' + shooter.id + '-' + performance.now();
        let tileMap = sceneState.shipMap[sceneState.floor];
        let targetPos = [];
        let projectileLife = this.getProjectileLife(intersects, from, target, speedPerTile, tileMap, maxDistance);

        if(!intersects.length || intersects[0].distance > maxDistance) {
            intersects = projectileLife.intersects;
        }

        //let helperLine = this.showProjectileHelper(startPoint, intersects, scene);
        targetPos = [intersects[0].point.x, intersects[0].point.y];
        angle = calculateAngle(from, targetPos);

        const speed = intersects[0].distance * speedPerTile;

        const laser = this.VisualEffects.getEffectMesh('projectile_redBlast', name);
        laser.name = name;
        laser.rotation.z = angle;
        laser.position.set(
            from[0],
            from[1],
            this.shotHeight
        );
        this.sceneState.consequences.addProjectile(shooter.id, name, projectileLife.route).onmessage = (e) => {
            this.sceneState.consequences.updateHitList(e.data);
            scene.add(laser);
            this.VisualEffects.startAnim({
                id: name,
                meshName: 'projectile_redBlast',
                mesh: laser
            });

            let tl = new TimelineMax();
            tl.startTime = performance.now();
            this.Sound.playFx(this.sounds, [
                'projectile-002',
                'whoosh-001'
            ]);
            shooter.anims.shoot.weight = 2;
            shooter.anims.shoot.reset();
            shooter.anims.shoot.play();
            shooter.anims.shoot.setLoop(THREE.LoopOnce);
            tl.to(laser.position, speed, {
                x: targetPos[0],
                y: targetPos[1],
                ease: Linear.easeNone,
                onUpdate: () => {
                    const hitter = this.sceneState.consequences.checkHitTime(name);
                    if(hitter) {
                        this.sceneState.consequences.doHitConsequence(name, scene, this.VisualEffects.removeAnim);
                        this.hitObstacle(hitter.target, scene, tileMap, hitter.hitPos, projectileLife);
                        tl.kill();
                        return;
                    }
                    // const timeNow = this.sceneState.initTime.s + performance.now() / 1000,
                    //     lastTile = projectileLife.route[projectileLife.route.length - 1];
                    // if(!lastTile || timeNow > lastTile.leaveTime + 0.5) {
                    //     this.sceneState.consequences.removeProjectile(name, scene, this.VisualEffects.removeAnim);
                    //     tl.kill();
                    // }
                },
                onComplete: () => {
                    // scene.remove(helperLine);
                    const hitter = this.sceneState.consequences.checkHitTime(name);
                    if(hitter) {
                        this.sceneState.consequences.doHitConsequence(name, scene, this.VisualEffects.removeAnim);
                        this.hitObstacle(hitter.target, scene, tileMap, hitter.hitPos, projectileLife);
                        return;
                    }
                    if(!projectileLife.noHit) {
                        this.hitObstacle('solid', scene, tileMap, targetPos, projectileLife);
                    }
                    this.sceneState.consequences.removeProjectile(name, scene, this.VisualEffects.removeAnim);
                }
            });
        };
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
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && !this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = 'y'; } else 
                    if(this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap)) { wallType = 'x'; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = 'negEdge'; } else
                    { wallType = 'posEdge'; }
                    switch(wallType) {
                    case 'y':
                        life.turn = 0;
                        life.xOffset = defaultOffset;
                        break;
                    case 'x':
                        life.turn = this.preCountedTurns.ninety;
                        life.yOffset = defaultOffset;
                        break;
                    case 'posEdge':
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
                    case 'negEdge':
                        life.turn = this.preCountedTurns.fortyFive;
                        break;
                    }
                } else
                if(from[1] < target[1] && from[0] > target[0]) {
                    life.dir = 3;
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && !this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = 'y'; } else 
                    if(this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) { wallType = 'x'; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = 'negEdge'; } else
                    { wallType = 'posEdge'; }
                    switch(wallType) {
                    case 'y':
                        life.turn = 0;
                        life.xOffset = defaultOffset;
                        break;
                    case 'x':
                        life.turn = -this.preCountedTurns.ninety;
                        life.yOffset = -defaultOffset;
                        break;
                    case 'posEdge':
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
                    case 'negEdge':
                        life.turn = -this.preCountedTurns.fortyFive;
                        break;
                    }
                } else
                if(from[1] < target[1] && from[0] < target[0]) {
                    life.dir = 5;
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && !this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = 'y'; } else 
                    if(this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) { wallType = 'x'; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = 'negEdge'; } else
                    { wallType = 'posEdge'; }
                    switch(wallType) {
                    case 'y':
                        life.turn = this.preCountedTurns.hundredEighty;
                        life.xOffset = -defaultOffset;
                        break;
                    case 'x':
                        life.turn = -this.preCountedTurns.ninety;
                        life.yOffset = -defaultOffset;
                        break;
                    case 'posEdge':
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
                    case 'negEdge':
                        life.turn = -this.preCountedTurns.hundredThirtyFive;
                        break;
                    }
                } else
                if(from[1] > target[1] && from[0] < target[0]) {
                    life.dir = 7;
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && !this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = 'y'; } else 
                    if(this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap)) { wallType = 'x'; } else
                    if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = 'negEdge'; } else
                    { wallType = 'posEdge'; }
                    switch(wallType) {
                    case 'y':
                        life.turn = this.preCountedTurns.hundredEighty;
                        life.xOffset = -defaultOffset;
                        break;
                    case 'x':
                        life.turn = this.preCountedTurns.ninety;
                        life.yOffset = defaultOffset;
                        break;
                    case 'posEdge':
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
                    case 'negEdge':
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

    hitObstacle(type, scene, tileMap, targetPos, projectileLife) {
        const posWOffset = [targetPos[0] + projectileLife.xOffset, targetPos[1] + projectileLife.yOffset];
        this.hitFx(scene, posWOffset, tileMap, projectileLife);
        if(type == 'solid') {
            this.Sound.playFx(this.sounds, 'ricochet-001');
        } else if(type == 'player' || type == 'door') {
            if(type == 'door') {
                this.Sound.playFx(this.sounds, 'ricochet-001');
            } else {
                this.Sound.playFx(this.sounds, 'zap-001');
            }
        }
    }

    _randomIntInBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    _randomFloatInBetween(min, max) {
        min *= 10; max *= 10;
        return Math.floor(Math.random() * (max - min + 1) + min) / 10;
    }

    random2dAmount(dir, axis, target, hitPos, special) {
        let min = 0.4,
            max = 1.6,
            amount = this._randomFloatInBetween(min, max);
        if(target === 'player' && (dir == 1 || dir == 3 || dir == 5 || dir == 7)) {
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

    hitFx(scene, posWOffset, tileMap, projectileLife) {
        // Send a request to a web worker (via VisualEffects class) for hit calculations
        this.VisualEffects.calculate({
            fxList: [
                {
                    name: 'sparksParticlesFx',
                    minParticles: 12,
                    maxParticles: 50,
                    minAnimLength: 0.5,
                    maxAnimLength: 1.4,
                    minSize: 0.12,
                    maxSize: 0.14,
                },
                {
                    name: 'hitBlastBasic',
                    minSize: 0.25,
                    maxSize: 1.0
                }
            ],
            hitPos: [
                posWOffset[0],
                posWOffset[1],
                this.shotHeight
            ],
            tileMap,
            projectileLifeDir: projectileLife.dir,
            projectileLifeSpecial: projectileLife.special,
            rendererPixelRatio: this.sceneState.settings.rendererPixelRatio,
        }).onmessage = (e) => {
            const particleData = e.data.sparksParticlesFx,
                hitBlastData = e.data.hitBlastBasic;
            this.initSparkParticles(
                scene,
                particleData.vertices,
                particleData.sizes,
                particleData.targetPositions,
                particleData.animLengths,
                particleData.colors,
                particleData.maxAnimLength
            );
            this.initHitBlast(
                scene,
                hitBlastData.hitPos,
                hitBlastData.randomTwist,
                hitBlastData.randomSize
            );
        };
    }

    initHitBlast(scene, hitPos, randomTwist, randomSize) {
        const hitBlastId = 'hit-blast-' + performance.now(),
            blast = this.VisualEffects.getEffectMesh('hitBlast_basic', hitBlastId);
        if(blast) {
            blast.name = hitBlastId;
            blast.rotation.set(randomTwist, randomTwist, randomTwist);
            blast.scale.set(randomSize, randomSize, randomSize);
            blast.position.set(
                hitPos[0],
                hitPos[1],
                hitPos[2]
            );
            scene.add(blast);
            this.VisualEffects.startAnim({
                id: hitBlastId,
                meshName: 'hitBlast_basic',
                mesh: blast,
                onComplete: () => {
                    blast.material.dispose();
                    scene.remove(blast);
                },
            });
        }
    }

    initSparkParticles(scene, vertices, sizes, targetPositions, animLengths, colors, maxAnimLength) {
        // Create particles
        const geometry = new THREE.BufferGeometry(),
            sparks = new THREE.Points(geometry, this.customParticlesMaterial());
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('tPosition', new THREE.Float32BufferAttribute(targetPositions, 3));
        geometry.setAttribute('animLength', new THREE.Float32BufferAttribute(animLengths, 1));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        // Start particles animation and add it to the scene
        const now = performance.now(),
            particlesId = 'sparks-particles-' + now;
        sparks.material.name = particlesId;
        sparks.material.uniforms.uStartTime.value = now;
        this.sceneState.shadersToUpdate.push(sparks);
        scene.add(sparks);
        // End particles animation and remove from scene
        setTimeout(() => {
            this.sceneState.shadersToUpdate = this.sceneState.shadersToUpdate.filter(s => s.name !== particlesId);
            sparks.geometry.dispose();
            sparks.material.dispose();
            scene.remove(sparks);
        }, maxAnimLength);
    }

    createCustomParticles(scene, posWOffset, pos, tileMap, projectileLife) {
        const particleCount = this._randomIntInBetween(12, 50),
            minAnimLength = 0.5,
            maxAnimLength = 1.4,
            minSize = 0.12,
            maxSize = 0.14;
        const geometry = new THREE.BufferGeometry(),
            sparks = new THREE.Points(geometry, this.customParticlesMaterial()),
            vertices = [],
            sizes = [],
            targetPositions = [],
            animLengths = [],
            colors = [];
        let i = 0;
        for(i=0; i<particleCount; i++) {
            vertices.push(
                posWOffset[0],
                posWOffset[1],
                this.shotHeight
            );
            sizes.push(this._randomFloatInBetween(minSize, maxSize) * this.sceneState.settings.rendererPixelRatio);
            targetPositions.push(
                posWOffset[0] + this.random2dAmount(projectileLife.dir, 'x', tileMap, pos, projectileLife.special),
                posWOffset[1] + this.random2dAmount(projectileLife.dir, 'y', tileMap, pos, projectileLife.special),
                this.shotHeight
            );
            const animL = this._randomFloatInBetween(minAnimLength, maxAnimLength) * 1000;
            animLengths.push(animL);
            Math.random() < 0.2
                ? colors.push(0.0, 0.0, 0.0)
                : colors.push(0.9, 0.9, 0.9);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('tPosition', new THREE.Float32BufferAttribute(targetPositions, 3));
        geometry.setAttribute('animLength', new THREE.Float32BufferAttribute(animLengths, 1));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        // F0BA3C

        // Start particles animation
        const now = performance.now(),
            particlesId = 'sparks-particles-' + now;
        sparks.material.name = particlesId;
        sparks.material.uniforms.uStartTime.value = now;
        this.sceneState.shadersToUpdate.push(sparks);
        scene.add(sparks);
        setTimeout(() => {
            this.sceneState.shadersToUpdate = this.sceneState.shadersToUpdate.filter(s => s.name !== particlesId);
            sparks.geometry.dispose();
            sparks.material.dispose();
            scene.remove(sparks);
        }, maxAnimLength * 1000 + 200);
    }

    customParticlesMaterial() {
        const uniforms = {
            pointTexture: { value: this.fxSpark },
            deltaTime: { value: 0 },
            uTime: { value: 0 },
            uStartTime: { value: 0 },
        };
        const vertexShader = `
            #ifndef HALF_PI
            #define HALF_PI 1.5707963267948966
            #endif

            uniform float uTime;
            uniform float uStartTime;
            attribute float size;
            attribute vec3 tPosition;
            attribute float animLength;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vTimerClamp;

            float bounceOut(float t) {
                const float a = 0.3636363636363636; // 4.0 / 11.0
                const float b = 0.7272727272727273; // 8.0 / 11.0
                const float c = 0.9; // 9.0 / 10.0
              
                const float ca = 12.06648199445983; // 4356.0 / 361.0
                const float cb = 19.63545706371191; // 35442.0 / 1805.0
                const float cc = 8.898060941828255; // 16061.0 / 1805.0
              
                float t2 = t * t;
              
                return t < a
                  ? 7.5625 * t2
                  : t < b
                    ? 9.075 * t2 - 9.9 * t + 3.4
                    : t < c
                      ? ca * t2 - cb * t + cc
                      : 10.8 * t * t - 20.52 * t + 10.72;
            }

            float exponentialIn(float t) {
                return t == 0.0 ? t : pow(2.0, 10.0 * (t - 1.0));
            }

            float sineOut(float t) {
                return sin(t * HALF_PI);
            }

            void main() {
                float timer = (uTime - uStartTime) / animLength;
                float timerClamp = clamp(timer, 0.0, 1.0);
                vTimerClamp = timerClamp;
                vec3 curPos = position + (tPosition - position) * sineOut(timerClamp);
                curPos.z = position.z - bounceOut(timerClamp);
                float curSize = size * (1.0 - exponentialIn(timerClamp));

                vColor = color;

                vec4 mvPosition = modelViewMatrix * vec4(curPos, 1.0);
                gl_PointSize = curSize * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        const fragmentShader = `
            uniform sampler2D pointTexture;
            varying vec3 vColor;
            varying float vTimerClamp;

            void main() {
                vec3 newColor = vec3(vColor.r, vColor.g * (vColor.g - vTimerClamp + 0.8), vColor.b * (vColor.b - vTimerClamp + 0.5));
                gl_FragColor = vec4(newColor, 1.5 - vTimerClamp);
                gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
            }
        `;
        return new THREE.ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            depthWrite: false,
            transparent: true
        });
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
        // #ifdef GL_ES
        // precision mediump float;
        // #endif

        varying vec2 vUv;
        varying float time;
        varying float totalTime;
        varying float burnSize;
        varying float lavaSize;

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
            float lava_t = smoothstep(lava_radius+0.01, lava_radius-0.01, dist);
            
            gl_FragColor = mix(burnSpot, lava_color, lava_t);
            if(gl_FragColor.a < 0.001) {
                discard;
            }
        }
        `;

        return {
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
        };
    }

    createWallBurn(projectileLife, posWOffset, scene) {
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
            offset = this.getBurnSpotOffset(projectileLife, 'burn', randomizer);
        mesh.rotation.set(0, 1.5708, 0);
        mesh.position.x = offset[0];
        mesh.position.y = offset[1];
        group.add(mesh);
        group.position.set(
            posWOffset[0],
            posWOffset[1],
            this.shotHeight
        );
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

    getBurnSpotOffset(projectileLife, elem, randomizer) {
        let dir = projectileLife.dir,
            xPos = projectileLife.xOffset,
            yPos = projectileLife.yOffset,
            glowOffset = 0.015;
        switch(dir) {
        case 0:
            yPos += randomizer;
            if(elem == 'mark') return [xPos, yPos];
            return [xPos, yPos + glowOffset];
        case 1:
            if(elem == 'mark') return [xPos, yPos];
            return [xPos, yPos];
        case 2:
            xPos += randomizer;
            if(elem == 'mark') return [xPos, yPos];
            return [xPos + glowOffset, yPos];
        case 3:
            if(elem == 'mark') return [xPos, yPos];
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
