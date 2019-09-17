

class TileMapCamera {
    constructor(scene, renderer, sceneState) {
        this.scene = scene;
        this.sceneState = sceneState;
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
        this.stars = [];
        this.starMaterials = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.init(scene, renderer);
    }

    init(scene, renderer) {
        this.camera = new THREE.PerspectiveCamera(70,window.innerWidth / window.innerHeight,0.1,1000);
        let zoom = 1;
        this.camera.position.x = 3.5 * zoom;
        this.camera.position.y = -3.5 * zoom;
        this.camera.position.z = 10 * zoom;
        this.camera.rotation.x = 0.35;
        this.camera.rotation.y = 0.35;
        this.camera.rotation.z = 0.785398;

        let group = new THREE.Group();
        let sprite = new THREE.TextureLoader().load( '/images/sprites/star.png' );
        let material = new THREE.SpriteMaterial({map: sprite, transparent: true, alphaTest: 0});
        for (let a=0; a<1000; a++) {
            let x = THREE.Math.randFloat(-500, 500);
            let y = THREE.Math.randFloat(-500, 500);
            let z = THREE.Math.randFloat(-100, -300);
            let sprite = new THREE.Sprite(material);
            sprite.position.set(x, y, z);
            group.add(sprite);
        }
        scene.add(group);

        window.addEventListener('resize', () => {
            renderer.setSize(window.innerWidth,window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
        document.getElementById("mainApp").addEventListener("touchmove", this.touchMove, {passive: false});
        window.addEventListener("touchstart", this.startTouchMove, {passive: false});
        window.addEventListener("touchend", this.endTouchMove, {passive: false});
        window.addEventListener("mousemove", this.touchMove, {passive: false});
        window.addEventListener("mousedown", this.startTouchMove, {passive: false});
        window.addEventListener("mouseup", this.endTouchMove, {passive: false});
        this.centerCamera();
    }

    centerCamera() {
        this.camera.position.x = 36;
        this.camera.position.y = 28;
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
            
            //console.log('camera',newX,newY);

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
            let touch1 = evt.touches[0];
            this.clickStart = {
                x: parseInt(touch1.clientX),
                y: parseInt(touch1.clientY)
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
        this.isDragging = true;
    }

    endTouchMove = (evt) => {
        this.isDragging = false;
        this.lastPinchDist = 0;
        let clickEnd,
            dragToClickThreshold = 3;
        evt.preventDefault();
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
            this.mouse.x = (clickEnd.x / window.innerWidth) * 2 - 1;
            this.mouse.y = - (clickEnd.y / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            let intersects = this.raycaster.intersectObjects(this.scene.tileClick.clickPlane, true);
            let pos = intersects[0].point;
            let tile = this.scene.tileClick.oneTile;
            let dx = Math.round(pos.x);
            let dy = Math.round(pos.y);
            console.log('CLICKIDI',dx,dy);

            // Calculate route
            let startTime = performance.now();
            let newGraph = new Graph(
                this.sceneState.astar[this.sceneState.floor],
                { diagonal: true }
            );
            let resultRoute = astar.search(
                newGraph, newGraph.grid[34][29],
                newGraph.grid[dx][dy],
                { closest: true }
            );
            let endTime = performance.now();
            console.log('route', (endTime - startTime) + "ms", resultRoute);
            
            // Add tile click marker and animate
            tile.position.x = dx;
            tile.position.y = dy;
            this.tl = new TimelineMax();
            this.tl.to(tile.material, .1, {opacity: 0.7});
            this.tl.to(tile.material, 2, {opacity: 0, ease: Expo.easeOut});
        }
    }

    getCamera() {
        return this.camera;
    }
}

export default TileMapCamera;