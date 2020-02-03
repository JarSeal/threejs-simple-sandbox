import { calculateAngle } from "../util";

class Projectiles {
    constructor() {
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
    }

    shootProjectile(from, target, scene, sceneState, AppUiLayer, camera) {
        if(from[0] === target[0] && from[1] === target[1]) return; // Do not shoot your own legs
        
        AppUiLayer.logMessage(
            performance.now(),
            sceneState.players.hero.name,
            'Shots fired..',
            'S'
        );

        let tl = new TimelineMax();
        let speedPerTile = 0.1; // in seconds
        let tileMap = sceneState.shipMap[sceneState.floor];
        let solidObstacle = this.calculateSolidObstacle(from, target, speedPerTile, tileMap);
        if(solidObstacle.dir == 3) {
            target[0] = solidObstacle.hitMicroPos[0];
            target[1] = solidObstacle.hitMicroPos[1];
        }
        let name = "projectileLaserViolet"+performance.now(),
            xDist = Math.abs(from[0] - target[0]),
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
        console.log(dist,'solid',solidObstacle);
        // if(solidObstacle.dir == 3) {
        //     dist = solidObstacle.dist;
        //     xAdder = solidObstacle.hitMicroPos[0];
        //     yAdder = solidObstacle.hitMicroPos[1];
        //     console.log("");
        // }
        let speed = dist * speedPerTile;
        setTimeout(() => {
            let angle = calculateAngle(from, target),
                deleteTimer;
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
                x: target[0] + (target[0] > from[0] ? xAdder : -xAdder),
                y: target[1] + (target[1] > from[1] ? yAdder : -yAdder),
                ease: Linear.easeNone,
                onUpdate: () => {
                    if(tl.startTime + solidObstacle.timeOfHit < performance.now()) { // Solid obstacle hit!
                        //tl.progress(solidObstacle.dist / dist);
                        tl.kill(); // Stop animation
                        // Create blast sparks
                        this.hitObstacle(solidObstacle, 'solid', scene, name, camera, tileMap, projectileGroup.position);
                        // Delete objects and group
                        scene.remove(meshInside);
                        scene.remove(projectileGroup);
                        if(deleteTimer) clearTimeout(deleteTimer);
                    }
                },
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
            xLengthToHit = 0,
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
                        // REFACTOR THIS ACCORDING TO WHICH SIDE IS LONGER
                        hitPos = [from[0] - xPos, from[1] + yPos]; // - and +
                        //distanceToHit = yPos / Math.sin(angle);
                        let oldDistanceToHit = Math.sqrt(
                            Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        );
                        distanceToHit = Math.sqrt(
                            Math.pow((xDist < yDist ? yPos * Math.tan(angle) : xPos), 2) + Math.pow((xDist < yDist ? yPos : xPos * Math.tan(angle)), 2)
                        ); // THIS WORKS
                        console.log('tööt', xPos, yPos, angle, xDist < yDist ? "xDistisSmalle" : "yDistisSmaler");
                        //distanceToHit = Math.pow(xDist < yDist ? yPos * Math.tan(angle) : xPos, 2) + Math.pow(xDist < yDist ? yPos : xPos * Math.tan(angle), 2);
                        xLengthToHit = Math.sin(angle) * distanceToHit;
                        console.log("TUUT",distanceToHit,oldDistanceToHit,xLengthToHit,yPos);
                        if(xPos < yPos) {
                            hitMicroPos = [from[0] - xLengthToHit, from[1] + yPos]; // Do the real microPos calculation here
                        } else {
                            hitMicroPos = [from[0] - xPos, from[1] + xLengthToHit]; // Do the real microPos calculation here
                        }
                        console.log("MICROPOS",hitMicroPos,hitPos);
                        // distanceToHit = Math.sqrt( // Do the real calculation of the distance to hit here (according to micro pos)
                        //     Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        // );
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

    hitObstacle(obstacle, type, scene, projectileName, camera, tileMap, projectilePos) {
        let pos = [projectilePos.x, projectilePos.y],
            dir = obstacle.dir,
            posWOffset = [pos[0], pos[1]],
            dOff = tileMap[Math.round(obstacle.obstaclePos[0])][Math.round(obstacle.obstaclePos[1])].dOff,
            minFloorParticles = 6,
            maxFloorParticles = 20,
            floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles),
            i = 0;
        switch(dir) {
            case 0:
                posWOffset = [pos[0], pos[1] + 0.4];
                if(dOff) { posWOffset = [pos[0], pos[1] + dOff[dir]]; }
                break;
            case 1:
                posWOffset = [pos[0] + 0.4, pos[1] + 0.4];
                break;
            case 2:
                posWOffset = [pos[0] + 0.4, pos[1]];
                if(dOff) { posWOffset = [pos[0] + dOff[dir], pos[1]]; }
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
                if(dOff) { posWOffset = [pos[0] + dOff[dir], pos[1]]; }
                break;
            case 7:
                posWOffset = [pos[0] - 0.4, pos[1] + 0.4];
                break;
        }
        if(type == 'solid') {
            this.setBurnSpot(dir, tileMap, posWOffset, type, scene);
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

    setBurnSpot(dir, tileMap, posWOffset, type, scene) {
        let darkSpot = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
        darkSpot.scale.set(3,3,1);
        darkSpot.position.set(posWOffset[0], posWOffset[1], 1);
        darkSpot.rotation.set(1.5708/2,1.5708,0);
        scene.add(darkSpot);
    }
}

export default Projectiles;