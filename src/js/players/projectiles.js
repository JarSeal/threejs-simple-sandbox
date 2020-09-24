import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { calculateAngle } from '../util';
import { TimelineMax, Linear, Bounce } from 'gsap-ssr';

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
        let fxSpark = new THREE.TextureLoader().load('/images/sprites/fx-spark.png');
        this.sparkMaterial = new THREE.PointsMaterial({
            size: 10,
            sizeAttenuation: false,
            map: fxSpark,
            alphaTest: 0.5,
            transparent: true
        });
        this.preCountedTurns = {
            fortyFive: 45 * (Math.PI/180),
            ninety: 90 * (Math.PI/180),
            hundredThirtyFive: 135 * (Math.PI/180),
            hundredEighty: 180 * (Math.PI/180),
        };
        this.sounds = SoundController.loadSoundsSprite('projectile', {volume: 0.1});

        // this.createWallHitArea();
        this.createHitBlast();
        // this.createProjectile();
        VisualEffects.createProjectile();
    }

    createHitBlast() {
        const planeGeo = new THREE.PlaneBufferGeometry(1.5, 1.5, 1);
        const planeGeo2 = planeGeo.clone();
        const planeGeo3 = planeGeo.clone();
        const vfxMat = new THREE.MeshBasicMaterial({
            map: this.vfxMap,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true,
        });
        const geometries = [];
        const spriteXlen = 128 / 4096;
        const spriteYlen = 128 / 4096;
        const redMat = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            color: 0xff0000,
        });
        const plane = new THREE.Mesh(planeGeo, vfxMat);
        const plane2 = new THREE.Mesh(planeGeo2, vfxMat);
        plane2.rotation.x = 1.5708;
        plane2.updateMatrix();
        plane2.geometry.applyMatrix4(plane2.matrix);
        const plane3 = new THREE.Mesh(planeGeo3, vfxMat);
        plane3.rotation.y = 1.5708;
        plane3.updateMatrix();
        plane3.geometry.applyMatrix4(plane3.matrix);

        const frame = 21;

        const uvs = plane.geometry.attributes.uv,
            uvs2 = plane2.geometry.attributes.uv,
            uvs3 = plane3.geometry.attributes.uv;
        uvs.setXY(0, spriteXlen * frame, 1);
        uvs.setXY(1, spriteXlen * (frame+1), 1);
        uvs.setXY(2, spriteXlen * frame, 1 - spriteYlen);
        uvs.setXY(3, spriteXlen * (frame+1), 1 - spriteYlen);
        uvs2.setXY(0, spriteXlen * frame, 1);
        uvs2.setXY(1, spriteXlen * (frame+1), 1);
        uvs2.setXY(2, spriteXlen * frame, 1 - spriteYlen);
        uvs2.setXY(3, spriteXlen * (frame+1), 1 - spriteYlen);
        uvs3.setXY(0, spriteXlen * frame, 1);
        uvs3.setXY(1, spriteXlen * (frame+1), 1);
        uvs3.setXY(2, spriteXlen * frame, 1 - spriteYlen);
        uvs3.setXY(3, spriteXlen * (frame+1), 1 - spriteYlen);
        uvs.needsUpdate = true;
        uvs2.needsUpdate = true;
        uvs3.needsUpdate = true;

        // Merge into one mesh
        geometries.push(plane.geometry);
        geometries.push(plane2.geometry);
        geometries.push(plane3.geometry);
        const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, false);
        const redLaser = new THREE.Mesh(mergedGeo, vfxMat);
        this.laserObjects['blue'] = redLaser;
        redLaser.position.x = 31.3;
        redLaser.position.y = 41;
        redLaser.position.z = this.shotHeight;
        this.scene.add(redLaser);
        // this.projectileAnims.count++;
        // this.projectileAnims.fired.push({
        //     id: 'some-id',
        //     geo: mergedGeo,
        //     phase: 2,
        //     frame: 1,
        //     spriteXlen,
        //     vStart: 1,
        //     vEnd: 1 - spriteYlen,
        //     lastUpdate: performance.now(),
        //     interval: 35,
        // });

        // this.sceneState.renderCalls.push(this.animateHitBlasts);
    }

    animateHitBlasts = () => { // RUNS IN EVERY FRAME
        let count = this.projectileAnims.count;
        if(!count) return;
        let i = 0,
            geo,
            uvAttribute,
            spriteXlen,
            vStart,
            vEnd,
            frame,
            newX,
            newXPrev;
        // for(i=0; i<count; i++) {
        //     if(performance.now() - this.projectileAnims.fired[i].lastUpdate < this.projectileAnims.fired[i].interval) break;
        //     geo = this.projectileAnims.fired[i].geo;
        //     spriteXlen = this.projectileAnims.fired[i].spriteXlen;
        //     vStart = this.projectileAnims.fired[i].vStart;
        //     vEnd = this.projectileAnims.fired[i].vEnd;
        //     frame = this.projectileAnims.fired[i].frame;
        //     newX = spriteXlen * frame;
        //     newXPrev = spriteXlen * (frame - 1);
        //     uvAttribute = geo.attributes.uv;
        //     uvAttribute.setXY(0, newXPrev, vStart);
        //     uvAttribute.setXY(1, newX, vStart);
        //     uvAttribute.setXY(2, newXPrev, vEnd);
        //     uvAttribute.setXY(3, newX, vEnd);
        //     uvAttribute.needsUpdate = true;
        //     this.projectileAnims.fired[i].lastUpdate = performance.now();
        //     if(frame === 15) {
        //         this.projectileAnims.fired[i].frame = 1;
        //     } else {
        //         this.projectileAnims.fired[i].frame++;
        //     }
        // }
    }

    createWallHitArea() {
        let modelLoader = new GLTFLoader(),
            dracoLoader = new DRACOLoader();
        const spriteXlen = 0.03125, // 128px (128 / 4096)
            spriteYlen = 0.03125, // 128px
            startPosX = 0.78125, // frame 16 (128 * 16 / 4096)
            startPosY = 1, // 0px (top)
            totalFrames = 73,
            startU = [],
            startV = [];
        dracoLoader.setDecoderPath('/js/draco/');
        modelLoader.setDRACOLoader(dracoLoader);
        modelLoader.load(
            'images/objects/vfx/wall-hit.glb',
            (gltf) => {
                let object = gltf.scene.children[0];
                console.log('WALL HIT LOADED', object, gltf);
                const tempMat = new THREE.MeshBasicMaterial({
                    map: this.vfxMap,
                    side: THREE.DoubleSide,
                    transparent: true,
                    depthWrite: false,
                    depthTest: true,
                });
                const tempGeo = object.geometry;
                let flareUvs = tempGeo.attributes.uv, i;
                const attrLength = flareUvs.count;
                for(i=0; i<attrLength; i++) {

                    let u = flareUvs.getX(i),
                        v = flareUvs.getY(i);
                    

                    startU.push(u);
                    startV.push(v);

                    u = u * ((startPosX + spriteXlen) - startPosX) + startPosX;
                    v = v * (startPosY - (startPosY - spriteYlen)) + (startPosY - spriteYlen);

                    // flareUvs.setXY(i, u, v);
                }
                flareUvs.needsUpdate = true;
                console.log('UV LENGTH', flareUvs.count, flareUvs);
                const tempMesh = new THREE.Mesh(tempGeo, tempMat);
                tempMesh.position.set(31.3, 42, 1.4);
                this.scene.add(tempMesh);
                this.explosionsAnims.count++;
                this.explosionsAnims.fired.push({
                    id: 'some-id2',
                    geo: tempGeo,
                    phase: 2,
                    frame: 1,
                    row: 1,
                    startPosX,
                    startPosY,
                    spriteXlen,
                    spriteYlen,
                    startU,
                    startV,
                    vStart: 1,
                    vEnd: 1 - spriteYlen,
                    lastUpdate: performance.now(),
                    interval: 35,
                    totalFrames,
                    row: 1,

                });

                this.sceneState.renderCalls.push(this.animateExplosions);
            },
            () => {},
            (error) => {
                console.log('Game engine error: A GLTF loading error happened for wall hit vfx model.', error);
            }
        );
    }

    animateExplosions = () => { // RUNS IN EVERY FRAME
        let count = this.explosionsAnims.count;
        if(!count) return;
        let i = 0,
            geo,
            uvAttribute,
            startPosX,
            startPosY,
            totalFrames,
            spriteXlen,
            spriteYlen,
            startU,
            startV,
            vStart,
            vEnd,
            frame,
            row,
            newX,
            newXPrev;
        for(i=0; i<count; i++) {
            if(performance.now() - this.explosionsAnims.fired[i].lastUpdate < this.explosionsAnims.fired[i].interval) break;
            geo = this.explosionsAnims.fired[i].geo;
            spriteXlen = this.explosionsAnims.fired[i].spriteXlen;
            spriteYlen = this.explosionsAnims.fired[i].spriteYlen;
            startPosX = this.explosionsAnims.fired[i].startPosX;
            startPosY = this.explosionsAnims.fired[i].startPosY;
            startU = this.explosionsAnims.fired[i].startU;
            startV = this.explosionsAnims.fired[i].startV;
            totalFrames = this.explosionsAnims.fired[i].totalFrames;
            vStart = this.explosionsAnims.fired[i].vStart;
            vEnd = this.explosionsAnims.fired[i].vEnd;
            frame = this.explosionsAnims.fired[i].frame;
            row = this.explosionsAnims.fired[i].row;
            newX = spriteXlen * frame;
            newXPrev = spriteXlen * (frame - 1);
            uvAttribute = geo.attributes.uv;
            let j;
            const attrLength = uvAttribute.count;
            startPosX = 0;
            row = 2;
            for(j=0; j<attrLength; j++) {

                let u = uvAttribute.getX(j),
                    v = uvAttribute.getY(j);

                u = startU[j] * ((startPosX + spriteXlen) - startPosX) + startPosX;
                v = startV[j] * (startPosY - (startPosY - spriteYlen * row)) + (startPosY - spriteYlen * row);

                uvAttribute.setXY(j, u, v);
            }
            uvAttribute.needsUpdate = true;
            this.explosionsAnims.fired[i].lastUpdate = performance.now();
            if((row === 1 && frame < 16) || (row === 2 && frame < 32) || (row === 3 && frame < 25)) {
                this.explosionsAnims.fired[i].frame++;
            } else if(row !== 3) {
                this.explosionsAnims.fired[i].frame = 1;
                this.explosionsAnims.fired[i].row++;
                this.explosionsAnims.fired[i].startPosX = 0;
            } else {
                this.explosionsAnims.fired[i].frame = 1;
                this.explosionsAnims.fired[i].row = 1;
                this.explosionsAnims.fired[i].startPosX = 0.5;
            }
            // if(frame * row === totalFrames) {
            //     this.explosionsAnims.fired[i].frame = 1;
            //     this.explosionsAnims.fired[i].row = 1;
            // } else if(frame === 32 || frame === 64) {
            //     this.explosionsAnims.fired[i].frame = 1;
            //     //this.explosionsAnims.fired[i].row++;
            // } else {
            //     this.explosionsAnims.fired[i].frame++;
            // }
        }
    }

    createProjectile() {
        const planeGeo = new THREE.PlaneBufferGeometry(1.2, 0.4, 1);
        const planeGeo2 = planeGeo.clone();
        const planeGeo3 = planeGeo.clone();
        const redMat = new THREE.MeshBasicMaterial({
            map: this.vfxMap,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            depthTest: true
        });
        const geometries = [];
        // redMat.color.setHSL(0.0035, 1, 0.5);
        // redMat.color.multiply(new THREE.Color(1.7, 0, 0));
        const spriteXlen = this.laserObjects.spriteXlen;
        const spriteYlen = this.laserObjects.spriteYlen;
        const plane = new THREE.Mesh(planeGeo, redMat);
        plane.rotation.z = -1.5708;
        plane.updateMatrix();
        plane.geometry.applyMatrix4(plane.matrix);
        const plane2 = new THREE.Mesh(planeGeo2, redMat);
        plane2.rotation.z = -1.5708;
        plane2.rotation.x = 1.5708;
        plane2.updateMatrix();
        plane2.geometry.applyMatrix4(plane2.matrix);

        // Flare
        let flareUvs = planeGeo3.attributes.uv;
        flareUvs.setXY(0, spriteXlen * 15, 1);
        flareUvs.setXY(1, spriteXlen * 16, 1);
        flareUvs.setXY(2, spriteXlen * 15, 1 - spriteYlen);
        flareUvs.setXY(3, spriteXlen * 16, 1 - spriteYlen);
        flareUvs.needsUpdate = true;
        const flare = new THREE.Mesh(planeGeo3, redMat);
        flare.position.z = -0.8;
        flare.scale.x = 2;
        flare.scale.y = 1.5;
        flare.rotation.z = -1.5708;
        flare.updateMatrix();
        flare.geometry.applyMatrix4(flare.matrix);

        // Merge into one mesh
        geometries.push(plane.geometry);
        geometries.push(plane2.geometry);
        geometries.push(flare.geometry);
        const mergedGeo = BufferGeometryUtils.mergeBufferGeometries(geometries, true);
        const redLaser = new THREE.Mesh(mergedGeo, redMat);
        this.laserObjects['red'] = redLaser;
        redLaser.position.x = 35;
        redLaser.position.y = 41;
        redLaser.position.z = this.shotHeight;
        this.scene.add(redLaser);
        this.projectileAnims.count++;
        this.projectileAnims.fired.push({
            id: 'some-id',
            geo: mergedGeo,
            phase: 2,
            frame: 1,
            spriteXlen,
            vStart: 1,
            vEnd: 1 - spriteYlen,
            lastUpdate: performance.now(),
            interval: 35,
        });

        this.sceneState.renderCalls.push(this.animateProjectile);
    }

    animateProjectile = () => { // RUNS IN EVERY FRAME
        let count = this.projectileAnims.count;
        if(!count) return;
        let i = 0,
            geo,
            uvAttribute,
            spriteXlen,
            vStart,
            vEnd,
            frame,
            newX,
            newXPrev;
        for(i=0; i<count; i++) {
            if(performance.now() - this.projectileAnims.fired[i].lastUpdate < this.projectileAnims.fired[i].interval) break;
            geo = this.projectileAnims.fired[i].geo;
            spriteXlen = this.projectileAnims.fired[i].spriteXlen;
            vStart = this.projectileAnims.fired[i].vStart;
            vEnd = this.projectileAnims.fired[i].vEnd;
            frame = this.projectileAnims.fired[i].frame;
            newX = spriteXlen * frame;
            newXPrev = spriteXlen * (frame - 1);
            uvAttribute = geo.attributes.uv;
            uvAttribute.setXY(0, newXPrev, vStart);
            uvAttribute.setXY(1, newX, vStart);
            uvAttribute.setXY(2, newXPrev, vEnd);
            uvAttribute.setXY(3, newX, vEnd);
            uvAttribute.needsUpdate = true;
            this.projectileAnims.fired[i].lastUpdate = performance.now();
            if(frame === 15) {
                this.projectileAnims.fired[i].frame = 1;
            } else {
                this.projectileAnims.fired[i].frame++;
            }
        }
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
            hitObject = this.scene.getObjectByName('king-mesh');
        direction.subVectors(new THREE.Vector3(target[0], target[1], 1), startPoint).normalize();
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

        let speed = intersects[0].distance * speedPerTile;
        this.sceneState.consequences.addProjectile(shooter.id, name, projectileLife.route);
        let particles = 0;

        const laser = this.VisualEffects.getEffectMesh('redBlaster');
        laser.name = name;
        laser.rotation.z = angle;
        laser.position.set(
            from[0],
            from[1],
            this.shotHeight
        );
        scene.add(laser);
        this.VisualEffects.startAnim({
            id: name,
            meshName: 'redBlaster',
        });
        // this.projectileAnims.count++;
        // this.projectileAnims.fired.push({
        //     id: name,
        //     geo: laser.geometry,
        //     phase: 2,
        //     frame: 1,
        //     spriteXlen: this.laserObjects.spriteXlen,
        //     vStart: 1,
        //     vEnd: 1 - this.laserObjects.spriteYlen,
        //     lastUpdate: performance.now(),
        //     interval: 35,
        // });

        this.sceneState.particles += particles;
        let tl = new TimelineMax();
        tl.startTime = performance.now();
        this.sounds.play('projectile-002');
        this.sounds.play('whoosh-001');
        tl.to(laser.position, speed, {
            x: targetPos[0],
            y: targetPos[1],
            ease: Linear.easeNone,
            onUpdate: () => {
                let hitter = this.sceneState.consequences.checkHitTime(name, this.sceneState.initTime.s);
                if(hitter) {
                    this.sceneState.consequences.doHitConsequence(name, scene, this.VisualEffects.removeAnim);
                    this.sceneState.particles -= particles;
                    this.hitObstacle(hitter.target, scene, name, camera, tileMap, hitter.hitPos, projectileLife);
                    tl.kill();
                    return;
                }
                let timeNow = this.sceneState.initTime.s + performance.now() / 1000;
                if(timeNow > projectileLife.route[projectileLife.route.length - 1].leaveTime + 0.5) {
                    this.sceneState.consequences.removeProjectile(name, scene, this.VisualEffects.removeAnim);
                    this.sceneState.particles -= particles;
                    tl.kill();
                }
            },
            onComplete: () => {
                this.sceneState.particles -= particles; // REMOVE PARTICLE(S)
                if(!projectileLife.noHit) {
                    this.hitObstacle('solid', scene, name, camera, tileMap, targetPos, projectileLife);
                }
                this.sceneState.consequences.removeProjectile(name, scene, this.VisualEffects.removeAnim);
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

    hitObstacle(type, scene, projectileName, camera, tileMap, targetPos, projectileLife) {
        let pos = [targetPos[0], targetPos[1]],
            posWOffset = [targetPos[0] + projectileLife.xOffset, targetPos[1] + projectileLife.yOffset],
            minFloorParticles = 3,
            maxFloorParticles = 36,
            floorParticles = this._randomIntInBetween(minFloorParticles, maxFloorParticles);
        if(type == 'solid') {
            this.createWallBurn(projectileLife, posWOffset, scene, camera);
            this.createSparkParticles(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife);
            this.sounds.play('ricochet-001');
        } else if(type == 'player' || type == 'door') {
            this.createSparkParticles(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife);
            if(type == 'door') {
                this.sounds.play('ricochet-001');
            } else {
                this.sounds.play('zap-001');
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

    createSparkParticles(floorParticles, scene, camera, posWOffset, pos, tileMap, projectileLife) {
        let geometry = new THREE.BufferGeometry(),
            sparks = new THREE.Points(geometry, this.sparkMaterial.clone()),
            vertices = [],
            targetPositions = [],
            i = 0;
        for(i=0; i<floorParticles; i++) {
            vertices.push(
                posWOffset[0],
                posWOffset[1],
                this.shotHeight
            );
            targetPositions.push([
                posWOffset[0] + this.random2dAmount(projectileLife.dir, 'x', tileMap, pos, projectileLife.special),
                posWOffset[1] + this.random2dAmount(projectileLife.dir, 'y', tileMap, pos, projectileLife.special),
                0.1
            ]);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
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
                }}, '-='+time);
                if(i === 0) {
                    let materialValues = {size:10},
                        tl2 = new TimelineMax();
                    tl2.to(materialValues, 1.7, {size: 0.001, onUpdate: () => {
                        sparks.material.size = materialValues.size;
                        sparks.material.needsUpdate = true;
                    }});
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
