import { Howl } from 'howler';
import * as doorSprite from '../soundsSrc/door-sprite.json';
import * as projectileSprite from '../soundsSrc/projectile-sprite.json';

class SoundController {
    constructor(sceneState) {
        this.sceneState = sceneState;
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

    playFx(sprite, sound) {
        if(!this.sceneState.settings.soundFxOn) return;
        if(Array.isArray(sound)) {
            const soundsLength = sound.length;
            let i = 0;
            for(i=0; i<soundsLength; i++) {
                sprite.play(sound[i]);
            }
        } else {
            sprite.play(sound);
        }
    }
}

export default SoundController;