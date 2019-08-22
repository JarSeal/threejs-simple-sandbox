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
        renderer.setClearColor('#000000');
        renderer.setSize(window.innerWidth,window.innerHeight);
        document.body.appendChild(renderer.domElement);
        let cam = new TileMapCamera(scene, renderer);
        let camera = cam.getCamera();

        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2();

        // Center of the world
        let beamGeometry = new THREE.BoxGeometry(1,1,1);
        let beamMaterial = new THREE.MeshLambertMaterial({color: 0xff0000});
        let beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.y = 63;
        beam.position.x = 0;
        beam.position.z = 0.5;
        // beam.position.x = (Math.random() - 0.5) * 10;
        // beam.position.y = (Math.random() - 0.5) * 10;
        // beam.position.z = (Math.random() - 0.5) * 10;
        scene.add(beam);

        // axes (helper)
        scene.add(new THREE.AxesHelper(32));

        // World plane (helper)
        let helper = new THREE.GridHelper(64, 64, 0xff0000, 0xffffff);
        helper.rotation.x = 1.5708;
        helper.position.set(31.5, 31.5, 0);
        helper.material.opacity = 0.75;
        helper.material.transparent = true;
        scene.add( helper );

        // let geometry = new THREE.SphereGeometry(1,100,100);
        let geometry = new THREE.BoxGeometry(1,1,1);
        let material = new THREE.MeshLambertMaterial({color: 0xF7F7F7});
        let mesh = new THREE.Mesh(geometry, material);
        //scene.add(mesh);

        for(let i=0; i<100; i++) {
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = (Math.random() - 0.5) * 10;
            mesh.position.y = (Math.random() - 0.5) * 10;
            //mesh.position.z = (Math.random() - 0.5) * 10;
            mesh.hoverable = true;
            scene.add(mesh);
        }

        scene.add(new THREE.AmbientLight(0xf0f0f0, 0.2));

        let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, -32, 10);
        directionalLight.castShadows = true;
        scene.add( directionalLight );

        // let light = new THREE.PointLight(0xFFFFFF, 1, 1000);
        // light.position.set(32,0,0);
        // scene.add(light);

        // light = new THREE.PointLight(0xFFFFFF, 2, 1000);
        // light.position.set(0,0,25);
        // scene.add(light);

        // Debug statisctics [START]
        let stats;
        function createStats() {
            let stats = new Stats();
            stats.setMode(0);
            return stats;
        }
        stats = createStats();
        document.body.appendChild(stats.domElement);
        // Debug statisctics [END]

        let render = function() {
            requestAnimationFrame(render);
            // mesh.rotation.x += 0.05;
            // mesh.rotation.y += 0.01;
            renderer.render(scene, camera);
            stats.update(); // Debug statistics
        };

        function onMouseMove(event) {
            event.preventDefault();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            let intersects = raycaster.intersectObjects(scene.children, true);
            for(let i=0; i<intersects.length; i++) {
                // intersects[i].object.material.color.set(0xFF0000);
                if(intersects[i].object.hoverable) {
                    this.tl = new TimelineMax();
                    this.tl.to(intersects[i].object.scale, 1, {x: 2, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.scale, .5, {x: .5, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.position, .5, {x: 2, ease: Expo.easeOut});
                    this.tl.to(intersects[i].object.rotation, .5, {y: Math.PI*.5, ease: Expo.easeOut}, "=-1.5");
                }
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