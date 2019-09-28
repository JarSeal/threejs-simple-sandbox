import CombatScene from './scenes/combat-scene.js';

class Scene {
    constructor(renderer, sceneState) {
        this.sceneState = sceneState;
        this.renderer = renderer;
        this.camera;
        this.curScene;
        this.curViewClass;
    }

    loadScene(view) {
        switch(view) {
            case 'combat':
                const combatScene = new CombatScene();
                this.curViewClass = combatScene;
                this.curScene = combatScene.initView(this.renderer, this.sceneState);
                this.camera = combatScene.getCamera();
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

    getCamera() {
        return this.camera;
    }

    doLoops() {
        this.curViewClass.doLoops();
    }
}

export default Scene