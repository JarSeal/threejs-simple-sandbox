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

    shootProjectile(from, target, scene) {
        if(from[0] === target[0] && from[1] === target[1]) return; // Do not shoot your own legs
        let tl = new TimelineMax();
        let name = "projectileLaserViolet"+performance.now(),
            speedPerTile = 0.1,
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
            tl.to(scene.getObjectByName(name).position, speed, {
                x: target[0] + (target[0] > from[0] ? xAdder : -xAdder),
                y: target[1] + (target[1] > from[1] ? yAdder : -yAdder),
                ease: Linear.easeNone,
                onComplete: () => {
                    
                },
            });
            setTimeout(() => {
                scene.remove(scene.getObjectByName(name));
            },4000);
        }, 300);
    }
}

export default Projectiles;