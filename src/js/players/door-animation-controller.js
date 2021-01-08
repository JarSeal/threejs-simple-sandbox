import { TimelineMax, Sine } from 'gsap-ssr';

class DoorAnimationController {
    constructor(scene, sceneState, SoundController) {
        this.scene = scene;
        this.sceneState = sceneState;
        this.Sound = SoundController;
        this.sounds = SoundController.loadSoundsSprite('door', {volume: 0.1});
    }

    checkDoors(pid) {
        this.sceneState.consequences.checkDoors(pid).onmessage = (e) => {
            const anims = e.data,
                animsLength = anims.length;
            if(anims.pid !== pid) {
                console.log('SOME ELSE PID');
                return;
            }
            let i = 0;
            for(i=0; i<animsLength; i++) {
                const a = anims[i];
                this.animateDoor(a.door, a.dirTo);
            }
        };
    }

    animateDoor(door, dirTo) {
        let doorID = door.doorID,
            doorGroup = this.scene.getObjectByName(doorID).children,
            duration = 0.3,
            doorOne = doorGroup[0],
            doorTwo = doorGroup[1],
            orientationSplit = doorOne.name.split('--'),
            orientation = orientationSplit[orientationSplit.length-1],
            doors = this.sceneState.consequences.getDoors();
        if(doorOne.userData.tl) {
            doorOne.userData.tl.kill();
            doorOne.userData.tl = undefined;
        }
        if(doorTwo.userData.tl) {
            doorTwo.userData.tl.kill();
            doorTwo.userData.tl = undefined;
        }
        doorOne.userData.tl = new TimelineMax();
        doorTwo.userData.tl = new TimelineMax();
        if(dirTo == 'open') {
            doors[doorID].params['animating'] = true;
            doors[doorID].params['animatingDirOpen'] = true;
            doors[doorID].params.open = true;
            this.Sound.playFx(this.sounds, 'door-slide-001');
            if(orientation == 'odd') {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    y: doorOne.userData.pos[1] - door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorOne.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    y: doorTwo.userData.pos[1] + door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorTwo.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                    }
                });
            } else {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    x: doorOne.userData.pos[0] - door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorOne.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    x: doorTwo.userData.pos[0] + door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorTwo.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                    }
                });
            }
        } else {
            doors[doorID].params['animating'] = true;
            doors[doorID].params['animatingDirOpen'] = false;
            doors[doorID].params.open = false;
            this.Sound.playFx(this.sounds, 'door-slide-001');
            if(orientation == 'odd') {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    y: doorOne.userData.pos[1] - door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorOne.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                        this.Sound.playFx(this.sounds, 'door-closes-001');
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    y: doorTwo.userData.pos[1] + door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorTwo.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                        // this.Sound.playFx(this.sounds, 'door-closes-001');
                    }
                });
            } else {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    x: doorOne.userData.pos[0] - door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorOne.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                        this.Sound.playFx(this.sounds, 'door-closes-001');
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    x: doorTwo.userData.pos[0] + door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doorTwo.userData.tl = undefined;
                        doors[doorID].params['animating'] = false;
                        // this.Sound.playFx(this.sounds, 'door-closes-001');
                    }
                });
            }
        }
    }
}

export default DoorAnimationController;