import { calculateAngle } from "../util";

class Projectiles {
    constructor(scene, sceneState) {
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
        this.burnMarkTexture = new THREE.TextureLoader().load('/images/sprites/burn-mark.png');
        this.smokeTexture = new THREE.TextureLoader().load('/images/sprites/smoke-01.png');
        this.preCountedTurns = {
            fortyFive: 45 * (Math.PI/180),
            ninety: 90 * (Math.PI/180),
            hundredThirtyFive: 135 * (Math.PI/180),
            hundredEighty: 180 * (Math.PI/180),
        };
    }

    shootProjectile(shooter, target, scene, sceneState, AppUiLayer, camera) {
        
        // AppUiLayer.logMessage(
        //     performance.now(),
        //     sceneState.players.hero.name,
        //     'Shots fired..',
        //     'S'
        // );

        let from,
            i = 0,
            playerRoute = shooter.route,
            playerRouteLength = playerRoute.length,
            curRouteSpot,
            timeNow = this.sceneState.initTime.s + performance.now() / 1000;
        if(shooter.microPos) {
            if(playerRouteLength) {
                for(i=0; i<playerRouteLength; i++) {
                    curRouteSpot = playerRoute[i];
                    if((curRouteSpot.enterTime < timeNow && curRouteSpot.leaveTime > timeNow) || (curRouteSpot.enterTime < timeNow && i == playerRouteLength - 1)) {
                        console.log('route spot for enter and leave found');
                        if(Math.round(shooter.microPos[0]) === curRouteSpot.x && Math.round(shooter.microPos[1]) === curRouteSpot.y) {
                            console.log("NEVER HERE");
                            from = [shooter.microPos[0], shooter.microPos[1]];
                        } else {
                            //from = [playerRoute[i].x, playerRoute[i].y];
                        }
                        break;
                    }
                }
            } else {
                from = [shooter.microPos[0], shooter.microPos[1]];
            }
        } else {
            from = [shooter.pos[0], shooter.pos[1]];
        }
        console.log("TUUT1");
        if(from[0] === target[0] && from[1] === target[1]) return; // Do not shoot your own legs
        console.log("TUUT2");

        let speedPerTile = 0.085 * sceneState.timeSpeed, // in seconds
            maxDistance = 10,
            raycaster = new THREE.Raycaster(),
            startPoint = new THREE.Vector3(from[0], from[1], 1),
            direction = new THREE.Vector3(),
            hitObject = this.scene.getObjectByName("level-props").children[0];
        direction.subVectors(new THREE.Vector3(target[0], target[1], 1), startPoint).normalize();;
        raycaster.set(startPoint, direction, true);
        let intersects = raycaster.intersectObject(hitObject, true);
        let angle = 0,
            name = "projectileLaserViolet" + performance.now();
        let speed = intersects[0].distance * speedPerTile;
        let tileMap = sceneState.shipMap[sceneState.floor];
        let targetPos = [];
        let projectileLife = this.getProjectileLife(intersects, from, target, speedPerTile, tileMap);
        if(intersects.length) {
            //let helperLine = this.showProjectileHelper(startPoint, intersects, scene);
            targetPos = [intersects[0].point.x, intersects[0].point.y];
            angle = calculateAngle(from, targetPos);
        } else {
            let xDist = Math.abs(target[0] - from[0]);
            let yDist = Math.abs(target[1] - from[1]);
            angle = calculateAngle(from, target);
            if(xDist > yDist) {
                ratio = yDist / xDist;
                projectileLife.dir > 4 ? targetPos.push(from[0] + maxDistance) : targetPos.push(from[0] - maxDistance);
            } else {
                ratio = xDist / yDist;
            }
            targetPos = [];
        }
        this.sceneState.consequences.addProjectile(name, projectileLife.route);
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
        tl.to(projectileGroup.position, speed, {
            x: targetPos[0],
            y: targetPos[1],
            ease: Linear.easeNone,
            onComplete: () => {
                tl.progress(1);
                // Create blast sparks for solid obstacle
                this.hitObstacle('solid', scene, name, camera, tileMap, targetPos, projectileLife);
                // Delete objects and group
                scene.remove(meshInside);
                scene.remove(meshOutside);
                scene.remove(projectileGroup);
                this.sceneState.particles -= particles; // REMOVE PARTICLE(S)
                // scene.remove(helperLine);
            }
        });
    }

    getProjectileRoute(from, target, speedPerTile, tileMap, distance, dir) {
        let route = [],
            startTime = performance.now() + speedPerTile * 0.5,
            tiles = 0,
            startFractions = from[0] - Math.floor(from[0]),
            xLength = 0,
            yLength = 0,
            i = 0;
        switch(dir) {
            case 0:
                tiles = from[1] - target[1];
                for(i=0; i<tiles; i++) {
                    let enterTime = startTime + (i + 1) * speedPerTile;
                    route.push({
                        pos: [from[0], from[1] - (i + 1)],
                        enterTime: enterTime,
                        leaveTime: enterTime + speedPerTile,
                    });
                }
                break;
            case 2:
                tiles = from[0] - target[0];
                console.log("TIHI",tiles,startFractions,1-startFractions);
                for(i=0; i<tiles; i++) {
                    let enterTime = startFractions && i == 1 ?
                        startTime + speedPerTile * (1 - startFractions) :
                        startTime + i * speedPerTile;
                    route.push({
                        pos: [Math.round(from[0] - (i + 1)), from[1]],
                        enterTime: enterTime,
                        leaveTime: startFractions && i === 0 ?
                            enterTime + speedPerTile * (1 - startFractions) :
                            enterTime + speedPerTile,
                    });
                }
                let totalRouteTime = route[route.length-1].enterTime - route[0].enterTime;
                let lineDistanceTime = distance * speedPerTile - speedPerTile * 0.5;
                console.log('TIMES', totalRouteTime, lineDistanceTime, totalRouteTime - lineDistanceTime);
                break;
            case 4:
                    tiles = target[1] - from[1];
                    for(i=0; i<tiles; i++) {
                        let enterTime = startTime + (i + 1) * speedPerTile;
                        route.push({
                            pos: [from[0], from[1] + (i + 1)],
                            enterTime: enterTime,
                            leaveTime: enterTime + speedPerTile,
                        });
                    }
                    break;
            case 6:
                    tiles = target[0] - from[0];
                    for(i=0; i<tiles; i++) {
                        let enterTime = startTime + (i + 1) * speedPerTile;
                        route.push({
                            pos: [from[0] + (i + 1), from[1]],
                            enterTime: enterTime,
                            leaveTime: enterTime + speedPerTile,
                        });
                    }
                    break;
            case 1:
                xLength = from[0] - target[0];
                yLength = from[1] - target[1];
                tiles = xLength > yLength ? xLength : yLength;
                for(i=0; i<tiles; i++) {
                    
                }
                break;
        }

        return route;
    }

    getProjectileLife(intersects, from, target, speedPerTile, tileMap) {
        let distance = intersects.length ?
            intersects[0].distance :
            Math.sqrt(Math.pow(Math.abs(from[0] - target[0]), 2) + Math.pow(Math.abs(from[1] - target[1]), 2));
        let life = {
            speed: speedPerTile * distance,
            dir: 0,
            turn: 0,
            xOffset: 0,
            yOffset: 0,
            route: [],
            special: false,
        },
        hitPos = intersects.length ? [Math.round(intersects[0].point.x), Math.round(intersects[0].point.y)] : [],
        wallType,
        defaultOffset = 0.05;

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

        life.route = this.getProjectileRoute(from, hitPos, speedPerTile, tileMap, distance, life.dir);

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
            dir = projectileLife.dir,
            posWOffset = [targetPos[0] + projectileLife.xOffset, targetPos[1] + projectileLife.yOffset],
            minFloorParticles = 3,
            maxFloorParticles = 20,
            floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles),
            i = 0,
            streaks = this._randomIntInBetween(2, 6),
            particles = floorParticles + streaks,
            maxParticles = this.sceneState.settings.maxSimultaneousParticles,
            curParticles = this.sceneState.particles;
            if(curParticles + particles > maxParticles) {
                floorParticles = maxParticles - curParticles;
                if(floorParticles < 0) floorParticles = 0;
                streaks = 0;
            }
            this.sceneState.particles += floorParticles + streaks;
        if(type == 'solid') {
            this.setBurnSpot(projectileLife, posWOffset, scene, camera);
            for(i=0; i<floorParticles; i++) {
                (() => {
                    let sparkName = projectileName + "-" + i,
                        startColor = {color:"#ffffff"},
                        spark = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
                    spark.position.set(posWOffset[0], posWOffset[1], 1);
                    spark.name = sparkName;
                    spark.quaternion.copy(camera.quaternion);
                    scene.add(spark);
                    let tl = new TimelineMax(),
                        lifeSpan = this._randomFloatInBetween(0.1, 1.2),
                        newX = posWOffset[0] + this.random2dAmount(dir, 'x', tileMap, pos, projectileLife.special),
                        newY = posWOffset[1] + this.random2dAmount(dir, 'y', tileMap, pos, projectileLife.special);
                    tl.to(scene.getObjectByName(sparkName).position, lifeSpan, {x: newX, y: newY})
                      .to(scene.getObjectByName(sparkName).position, lifeSpan, {z: this.sparkSize, ease: Bounce.easeOut}, "-="+lifeSpan)
                      .to(startColor, lifeSpan / 4, {color:"#ffff00", onUpdate: () => {
                        scene.getObjectByName(sparkName).material.color.set(startColor.color);
                      }}, "-="+(lifeSpan / 1.5))
                      .to(startColor, lifeSpan / 4, {color:"#ff0000", onUpdate: () => {
                        scene.getObjectByName(sparkName).material.color.set(startColor.color);
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
            for(i=0; i<streaks; i++) {
                (() => {
                    let tl = new TimelineMax(),
                        lifeSpan = this._randomFloatInBetween(0.1, 0.2),
                        newX = posWOffset[0] + this.random2dAmount(dir, 'x', tileMap, pos, projectileLife.special),
                        newY = posWOffset[1] + this.random2dAmount(dir, 'y', tileMap, pos, projectileLife.special),
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
                            streak.geometry.verticesNeedUpdate = true;
                        }
                    }).to(streak.geometry.vertices[0], lifeSpan, {
                        x: newX,
                        y: newY,
                        z: newZ,
                        ease: Linear.easeNone,
                        onUpdate: () => {
                            streak.geometry.verticesNeedUpdate = true;
                        }, onComplete: () => {
                            streak.geometry.dispose();
                            streak.material.dispose();
                            scene.remove(streak);
                            this.sceneState.particles--;
                        }
                    }, "-="+lifeSpan/1.2);
                })();
            }
        }
    }

    _randomIntInBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    _randomFloatInBetween(min, max) {
        min *= 10; max *= 10;
        return Math.floor(Math.random() * (max - min + 1) + min) / 10;
    }

    random2dAmount(dir, axis, tileMap, hitPos, special) {
        let min = 0.4,
            max = 1.6,
            amount = this._randomFloatInBetween(min, max);
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

    setBurnSpot(projectileLife, posWOffset, scene, camera) {
        let darkSpot1 = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({map:this.burnMarkTexture,transparent:true})),
            darkSpot2 = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone()),
            smoke1Opacity = this.sceneState.settings.useOpacity ? ((Math.random() * 7) + 1) / 10 : 1,
            smoke1 = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({map:this.smokeTexture,transparent:true,opacity:smoke1Opacity})),
            darkSpotGroup = new THREE.Group(),
            randomizer = Math.random() / 50,
            offset1 = this.getBurnSpotOffset(projectileLife, "mark", randomizer),
            offset2 = this.getBurnSpotOffset(projectileLife, "burn", randomizer),
            tl = new TimelineMax(),
            tlSmoke = new TimelineMax(),
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
        
        smoke1.scale.set(0.3,5,1);
        smoke1.quaternion.copy(camera.quaternion);
        smoke1.position.set(posWOffset[0], posWOffset[1], 1);
        particles++;

        scene.add(darkSpotGroup);
        scene.add(smoke1);

        if(this.sceneState.settings.useOpacity) {
            tl.to(darkSpot2.material, 2, {opacity:0})
              .to(darkSpot1.material, 3, {opacity:0}, "-=1");
        } else {
            tl.to(darkSpot2.scale, 2, {x: 0.001, y: 0.001})
              .to(darkSpot1.scale, 3, {x: 0.001, y: 0.001}, "-=1");
        }
        
        let smokeLife = this._randomFloatInBetween(2.0, 3.8);
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
            darkSpot1.geometry.dispose();
            darkSpot1.material.dispose();
            scene.remove(darkSpot1);
            darkSpot2.geometry.dispose();
            darkSpot2.material.dispose();
            scene.remove(darkSpot2);
            scene.remove(darkSpotGroup);
            smoke1.geometry.dispose();
            smoke1.material.dispose();
            scene.remove(smoke1);
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