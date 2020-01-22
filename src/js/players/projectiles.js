import { calculateAngle } from "../util";

class Projectiles {
    constructor() {
        this.sprites = {
            projectileLaserViolet: new THREE.TextureLoader().load('/images/sprites/laser-projectile.png'),
        };
        this.projectileLongGeo = new THREE.PlaneBufferGeometry();
        this.projectileLongMat = new THREE.MeshBasicMaterial({
            map: this.sprites.projectileLaserViolet,
            transparent: true
        });
        this.guns = [{
            type: "projectile",
            class: "laser",
            color: "violet",
            material: new THREE.SpriteMaterial({map: this.sprites.projectileLaserViolet, transparent: true, alphaTest: 0}),
        }];
        this.sparkSize = 0.1;
        this.sparkGeo = new THREE.PlaneBufferGeometry(this.sparkSize, this.sparkSize);
        this.sparkMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1,
            name: "sparkMaterial",
        });
    }

    shootProjectile(from, target, scene, sceneState, AppUiLayer, camera) {
        if(from[0] === target[0] && from[1] === target[1]) return; // Do not shoot your own legs
        
        AppUiLayer.logMessage(
            performance.now(),
            sceneState.players.hero.name,
            'Shots fired..',
            'B'
        );

        let tl = new TimelineMax();
        let name = "projectileLaserViolet"+performance.now(),
            speedPerTile = 0.1, // in seconds
            xDist = Math.abs(from[0] - target[0]),
            yDist = Math.abs(from[1] - target[1]),
            xAdder = 0,
            yAdder = 0,
            tileMap = sceneState.shipMap[sceneState.floor],
            solidObstacle = this.calculateSolidObstacle(from, target, speedPerTile, tileMap);
        if(xDist > yDist) {
            xAdder = 64;
            yAdder = 64 * (yDist / xDist);
        } else {
            xAdder = 64 * (xDist / yDist);
            yAdder = 64;
        }
        let dist = Math.sqrt(Math.pow(xDist + xAdder, 2) + Math.pow(yDist + yAdder, 2)),
            speed = dist * speedPerTile;
        setTimeout(() => {
            let angle = calculateAngle(from, target);
            let mesh = new THREE.Mesh(this.projectileLongGeo, this.projectileLongMat);
            let deleteTimer;
            mesh.scale.set(1, 0.22, 1);
            mesh.position.set(from[0], from[1], 1);
            mesh.rotation.z = angle + 1.5708;
            mesh.name = name;
            scene.add(mesh);
            tl.startTime = performance.now();
            tl.to(scene.getObjectByName(name).position, speed, {
                x: target[0] + (target[0] > from[0] ? xAdder : -xAdder),
                y: target[1] + (target[1] > from[1] ? yAdder : -yAdder),
                ease: Linear.easeNone,
                onUpdate: () => {
                    if(tl.startTime + solidObstacle.timeOfHit < performance.now()) {
                        // Solid obstacle hit!
                        tl.kill(); // Stop animation
                        // Create blast sparks
                        this.hitObstacle(solidObstacle, 'solid', scene, name, camera, tileMap);
                        // Delete object
                        let removeThis = scene.getObjectByName(name);
                        if(removeThis) {
                            if(deleteTimer) clearTimeout(deleteTimer);
                            scene.remove(removeThis);
                        }
                    }
                },
            });
            deleteTimer = setTimeout(() => {
                let removeThis = scene.getObjectByName(name);
                if(removeThis) scene.remove(removeThis);
            },4000); // Back up to cleanup the projectile (if the projectile goes into space or something else)
        }, 300); // Delay before the shot takes of (maybe needed, maybe not..)
    }

    calculateSolidObstacle(from, target, speed, tileMap) {
        let dir = 0,
            i = 0,
            maxChecks = 128,
            distanceToHit = 0,
            distanceByAxis = [],
            travelTimeToHit = 0,
            hitPos = [],
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
                    if(this.checkIfWall(from[0] - xPos, from[1] - yPos, tileMap)) { // - and -
                        hitPos = [from[0] - xPos, from[1] - yPos]; // - and -
                        distanceToHit = Math.sqrt(
                            Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        );
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
                            Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        );
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
                            Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        );
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
                        distanceToHit = Math.sqrt(
                            Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        );
                        distanceByAxis = [from[0] + xPos, from[1] - yPos];
                        travelTimeToHit = distanceToHit * speed;
                        break;
                    }
                }
            }
        }

        return {
            obstaclePos: hitPos,
            timeOfHit: travelTimeToHit,
            dist: distanceToHit,
            distByAxis: distanceByAxis,
            dir: dir,
            angle: angle,
        };
    }

    checkIfWall(x, y, tileMap) {
        if(!tileMap[x] || !tileMap[x][y] || x < 0 || y < 0) return false;
        return tileMap[x][y].type === 2;
    }

    hitObstacle(obstacle, type, scene, projectileName, camera, tileMap) {
        let pos = obstacle.obstaclePos,
            dir = obstacle.dir,
            posWOffset = [pos[0], pos[1]],
            minFloorParticles = 6,
            maxFloorParticles = 20,
            floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles),
            i = 0;
        switch(dir) {
            case 0:
                posWOffset = [pos[0], pos[1] + 0.4];
                break;
            case 1:
                posWOffset = [pos[0] + 0.4, pos[1] + 0.4];
                break;
            case 2:
                posWOffset = [pos[0] + 0.4, pos[1]];
                break;
            case 3:
                posWOffset = [pos[0] + 0.4, pos[1] - 0.4];
                break;
            case 4:
                posWOffset = [pos[0], pos[1] - 0.4];
                break;
            case 5:
                posWOffset = [pos[0] - 0.4, pos[1] - 0.4];
                break;
            case 6:
                posWOffset = [pos[0] - 0.4, pos[1]];
                break;
            case 7:
                posWOffset = [pos[0] - 0.4, pos[1] + 0.4];
                break;
        }
        if(type == 'solid') {
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
}

export default Projectiles;