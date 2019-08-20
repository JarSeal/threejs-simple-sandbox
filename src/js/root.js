import TileMapCamera from './tilemap-camera.js';

class TileMapRoot {
    constructor() {
        this.sceneState = {
            camera: {},
        };
        this.init();
    }

    init() {
        let scene = new THREE.Scene();
        let renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setClearColor("#e5e5e5");
        renderer.setSize(window.innerWidth,window.innerHeight);
        document.body.appendChild(renderer.domElement);
        let cam = new TileMapCamera(renderer);
        let camera = cam.getCamera();

        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();

        // Center of the world
        let beamGeometry = new THREE.BoxGeometry(1,1,1);
        let beamMaterial = new THREE.MeshLambertMaterial({color: 0xff0000});
        let beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.itemId = "middleBlock";
        beam.position.x = 0;
        beam.position.y = 0;
        beam.position.z = 0.5;
        // beam.position.x = (Math.random() - 0.5) * 10;
        // beam.position.y = (Math.random() - 0.5) * 10;
        // beam.position.z = (Math.random() - 0.5) * 10;
        scene.add(beam);

        // let geometry = new THREE.SphereGeometry(1,100,100);
        let geometry = new THREE.BoxGeometry(1,1,1);
        let material = new THREE.MeshLambertMaterial({color: 0xF7F7F7});
        let mesh = new THREE.Mesh(geometry, material);
        //scene.add(mesh);

        for(let i=0; i<15; i++) {
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = (Math.random() - 0.5) * 10;
            mesh.position.y = (Math.random() - 0.5) * 10;
            //mesh.position.z = (Math.random() - 0.5) * 10;
            scene.add(mesh);
        }

        let light = new THREE.PointLight(0xFFFFFF, 1, 1000);
        light.position.set(0,0,0);
        scene.add(light);

        light = new THREE.PointLight(0xFFFFFF, 2, 1000);
        light.position.set(0,0,25);
        scene.add(light);

        let render = function() {
            requestAnimationFrame(render);
            // mesh.rotation.x += 0.05;
            // mesh.rotation.y += 0.01;
            renderer.render(scene, camera);
        };

        function onMouseMove(event) {
            event.preventDefault();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            let intersects = raycaster.intersectObjects(scene.children, true);
            for(let i=0; i<intersects.length; i++) {
                // intersects[i].object.material.color.set(0xFF0000);
                if(intersects[i].object.itemId == 'middleBlock') break;
                this.tl = new TimelineMax();
                this.tl.to(intersects[i].object.scale, 1, {x: 2, ease: Expo.easeOut});
                this.tl.to(intersects[i].object.scale, .5, {x: .5, ease: Expo.easeOut});
                this.tl.to(intersects[i].object.position, .5, {x: 2, ease: Expo.easeOut});
                this.tl.to(intersects[i].object.rotation, .5, {y: Math.PI*.5, ease: Expo.easeOut}, "=-1.5");
            }
        }

        render();

        // this.tl = new TimelineMax({paused: true});
        // this.tl.to(mesh.scale, 1, {x: 2, ease: Expo.easeOut});
        // this.tl.to(mesh.scale, .5, {x: .5, ease: Expo.easeOut});
        // this.tl.to(mesh.position, .5, {x: 2, ease: Expo.easeOut});
        // this.tl.to(mesh.rotation, .5, {y: Math.PI*.5, ease: Expo.easeOut}, "=-1.5");

        window.addEventListener('mousemove', onMouseMove);
    }
}

new TileMapRoot();