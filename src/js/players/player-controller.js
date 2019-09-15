import { getPlayer } from '../data/dev-player.js'; // GET NEW PLAYER DUMMY DATA HERE

class PlayerController {
    constructor() {
        // this.mouse = new THREE.Vector2();
        // window.addEventListener('click', this.onTileClick);
    }

    createNewPlayer(mtlLoader, objLoader, scene, renderer, sceneState, type) {
        let player;
        switch(type) {
            case 'hero':
                this.createHero(sceneState, scene);
                break;
            default:
                return;
        }
    }

    createHero(sceneState, scene) {
        let hero = getPlayer();
        sceneState.players.hero = hero;
        sceneState.players.hero.pos = [34,29,0];
        let heroGeometry = new THREE.BoxBufferGeometry(1,1,hero.height);
        let heroMaterial = new THREE.MeshPhongMaterial({color: 0xff0088});
        let heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
        heroMesh.position.x = sceneState.players.hero.pos[0];
        heroMesh.position.y = sceneState.players.hero.pos[1];
        heroMesh.position.z = 0.5;
        heroMesh.scale.x = 0.5;
        heroMesh.scale.y = 0.5;
        scene.add(heroMesh);
        // let TL = new TimelineMax();
        // console.log(heroMesh);
        // TL.to(heroMesh.position, 10, {y: 34, ease: Expo.easeOut}, "=3");
    }

    getStartingPosition(sceneState, type) {
        let startingPosition = sceneState.players[type].startingPos;
        
    }

    onTileClick = (event) => {
        event.preventDefault();
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        console.log(this.mouse);
    }
}

export default PlayerController