import { getShip } from '../data/dev-ship.js';
import { getModule } from './modules/index.js';

class LoadTileMap {
    constructor(mtlLoader, objLoader, scene) {
        this.init(mtlLoader, objLoader, scene);
    }

    init(mtlLoader, objLoader, scene) {
        new Promise((resolve) => {
            mtlLoader.load('test-floor2.mtl', (materials) => {
                resolve(materials);
            })
        })
        .then((materials) => {
            materials.preload();
            objLoader.setMaterials(materials);
            objLoader.load('test-floor2.obj', (object) => {
                object.rotation.x = 1.5708;
                object.position.x = 31.5;
                object.position.y = 31.5;
                scene.add(object);
            })
        });
    }

    getCurrentMap() {
        // return getShip();
        return getModule(1,1);
    }
}

export default LoadTileMap