import { Howl, Howler } from 'howler';

class SoundController {
    constructor() {
        this.soundPath = "/sounds/";
    }

    loadSoundsSprite(sprite, generalParams) {
        return new Howl(Object.assign({}, generalParams, sprite));
    }
}

export default SoundController;