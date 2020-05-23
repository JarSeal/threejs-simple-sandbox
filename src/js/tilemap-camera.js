import * as THREE from 'three'
import { TimelineMax } from 'gsap-ssr';

class TileMapCamera {
    constructor(scene, renderer, sceneState, AppUiLayer, PlayerController) {
        this.scene = scene;
        this.renderer = renderer;
        this.sceneState = sceneState;
        this.AppUiLayer = AppUiLayer;
        this.PlayerController = PlayerController;
        this.stageMaxPosX = 64;
        this.stageMaxPosY = 64;
        this.initPosition = {
            x: 3.5,
            y: -3.5,
            z: 10
        };
        this.lastDist = 0;
        this.isDragging = false;
        this.clickStart ={x:0,y:0};
        this.camera;
        this.aspectRatio;
        this.backPlane;
        this.stars = [];
        this.starMaterials = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.init(scene);
    }

    init(scene) {
        this.setAspectRatio();
        this.camera = new THREE.PerspectiveCamera(80,this.aspectRatio,0.1,64);
        let zoom = 1;
        this.camera.position.x = 3.5 * zoom;
        this.camera.position.y = -3.5 * zoom;
        this.camera.position.z = 10 * zoom;
        this.camera.rotation.x = 0.35;
        this.camera.rotation.y = 0.35;
        this.camera.rotation.z = 0.785398;

        {
            let backGeo = new THREE.PlaneBufferGeometry(80,80,1);
            const loader = new THREE.TextureLoader();
            const texture = loader.load(
                '/images/stars-test.png'
            );
            let backMat = new THREE.MeshBasicMaterial({map:texture});
            this.backPlane = new THREE.Mesh(backGeo, backMat);
            this.backPlane.position.x = 32;
            this.backPlane.position.y = 32;
            this.backPlane.position.z = -32;
            this.backPlane.quaternion.copy(this.camera.quaternion);
            scene.add(this.backPlane);
        }

        // let group = new THREE.Group();
        // let sprite = new THREE.TextureLoader().load( '/images/sprites/star.png' );
        // let material = new THREE.SpriteMaterial({map: sprite, transparent: true, alphaTest: 0});
        // for (let a=0; a<1000; a++) {
        //     let x = THREE.Math.randFloat(-500, 500);
        //     let y = THREE.Math.randFloat(-500, 500);
        //     let z = THREE.Math.randFloat(-100, -300);
        //     let sprite = new THREE.Sprite(material);
        //     sprite.position.set(x, y, z);
        //     group.add(sprite);
        // }
        // scene.add(group);

        let mainApp = document.getElementById("uiCanvas");
        mainApp.addEventListener("touchmove", this.touchMove, {passive: false});
        mainApp.addEventListener("touchstart", this.startTouchMove, {passive: false});
        mainApp.addEventListener("touchend", this.endTouchMove, {passive: false});
        mainApp.addEventListener("mousemove", this.touchMove, {passive: false});
        mainApp.addEventListener("mousedown", this.startTouchMove, {passive: false});
        mainApp.addEventListener("mouseup", this.endTouchMove, {passive: false});
        this.centerCamera();
    }

    resize() {
        this.setAspectRatio();
        this.backPlanePosition();
        this.backPlane.updateMatrix();
        this.camera.aspect = this.aspectRatio;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight);
    }

    setAspectRatio() {
        let w = document.documentElement.clientWidth,
            h = document.documentElement.clientHeight;
        this.aspectRatio = w / h;
    }

    centerCamera() {
        this.camera.position.x = 36;
        this.camera.position.y = 28;
        this.backPlanePosition();
    }

    backPlanePosition() {
        this.backPlane.position.x = this.camera.position.x - 14 - (this.camera.position.x / 8);
        this.backPlane.position.y = this.camera.position.y + 20 - (this.camera.position.y / 8);
        if(this.aspectRation > 1.4) {
            this.backPlane.scale.set(4,4,1);
        } else {
            this.backPlane.scale.set(2,2,1);
        }
    }

    touchMove = (evt) => {
        let touch1 = false;
        let touch2 = false;
        let dist;
        let stageMinPosX = -7,
            stageMinPosY = -7,
            stageMaxPosX = 67,
            stageMaxPosY = 67,
            newX,
            newY,
            clientX,
            clientY;
		if(evt.touches && evt.touches.length) {
			touch1 = evt.touches[0];
			if(evt.touches.length > 1) touch2 = evt.touches[1];
        } else {
            touch1 = evt;
        }
        if(this.isDragging) {
            clientX = parseInt(touch1.clientX);
            clientY = parseInt(touch1.clientY);
            dist = {
                x: (this.lastDist.x - clientX) / 50,
                y: (this.lastDist.y - clientY) / 50,
            };
            newX = this.camera.position.x + dist.x + dist.y / 2;
            newY = this.camera.position.y - dist.y + dist.x / 2;
            if(newX < stageMinPosX) {
                this.camera.position.x = stageMinPosX;
            } else if(newX > stageMaxPosX) {
                this.camera.position.x = stageMaxPosX;
            } else {
                this.camera.position.x = newX;
            }
            if(newY < stageMinPosY) {
                this.camera.position.y = stageMinPosY;
            } else if(newY > stageMaxPosY) {
                this.camera.position.y = stageMaxPosY;
            } else {
                this.camera.position.y = newY;
            }
            this.backPlanePosition();
            
            // console.log('camera',newX,newY);

            this.lastDist = {
                x: clientX,
                y: clientY
            };
        }
        // if(touch1 && touch2) {
        //     // Pinch zoom
        //     let scale,
        //         speedUp = 70,
        //         scaleMin = 0.05,
        //         scaleMax = this.maxScale,
        //         dist = this._getDistance({
        //             x: touch1.clientX,
        //             y: touch1.clientY
        //         }, {
        //             x: touch2.clientX,
        //             y: touch2.clientY
        //         });
        //     if(!this.lastPinchDist) {
        //         this.lastPinchDist = dist;
        //     }
        //     if(this.lastPinchDist == dist || this.stageProps.scaleStage > 0.4) speedUp = 0;
        //     if(this.lastPinchDist > dist) speedUp = -speedUp;
        //     scale = this.stageProps.scaleStage * (dist + speedUp) / this.lastPinchDist;
        //     if(scale < scaleMin) scale = scaleMin;
        //     if(scale > scaleMax) scale = scaleMax;
        //     if(scale < 0.2) {
        //         //console.log('show planets..');
        //     }
        //     this.stageProps.scaleStage = Math.round(scale * 100) / 100;
        //     this.stageProps.tileSize = this.originalTileSize * this.stageProps.scaleStage;
        //     this.stageProps.tileSizes.half = this.stageProps.tileSize / 2;
        //     this.stageProps.tileSizes.quarter = this.stageProps.tileSize / 4;
        //     this.lastPinchDist = dist;
        // }
        evt.preventDefault();
    }

    startTouchMove = (evt) => {
        if(evt.touches) {
            let touch1 = evt.touches[0],
                touch2 = evt.touches[1];
            this.clickStart = {
                x: parseInt(touch1.clientX),
                y: parseInt(touch1.clientY),
                x2: touch2 ? parseInt(touch2.clientX) : null,
                y2: touch2 ? parseInt(touch2.clientY) : null,
            };
            this.lastDist = {
                x: this.clickStart.x,
                y: this.clickStart.y,
            };
        } else {
            this.clickStart = {
                x: parseInt(evt.clientX),
                y: parseInt(evt.clientY)
            };
            this.lastDist = {
                x: this.clickStart.x,
                y: this.clickStart.y,
            }
        }
        if(!this.isClickStartTargetUi(this.clickStart)) {
            this.isDragging = true;
        }
    }

    endTouchMove = (evt) => {
        this.isDragging = false;
        this.lastPinchDist = 0;
        let clickEnd,
            dragToClickThreshold = 3,
            tl;
        evt.preventDefault();
        if(this.sceneState.ui.curState == 'startClick' &&
           !this.sceneState.ui.curSecondaryState) {
            this.sceneState.ui.curState = null;
            this.sceneState.ui.curSecondaryState = null;
            this.sceneState.ui.curId = null;
            this.sceneState.ui.update = true;
            this.sceneState.ui.keepUpdating = false;
            return;
        }
        if(this.clickStart.x < this.lastDist.x + dragToClickThreshold &&
           this.clickStart.x > this.lastDist.x - dragToClickThreshold &&
           this.clickStart.y < this.lastDist.y + dragToClickThreshold &&
           this.clickStart.y > this.lastDist.y - dragToClickThreshold) {
            // Click a tile (no drag or pinch)
            if(evt.changedTouches && evt.changedTouches.length == 1) {
                let touch1 = evt.changedTouches[0];
                clickEnd = {
                    x: parseInt(touch1.clientX),
                    y: parseInt(touch1.clientY)
                };
            } else {
                clickEnd = {
                    x: parseInt(evt.clientX),
                    y: parseInt(evt.clientY)
                };
            }
            this.mouse.x = (clickEnd.x / document.documentElement.clientWidth) * 2 - 1;
            this.mouse.y = - (clickEnd.y / document.documentElement.clientHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            let intersects = this.raycaster.intersectObjects(this.scene.tileClick.clickPlane, true);
            let pos = intersects[0].point;
            let tile;
            let dx = Math.round(pos.x);
            let dy = Math.round(pos.y);

            if(!this.sceneState.players.hero.route.length && this.sceneState.players.hero.moving) {
                this.sceneState.players.hero.moving = false;
            }
            // Check if tile clicked is a walkable or a door (which is also walkable)
            if(!this.sceneState.ui.curSecondaryState &&
               (this.sceneState.shipMap[this.sceneState.floor][dx][dy].type == 1 ||
               this.sceneState.shipMap[this.sceneState.floor][dx][dy].type == 3)) {
                // Add tile click marker and animate it
                tile = this.scene.tileClick.oneTile;
                tile.position.x = dx;
                tile.position.y = dy;
                tl = new TimelineMax();
                tl.to(tile.material, .1, {opacity: 0.7});
                tl.to(tile.material, 2, {opacity: 0, ease: Expo.easeOut});

                if (dx === this.sceneState.players.hero.pos[0] &&
                    dy === this.sceneState.players.hero.pos[1] &&
                    !this.sceneState.players.hero.moving) return;

                if(!this.sceneState.players.hero.moving) {
                    this.AppUiLayer.logMessage(
                        performance.now(),
                        this.sceneState.players.hero.name,
                        'Started moving.. (x: ' + dx + ', y:' + dy + ')',
                        'M'
                    );
                }

                this.PlayerController.calculateRoute('hero', dx, dy);

            } else if(this.sceneState.ui.curSecondaryState) {
                // Shoot a projectile:

                this.sceneState.ui.curSecondaryState = null;
                this.sceneState.ui.curSecondaryTarget = [dx,dy];

                // Add tile click marker and animate it
                tile = this.scene.tileClick.oneTarget;
                tile.position.x = dx;
                tile.position.y = dy;
                tl = new TimelineMax();
                tl.to(tile.material, .1, {opacity: 0.7});
                tl.to(tile.material, 2, {opacity: 0, ease: Expo.easeOut});

                this.PlayerController.fire(
                    this.sceneState.players.hero,
                    this.sceneState.ui.curSecondaryTarget,
                    this.scene,
                    this.sceneState,
                    this.AppUiLayer,
                    this.camera
                );
            }
        }
    }

    isClickStartTargetUi(target) {
        let uiData = this.sceneState.ui.viewData,
            uiDataLength = uiData.length,
            i,
            pos,
            size,
            xDiff,
            yDiff,
            dist,
            hit;
        if(((target.x2 && target.y2) || (this.sceneState.ui.ctrl)) && this.sceneState.ui.curState == 'startClick') {
            this.sceneState.ui.curSecondaryState = 'tileClick';
        }
        for(i=0; i<uiDataLength; i++) {
            if(uiData[i].type == 'circleButton') {
                pos = uiData[i].pos;
                size = uiData[i].radius;
                xDiff = Math.abs(pos[0] - target.x);
                yDiff = Math.abs(pos[1] - target.y);
                dist = Math.sqrt(Math.pow(xDiff,2)+Math.pow(yDiff,2));
                hit = dist <= size;
            }
            if(hit) {
                this.sceneState.ui.curState = 'startClick';
                this.sceneState.ui.curId = this.sceneState.ui.viewData[0].id;
                this.sceneState.ui.update = true;
                if(this.sceneState.ui.viewData[0].keepUpdatingWhenPressed) {
                    this.sceneState.ui.keepUpdating = true;
                }
                return this.sceneState.ui.viewData[0].id;
            }
        }
        return false;
    }

    getCamera() {
        return this.camera;
    }
}

export default TileMapCamera;