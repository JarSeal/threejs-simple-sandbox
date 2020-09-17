import { Howl } from 'howler';
import * as doorSprite from '../soundsSrc/door-sprite.json';
import * as projectileSprite from '../soundsSrc/projectile-sprite.json';

class SoundController {
    constructor() {
        this.soundSprites = {
            door: doorSprite,
            projectile: projectileSprite,
        };
    }

    loadSoundsSprite(spriteKey, generalParams) {
        return new Howl(Object.assign({}, generalParams, this.getSpriteJson(spriteKey)));
    }

    getSpriteJson(spriteKey) {        
        const sprite = this.soundSprites[spriteKey];
        return sprite.default ? sprite.default : sprite;
    }
}

export default SoundController;