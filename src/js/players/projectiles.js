import { calculateAngle } from "../util";

class Projectiles {
    constructor(scene) {
        this.scene = scene;
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
    }

    shootProjectile(from, target, scene, sceneState, AppUiLayer, camera) {
        if(from[0] === target[0] && from[1] === target[1]) return; // Do not shoot your own legs
        
        AppUiLayer.logMessage(
            performance.now(),
            sceneState.players.hero.name,
            'Shots fired..',
            'S'
        );

        let speedPerTile = 0.1, // in seconds
            raycaster = new THREE.Raycaster(),
            startPoint = new THREE.Vector3(from[0], from[1], 1),
            direction = new THREE.Vector3(),
            hitObject = this.scene.getObjectByName("level-props").children[0];
        direction.subVectors(new THREE.Vector3(target[0], target[1], 1), startPoint).normalize();;
        raycaster.set(startPoint, direction, true);
        let intersects = raycaster.intersectObject(hitObject, true);
        let angle = 0,
            name = "projectileLaserViolet"+performance.now();
        console.log('INTERSECTS',intersects);
        if(intersects.length) {
            let geometry = new THREE.Geometry();
            geometry.vertices.push(startPoint);
            geometry.vertices.push(new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 1));
            let material = new THREE.LineBasicMaterial({ color : 0xff0000 });
            let line = new THREE.Line(geometry, material);
            scene.add(line);

            let targetPos = [intersects[0].point.x, intersects[0].point.y];
            angle = calculateAngle(from, targetPos);
            let meshInside = new THREE.Mesh(this.projectileGeoInside, this.projectileMatInside);
            meshInside.scale.set(0.35, 0.05, 1);
            meshInside.name = name + "-inside";
            let meshOutside = new THREE.Mesh(this.projectileGeoInside, this.projectileMatOutside);
            meshOutside.scale.set(0.51, 0.21, 1);
            meshOutside.position.set(0, 0, -0.01);
            meshOutside.name = name + "-outside";
            let projectileGroup = new THREE.Group();
            projectileGroup.name = name + "-group";
            projectileGroup.add(meshInside);
            projectileGroup.add(meshOutside);
            projectileGroup.rotation.z = angle + 1.5708;
            projectileGroup.position.set(from[0], from[1], 1);
            scene.add(projectileGroup);

            let tl = new TimelineMax();
            let speed = intersects[0].distance * speedPerTile;
            let tileMap = sceneState.shipMap[sceneState.floor];
            let solidObstacle = this.calculateSolidObstacle(from, target, speedPerTile, tileMap);
            tl.startTime = performance.now();
            tl.to(projectileGroup.position, speed, {
                x: targetPos[0],
                y: targetPos[1],
                ease: Linear.easeNone,
                onUpdate: () => {
                    if(tl.startTime + solidObstacle.timeOfHit < performance.now()) { // Solid obstacle hit!
                        tl.progress(1);
                        tl.kill(); // Stop animation
                        // Create blast sparks
                        this.hitObstacle(solidObstacle, 'solid', scene, name, camera, tileMap, targetPos);
                        // Delete objects and group
                        scene.remove(line);
                        scene.remove(meshInside);
                        scene.remove(projectileGroup);
                    }
                },
                onComplete: () => {
                    tl.progress(1);
                    // Create blast sparks
                    this.hitObstacle(solidObstacle, 'solid', scene, name, camera, tileMap, targetPos);
                    // Delete objects and group
                    scene.remove(line);
                    scene.remove(meshInside);
                    scene.remove(projectileGroup);
                }
            });

        }

        return;

        let tl = new TimelineMax();
        angle = calculateAngle(from, target);
        console.log("angle", angle);
        let tileMap = sceneState.shipMap[sceneState.floor];
        let solidObstacle = this.calculateSolidObstacle(from, target, speedPerTile, tileMap);
        console.log('anothre',solidObstacle.angle);
        target[0] = solidObstacle.hitMicroPos[0];
        target[1] = solidObstacle.hitMicroPos[1];
        let xDist = Math.abs(from[0] - target[0]),
            yDist = Math.abs(from[1] - target[1]),
            xAdder = 0,
            yAdder = 0;
        if(xDist > yDist) {
            xAdder = 64;
            yAdder = 64 * (yDist / xDist);
        } else {
            xAdder = 64 * (xDist / yDist);
            yAdder = 64;
        }
        let dist = Math.sqrt(Math.pow(xDist + xAdder, 2) + Math.pow(yDist + yAdder, 2));
        let tempTarget = [];
        tempTarget.push(target[0] + (target[0] > from[0] ? xAdder : -xAdder));
        tempTarget.push(target[1] + (target[1] > from[1] ? yAdder : -yAdder));
            dist = solidObstacle.dist;
            xAdder = solidObstacle.hitMicroPos[0];
            yAdder = solidObstacle.hitMicroPos[1];
            tempTarget[0] = xAdder;
            tempTarget[1] = yAdder;
        let speed = dist * speedPerTile;
        setTimeout(() => {
            let deleteTimer;
            let meshInside = new THREE.Mesh(this.projectileGeoInside, this.projectileMatInside);
            meshInside.scale.set(0.35, 0.05, 1);
            meshInside.name = name + "-inside";
            let meshOutside = new THREE.Mesh(this.projectileGeoInside, this.projectileMatOutside);
            meshOutside.scale.set(0.51, 0.21, 1);
            meshOutside.position.set(0, 0, -0.01);
            meshOutside.name = name + "-outside";
            let projectileGroup = new THREE.Group();
            projectileGroup.name = name + "-group";
            projectileGroup.add(meshInside);
            projectileGroup.add(meshOutside);
            projectileGroup.rotation.z = angle + 1.5708;
            projectileGroup.position.set(from[0], from[1], 1);
            scene.add(projectileGroup);
            tl.startTime = performance.now();
            tl.to(projectileGroup.position, speed, {
                x: xAdder,
                y: yAdder,
                ease: Linear.easeNone,
                onUpdate: () => {
                    if(tl.startTime + solidObstacle.timeOfHit < performance.now()) { // Solid obstacle hit!
                        tl.progress(1);
                        tl.kill(); // Stop animation
                        // Create blast sparks
                        this.hitObstacle(solidObstacle, 'solid', scene, name, camera, tileMap);
                        // Delete objects and group
                        scene.remove(meshInside);
                        scene.remove(projectileGroup);
                        if(deleteTimer) clearTimeout(deleteTimer);
                    }
                },
                onComplete: () => {
                    tl.progress(1);
                    // Create blast sparks
                    this.hitObstacle(solidObstacle, 'solid', scene, name, camera, tileMap);
                    // Delete objects and group
                    scene.remove(meshInside);
                    scene.remove(projectileGroup);
                    if(deleteTimer) clearTimeout(deleteTimer);
                }
            });
            deleteTimer = setTimeout(() => {
                tl.kill();
                let removeThis = scene.getObjectByName(name);
                if(removeThis) scene.remove(removeThis);
            },4000); // Back up to cleanup the projectile (if the projectile goes into space or something else)
        }, 0); // Delay before the shot takes of (maybe needed, maybe not..)
    }

    calculateSolidObstacle(from, target, speed, tileMap) {
        let dir = 0,
            i = 0,
            maxChecks = 128,
            distanceToHit = 0,
            distanceByAxis = [],
            travelTimeToHit = 0,
            hitPos = [],
            hitMicroPos = [],
            xDist = Math.abs(from[0] - target[0]),
            yDist = Math.abs(from[1] - target[1]),
            angle = xDist < yDist ? Math.atan(xDist / yDist) : Math.atan(yDist / xDist);
        speed *= 1000;
        // Check if the projectile travels on a straight line
        if(from[0] === target[0] || from[1] === target[1]) {
            // Straight line
            if(from[0] === target[0]) {
                if(from[1] > target[1]) {
                    dir = 0;
                    for(i=1;i<maxChecks;i++) {
                        if(this.checkIfWall(from[0], from[1] - i, tileMap)) {
                            distanceToHit = i;
                            distanceByAxis = [from[0], from[1] - i];
                            travelTimeToHit = i * speed;
                            hitPos = [from[0], from[1] - i];
                            hitMicroPos = [from[0], from[1] - i, angle];
                            break;
                        }
                    }
                } else {
                    dir = 4;
                    for(i=1;i<maxChecks;i++) {
                        if(this.checkIfWall(from[0], from[1] + i, tileMap)) {
                            distanceToHit = i;
                            distanceByAxis = [from[0], from[1] + i];
                            travelTimeToHit = i * speed;
                            hitPos = [from[0], from[1] + i];
                            hitMicroPos = [from[0], from[1] + i, angle];
                            break;
                        }
                    }
                }
            } else {
                if(from[0] > target[0]) {
                    dir = 2;
                    for(i=1;i<maxChecks;i++) {
                        if(this.checkIfWall(from[0] - i, from[1], tileMap)) {
                            distanceToHit = i;
                            distanceByAxis = [from[0] - i, from[1]];
                            travelTimeToHit = i * speed;
                            hitPos = [from[0] - i, from[1]];
                            hitMicroPos = [from[0] - i, from[1], angle];
                            break;
                        }
                    }
                } else {
                    dir = 6;
                    for(i=1;i<maxChecks;i++) {
                        if(this.checkIfWall(from[0] + i, from[1], tileMap)) {
                            distanceToHit = i;
                            distanceByAxis = [from[0] + i, from[1]];
                            travelTimeToHit = i * speed;
                            hitPos = [from[0] + i, from[1]];
                            hitMicroPos = [from[0] + i, from[1], angle];
                            break;
                        }
                    }
                }
            }
        } else {
            // Not straight
            let xPos = 0,
                yPos = 0;
            if(from[1] > target[1] && from[0] > target[0]) {
                dir = 1;
                for(i=1;i<maxChecks;i++) {
                    // Calculate the xPos or the yPos of the projectile by calculating it with the angle and Adjacent (x)
                    // If xPos or yPos is over a whole number, then the yPos is that whole number (after rounding)
                    if(xDist < yDist) {
                        yPos = i;
                        xPos = Math.round(yPos * Math.tan(angle));
                    } else {
                        xPos = i;
                        yPos = Math.round(xPos * Math.tan(angle));
                    }
                    // Projectile has hit a
                    if(this.checkIfWall(from[0] - xPos, from[1] - yPos, tileMap)) { // - and -
                        hitPos = [from[0] - xPos, from[1] - yPos]; // - and -
                        distanceToHit = Math.sqrt(
                            Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        );
                        distanceByAxis = [from[0] - xPos, from[1] - yPos];
                        travelTimeToHit = distanceToHit * speed;

                        hitPos = [from[0] - xPos, from[1] - yPos]; // - and -
                        distanceToHit = Math.sqrt(
                            Math.pow((xDist < yDist ? yPos * Math.tan(angle) : xPos), 2) + Math.pow((xDist < yDist ? yPos : xPos * Math.tan(angle)), 2)
                        );
                        hitMicroPos = this.getMicroPos(distanceToHit, angle, from, xPos, yPos, dir, hitPos, tileMap, target);
                        distanceByAxis = [from[0] - xPos, from[1] - yPos];
                        travelTimeToHit = distanceToHit * speed;
                        break;
                    }
                }
            } else
            if(from[1] < target[1] && from[0] > target[0]) {
                dir = 3;
                for(i=1;i<maxChecks;i++) {
                    if(xDist < yDist) {
                        yPos = i;
                        xPos = Math.round(yPos * Math.tan(angle));
                    } else {
                        xPos = i;
                        yPos = Math.round(xPos * Math.tan(angle));
                    }
                    if(this.checkIfWall(from[0] - xPos, from[1] + yPos, tileMap)) { // - and +
                        hitPos = [from[0] - xPos, from[1] + yPos]; // - and +
                        distanceToHit = Math.sqrt(
                            Math.pow((xDist < yDist ? yPos * Math.tan(angle) : xPos), 2) + Math.pow((xDist < yDist ? yPos : xPos * Math.tan(angle)), 2)
                        );
                        hitMicroPos = this.getMicroPos(distanceToHit, angle, from, xPos, yPos, dir, hitPos, tileMap, target);
                        distanceByAxis = [from[0] - xPos, from[1] + yPos];
                        travelTimeToHit = distanceToHit * speed;
                        break;
                    }
                }
            } else
            if(from[1] < target[1] && from[0] < target[0]) {
                dir = 5;
                for(i=1;i<maxChecks;i++) {
                    if(xDist < yDist) {
                        yPos = i;
                        xPos = Math.round(yPos * Math.tan(angle));
                    } else {
                        xPos = i;
                        yPos = Math.round(xPos * Math.tan(angle));
                    }
                    if(this.checkIfWall(from[0] + xPos, from[1] + yPos, tileMap)) { // + and +
                        hitPos = [from[0] + xPos, from[1] + yPos]; // + and +
                        distanceToHit = Math.sqrt(
                            Math.pow((xDist < yDist ? yPos * Math.tan(angle) : xPos), 2) + Math.pow((xDist < yDist ? yPos : xPos * Math.tan(angle)), 2)
                        );
                        hitMicroPos = this.getMicroPos(distanceToHit, angle, from, xPos, yPos, dir, hitPos, tileMap, target);
                        distanceByAxis = [from[0] + xPos, from[1] + yPos];
                        travelTimeToHit = distanceToHit * speed;
                        break;
                    }
                }
            } else
            if(from[1] > target[1] && from[0] < target[0]) {
                dir = 7;
                for(i=1;i<maxChecks;i++) {
                    if(xDist < yDist) {
                        yPos = i;
                        xPos = Math.round(yPos * Math.tan(angle));
                    } else {
                        xPos = i;
                        yPos = Math.round(xPos * Math.tan(angle));
                    }
                    if(this.checkIfWall(from[0] + xPos, from[1] - yPos, tileMap)) { // + and -
                        hitPos = [from[0] + xPos, from[1] - yPos]; // + and -
                        // distanceToHit = Math.sqrt(
                        //     Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        // );
                        distanceToHit = Math.sqrt(
                            Math.pow((xDist < yDist ? yPos * Math.tan(angle) : xPos), 2) + Math.pow((xDist < yDist ? yPos : xPos * Math.tan(angle)), 2)
                        );
                        hitMicroPos = this.getMicroPos(distanceToHit, angle, from, xPos, yPos, dir, hitPos, tileMap, target);
                        distanceByAxis = [from[0] + xPos, from[1] - yPos];
                        travelTimeToHit = distanceToHit * speed;
                        break;
                    }
                }
            }
        }

        return {
            obstaclePos: hitPos,
            hitMicroPos: hitMicroPos,
            timeOfHit: travelTimeToHit,
            dist: distanceToHit,
            distByAxis: distanceByAxis,
            dir: dir,
            angle: angle,
        };
    }

    checkIfWall(x, y, tileMap) {
        x = Math.round(x);
        y = Math.round(y);
        if(!tileMap[x] || !tileMap[x][y] || x < 0 || y < 0) return false;
        return tileMap[x][y].type === 2;
    }

    hitObstacle(obstacle, type, scene, projectileName, camera, tileMap, targetPos) {
        let pos = [targetPos[0], targetPos[1]],
            dir = obstacle.dir,
            posWOffset = [targetPos[0], targetPos[1]],
            minFloorParticles = 6,
            maxFloorParticles = 20,
            floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles),
            i = 0,
            streaks = this._randomIntInBetween(2, 6);
        switch(dir) {
            case 0:
                posWOffset = [pos[0], pos[1] + 0.02];
                break;
            case 1:
                posWOffset = [pos[0] + 0.02, pos[1] + 0.02];
                break;
            case 2:
                posWOffset = [pos[0] + 0.02, pos[1]];
                break;
            case 3:
                posWOffset = [pos[0] + 0.02, pos[1] - 0.02];
                break;
            case 4:
                posWOffset = [pos[0], pos[1] - 0.02];
                break;
            case 5:
                posWOffset = [pos[0] - 0.02, pos[1] - 0.02];
                break;
            case 6:
                posWOffset = [pos[0] - 0.02, pos[1]];
                break;
            case 7:
                posWOffset = [pos[0] - 0.02, pos[1] + 0.02];
                break;
        }
        if(type == 'solid') {
            this.setBurnSpot(posWOffset, scene, obstacle, camera);
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
                        newX = posWOffset[0] + this.random2dAmount(dir, 'x', tileMap, obstacle.obstaclePos),
                        newY = posWOffset[1] + this.random2dAmount(dir, 'y', tileMap, obstacle.obstaclePos);
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
                    }, lifeSpan * 1000 * 2);
                })();
            }
            for(i=0; i<streaks; i++) {
                (() => {
                    let tl = new TimelineMax(),
                        lifeSpan = this._randomFloatInBetween(0.1, 0.2),
                        newX = posWOffset[0] + this.random2dAmount(dir, 'x', tileMap, obstacle.obstaclePos),
                        newY = posWOffset[1] + this.random2dAmount(dir, 'y', tileMap, obstacle.obstaclePos),
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

    random2dAmount(dir, axis, tileMap, hitPos) {
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
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap)) {
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
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) {
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
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) {
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
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap)) {
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

    getMicroPos(distanceToHit, angle, from, xPos, yPos, dir, hitPos, tileMap, target) {
        let wallType,
            xLengthToHit = Math.sin(angle) * distanceToHit,
            turn,
            hitTile = tileMap[Math.round(hitPos[0])][Math.round(hitPos[1])],
            objectId = hitTile.module.objectId,
            hitObject = this.scene.getObjectByName(objectId).children[0];
        console.log("HITPIOS",hitTile,hitObject.matrixWorld);
        console.log("PPOSSSS", from, target, objectId);
        // let raycaster = new THREE.Raycaster();

        // let startPoint = new THREE.Vector3(from[0], from[1], 1);
        // let direction = new THREE.Vector3();
        // direction.subVectors( new THREE.Vector3(target[0], target[1], 1), startPoint ).normalize();;
        // //direction.normalize();

        // //hitObject.updateMatrixWorld();
        
        // raycaster.set(startPoint, direction, true);
        // let intersects = raycaster.intersectObject(hitObject);
        // console.log('INTERSECTS',intersects,hitObject);

        // let distance = -20;
        // let pointB = new THREE.Vector3();
        // pointB.addVectors(startPoint, direction.multiplyScalar(distance));
        // pointB.z = 1;

        // if(intersects.length) {
        //     let geometry = new THREE.Geometry();
        //     geometry.vertices.push( startPoint );
        //     geometry.vertices.push( new THREE.Vector3(intersects[0].point.x, intersects[0].point.y, 1) );
        //     let material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
        //     let line = new THREE.Line( geometry, material );
        //     this.scene.add( line );
        // }

        // let geometry2 = new THREE.Geometry();
        // geometry2.vertices.push( startPoint );
        // geometry2.vertices.push( new THREE.Vector3(target[0], target[1], 1) );
        // let material2 = new THREE.LineBasicMaterial( { color : 0xffff00 } );
        // let line2 = new THREE.Line( geometry2, material2 );
        // this.scene.add( line2 );

        switch(dir) {
            case 1:
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && !this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "y"; } else 
                if(this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap)) { wallType = "x"; } else
                if(this.checkIfWall(hitPos[0], hitPos[1] + 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "negEdge"; } else
                { wallType = "posEdge" }
                switch(wallType) {
                    case "y":
                        turn = 0;
                        console.log("TURN");
                        return xPos > yPos ? [from[0] - xPos, from[1] - xLengthToHit, turn] : [from[0] - xPos, from[1] - yPos, turn];
                    case "x":
                        turn = 90 * (Math.PI/180);
                        return xPos > yPos ? [from[0] - xPos, from[1] - yPos, turn] : [from[0] - xLengthToHit, from[1] - yPos, turn];
                    case "posEdge":
                        turn = xLengthToHit - Math.floor(xLengthToHit) < 0.5 ? -180 : 90 * (Math.PI/180);
                        console.log("TUR2N");
                        return xPos > yPos ? [from[0] - xPos, from[1] - xLengthToHit, turn] : [from[0] - xPos, from[1] - yPos, turn];
                    case "negEdge":
                        turn = 45 * (Math.PI/180);
                        break;
                }
                return [from[0] - xPos, from[1] - yPos, turn];
            case 3:
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && !this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "y"; } else 
                if(this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) { wallType = "x"; } else
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "negEdge"; } else
                { wallType = "posEdge" }
                switch(wallType) {
                    case "y":
                        turn = 0;
                        return xPos > yPos ? [from[0] - xPos, from[1] + xLengthToHit, turn] : [from[0] - xPos, from[1] + yPos, turn];
                    case "x":
                        turn = -90 * (Math.PI/180);
                        return xPos > yPos ? [from[0] - xPos, from[1] + yPos, turn] : [from[0] - xLengthToHit, from[1] + yPos, turn];
                    case "posEdge":
                        turn = xLengthToHit - Math.floor(xLengthToHit) < 0.5 ? 0 : -90 * (Math.PI/180);
                        return xPos > yPos ? [from[0] - xPos, from[1] + xLengthToHit, turn] : [from[0] - xPos, from[1] + yPos, turn];
                    case "negEdge":
                        turn = -45 * (Math.PI/180);
                        break;
                }
                return [from[0] - xPos, from[1] + yPos, turn];
            case 5:
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && !this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap)) { wallType = "y"; } else 
                if(this.checkIfWall(hitPos[0] + 1, hitPos[1], tileMap) && !this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap)) { wallType = "x"; } else
                if(this.checkIfWall(hitPos[0], hitPos[1] - 1, tileMap) && this.checkIfWall(hitPos[0] - 1, hitPos[1], tileMap)) { wallType = "negEdge"; } else
                { wallType = "posEdge" }
                console.log('WLLTYYP',wallType);
                switch(wallType) {
                    case "y":
                        turn = 180 * (Math.PI/180);
                        return xPos > yPos ? [from[0] - xPos, from[1] - xLengthToHit, turn] : [from[0] - xPos, from[1] - yPos, turn];
                    case "x":
                        turn = -90 * (Math.PI/180);
                        return xPos > yPos ? [from[0] - xPos, from[1] + yPos, turn] : [from[0] - xLengthToHit, from[1] + yPos, turn];
                    case "posEdge":
                        turn = xLengthToHit - Math.floor(xLengthToHit) < 0.5 ? 180 * (Math.PI/180) : -90 * (Math.PI/180);
                        return xPos > yPos ? [from[0] - xPos, from[1] - xLengthToHit, turn] : [from[0] - xPos, from[1] - yPos, turn];
                    case "negEdge":
                        turn = 135 * (Math.PI/180);
                        break;
                }
                return [from[0] + xPos, from[1] + yPos, turn];
        }
    }

    setBurnSpot(posWOffset, scene, obstacle, camera) {
        let darkSpot1 = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({map:this.burnMarkTexture,transparent:true})),
            darkSpot2 = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone()),
            smoke1 = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({map:this.smokeTexture,transparent:true,opacity:((Math.random() * 2) + 1) / 10})),
            darkSpotGroup = new THREE.Group(),
            offsetRandomizer = Math.random() / 100,
            offset1 = this.getBurnSpotOffset(obstacle.dir, "mark", offsetRandomizer),
            offset2 = this.getBurnSpotOffset(obstacle.dir, "burn", offsetRandomizer),
            tl = new TimelineMax(),
            tlSmoke = new TimelineMax(),
            burnSize1 = Math.random() * 9,
            burnSize2 = Math.random() + 0.7;
        if(burnSize1 < 3) burnSize1 = 3;
        if(burnSize2 < 1) burnSize2 = 1;
        
        darkSpot1.material.opacity = 1;
        darkSpot1.scale.set(burnSize1,burnSize1,1);
        darkSpot1.rotation.set(1.5708/2, 1.5708, 0);
        darkSpot2.material.opacity = 1;
        darkSpot2.material.color.set("#ff862d");
        darkSpot2.scale.set(burnSize2,burnSize2,1);
        darkSpot2.rotation.set(1.5708/2, 1.5708, 0);
        darkSpotGroup.add(darkSpot1);
        darkSpotGroup.add(darkSpot2);
        darkSpotGroup.position.set(posWOffset[0], posWOffset[1], 1);
        darkSpotGroup.rotation.z = obstacle.hitMicroPos[2];
        darkSpotGroup.children[0].position.x = offset1[0];
        darkSpotGroup.children[0].position.y = offset1[1];
        darkSpotGroup.children[1].position.x = offset2[0];
        darkSpotGroup.children[1].position.y = offset2[1];
        
        smoke1.scale.set(0.3,5,1);
        smoke1.quaternion.copy(camera.quaternion);
        smoke1.position.set(posWOffset[0] + offset1[1], posWOffset[1], 1);

        scene.add(darkSpotGroup);
        scene.add(smoke1);

        tl.to(darkSpot2.material, 2, {opacity:0})
          .to(darkSpot1.material, 3, {opacity:0}, "-=1");
        
        let smokeLife = this._randomFloatInBetween(2.0, 3.8);
        tlSmoke.to(smoke1.position, smokeLife, {z: 2.5})
               .to(smoke1.material, 2, {opacity: 0}, "-=2")
               .to(smoke1.scale, smokeLife, {x: 8, y: 8}, "-="+smokeLife);
        
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
        }, 4000);
    }

    getBurnSpotOffset(dir, elem, randomizer) {
        switch(dir) {
            case 1:
                if(elem == "mark") return [0.1 + randomizer, 0.13 + randomizer];
                return [0.12 + randomizer, 0.15 + randomizer];
            case 3:
                if(elem == "mark") return [0.1 + randomizer, -0.1 + randomizer];
                return [0.12 + randomizer, -0.08 + randomizer];
            default:
                return [randomizer, randomizer];
        }
    }
}

export default Projectiles; 