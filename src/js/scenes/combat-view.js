

class CombatView {
    constructor() {
        this.scene;
    }

    initView(scene) {
        this.scene = new THREE.Scene();

        let hemi = new THREE.HemisphereLight( 0xffffbb, 0x080820, 0.8 );
        this.scene.add(hemi);
        this.scene.add(new THREE.AmbientLight(0xf0f0f0, 0.5));

        return this.scene;
    }
}

export default CombatView