import { calculateAngle } from "../util";

class Projectiles {
    constructor() {
        this.sprites = {
            projectileLaserViolet: new THREE.TextureLoader().load('/images/sprites/laser-projectile.png'),
        };
        this.guns = [{
            type: "projectile",
            class: "laser",
            color: "violet",
            material: new THREE.SpriteMaterial({map: this.sprites.projectileLaserViolet, transparent: true, alphaTest: 0}),
        }];
    }

    shootProjectile(from, target, scene, sceneState, AppUiLayer) {
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
            maxRange = 64, // in tiles
            xDist = Math.abs(from[0] - target[0]),
            yDist = Math.abs(from[1] - target[1]),
            xAdder = 0,
            yAdder = 0,
            solidObstacle = this.calculateSolidObstacle(from, target, speedPerTile, sceneState.shipMap[sceneState.floor]);
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
            let geometry = new THREE.PlaneBufferGeometry();
            let material = new THREE.MeshBasicMaterial({map: this.sprites.projectileLaserViolet, transparent: true});
            let mesh = new THREE.Mesh(geometry, material);
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
                        tl.kill();
                        let removeThis = scene.getObjectByName(name);
                        if(removeThis) scene.remove(removeThis);
                    }
                },
            });
            setTimeout(() => {
                let removeThis = scene.getObjectByName(name);
                if(removeThis) scene.remove(removeThis);
            },4000);
        }, 300);
    }

    calculateSolidObstacle(from, target, speed, tileMap) {
        let dir = 0,
            i = 0,
            maxChecks = 128,
            distanceToHit = 0,
            travelTimeToHit = 0,
            hitPos = [],
            xDist = 0,
            yDist = 0;
        speed *= 1000;
        // Check if the projectile travels on a straight line
        if(from[0] === target[0] || from[1] === target[1]) {
            if(from[0] === target[0]) {
                if(from[1] > target[1]) {
                    dir = 0;
                    for(i=1;i<maxChecks;i++) {
                        if(this.checkIfWall(from[0], from[1] - i, tileMap)) {
                            distanceToHit = i;
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
                            travelTimeToHit = i * speed;
                            hitPos = [from[0] - 1, from[1]];
                            break;
                        }
                    }
                } else {
                    dir = 6;
                    for(i=1;i<maxChecks;i++) {
                        if(this.checkIfWall(from[0] + i, from[1], tileMap)) {
                            distanceToHit = i;
                            travelTimeToHit = i * speed;
                            hitPos = [from[0] + 1, from[1]];
                            break;
                        }
                    }
                }
            }
        } else {
            // Not straight
            xDist = Math.abs(from[0] - target[0]);
            yDist = Math.abs(from[1] - target[1]);
            let angle = Math.atan(xDist / yDist),
                xPos = 0,
                yPos = 0;
            if(from[1] > target[1] && from[0] > target[0]) {
                dir = 1;
                console.log(from, target, xDist, yDist);
                for(i=1;i<maxChecks;i++) {
                    // Calculate the yPos of the projectile by calculating it with the angle and Adjacent (x)
                    // If yPos is over a whole number, then the yPos is that whole number (use Math.floor)
                    yPos = i;
                    xPos = Math.floor(yPos * Math.tan(angle));
                    console.log('yPos',xPos,yPos * Math.tan(angle));
                    if(this.checkIfWall(from[0] - xPos, from[1] - yPos, tileMap)) {
                        hitPos = [from[0] - xPos, from[1] - yPos];
                        distanceToHit = Math.sqrt(
                            Math.pow(from[0] - hitPos[0], 2) + Math.pow(from[1] - hitPos[1], 2)
                        );
                        travelTimeToHit = distanceToHit * speed;
                        break;
                    }
                }
            } else
            if(from[1] < target[1] && from[0] > target[0]) {
                dir = 3;
            } else
            if(from[1] < target[1] && from[0] < target[0]) {
                dir = 5;
            } else
            if(from[1] > target[1] && from[0] < target[0]) {
                dir = 7;
            }
            console.log('DIR',dir);
        }

        return {
            obstacle: hitPos,
            timeOfHit: travelTimeToHit,
            dist: distanceToHit,
            dir: dir,
        };

        // RETURN an object with:
        // {obstacle: [x,y], timeOfHit: timeInMs, dir: dir}
    }

    checkIfWall(x, y, tileMap) {
        if(!tileMap[x] || !tileMap[x][y] || x < 0 || y < 0) return false;
        return tileMap[x][y].type === 2;
    }
}

export default Projectiles;