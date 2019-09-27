import CombatView from './scenes/combat-view.js';

class Scene {
    constructor(renderer, sceneState) {
        this.sceneState = sceneState;
        this.curScene;
    }

    loadScene(view) {
        switch(view) {
            case 'combat':
                this.curScene = new CombatView().initView();
                //this.addWorldHelpers(this.curScene);
                return this.curScene;
        }
    }

    addWorldHelpers(scene) {
        // axes (helper)
        scene.add(new THREE.AxesHelper(32));

        // World plane (helper)
        const helper = new THREE.GridHelper(64, 64, 0xff0000, 0xffffff);
        helper.rotation.x = 1.5708;
        helper.position.set(31.5, 31.5, 0);
        helper.material.opacity = 0.75;
        helper.material.transparent = true;
        scene.add( helper );
    }

    getCurScene() {
        return this.curScene;
    }
}

export default Scene