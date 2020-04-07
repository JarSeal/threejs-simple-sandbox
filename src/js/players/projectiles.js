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
        this.preCountedTurns = {
            fortyFive: 45 * (Math.PI/180),
            ninety: 90 * (Math.PI/180),
            hundredThirtyFive: 135 * (Math.PI/180),
            hundredEighty: 180 * (Math.PI/180),
        };
    }

    shootProjectile(from, target, scene, sceneState, AppUiLayer, camera) {
        if(from[0] === target[0] && from[1] === target[1]) return; // Do not shoot your own legs
        
        // AppUiLayer.logMessage(
        //     performance.now(),
        //     sceneState.players.hero.name,
        //     'Shots fired..',
        //     'S'
        // );

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
                scene.remove(projectileGroup);
                // scene.remove(helperLine);
            }
        });
    }

    getProjectileRoute(from, target, speedPerTile, tileMap, distance) {
        if(!distance) {
            distance = Math.sqrt(Math.pow(Math.abs(from[0] - target[0]), 2) + Math.pow(Math.abs(from[1] - target[1]), 2));
        }
        
    }

    getProjectileLife(intersects, from, target, speedPerTile, tileMap) {
        let life = {
            speed: speedPerTile * intersects[0].distance,
            dir: 0,
            turn: 0,
            xOffset: 0,
            yOffset: 0,
            route: this.getProjectileRoute(from, target, speedPerTile, tileMap, intersects[0].distance),
            special: false,
        },
        hitPos = [Math.round(intersects[0].point.x), Math.round(intersects[0].point.y)],
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
            minFloorParticles = 6,
            maxFloorParticles = 20,
            floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles),
            i = 0,
            streaks = this._randomIntInBetween(2, 6);
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
            smoke1 = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({map:this.smokeTexture,transparent:true,opacity:((Math.random() * 2) + 1) / 10})),
            darkSpotGroup = new THREE.Group(),
            randomizer = Math.random() / 50,
            offset1 = this.getBurnSpotOffset(projectileLife, "mark", randomizer),
            offset2 = this.getBurnSpotOffset(projectileLife, "burn", randomizer),
            tl = new TimelineMax(),
            tlSmoke = new TimelineMax(),
            burnSize1 = Math.random() * 9,
            burnSize2 = Math.random() + 0.5;
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
        darkSpotGroup.position.set(posWOffset[0], posWOffset[1], 1);
        darkSpotGroup.rotation.z = projectileLife.turn;
        darkSpotGroup.children[0].position.x = offset1[0];
        darkSpotGroup.children[0].position.y = offset1[1];
        darkSpotGroup.children[1].position.x = offset2[0];
        darkSpotGroup.children[1].position.y = offset2[1];
        
        smoke1.scale.set(0.3,5,1);
        smoke1.quaternion.copy(camera.quaternion);
        smoke1.position.set(posWOffset[0], posWOffset[1], 1);

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