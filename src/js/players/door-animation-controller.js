import { TimelineMax, Sine } from 'gsap-ssr';

class DoorAnimationController {
    constructor(scene, sceneState, SoundController) {
        this.scene = scene;
        this.sceneState = sceneState;
        this.Sound = SoundController;
        this.sounds = SoundController.loadSoundsSprite('door', {volume: 0.1});
    }

    checkDoors() {
        let playerPositions = this.sceneState.consequences.getAllCurrentPlayerPositions(),
            playerPositionsLength = playerPositions.length,
            p = 0,
            tileMap = this.sceneState.shipMap[this.sceneState.floor],
            openDoors = [],
            doors = this.sceneState.consequences.getDoors();
        for(p=0; p<playerPositionsLength; p++) {
            let curTile = tileMap[playerPositions[p][0]][playerPositions[p][1]];
            if(curTile.doorParams && curTile.doorParams.length) {
                let params = curTile.doorParams,
                    paramsLength = params.length,
                    d = 0;
                for(d=0; d<paramsLength; d++) {
                    if(!openDoors.includes(params[d].doorID) && !doors[params[d].doorID].params.locked) {
                        openDoors.push(params[d].doorID);
                    }
                }
            }
        }
        if(openDoors.length) {
            let openDoorsLength = openDoors.length,
                o = 0;
            for(o=0; o<openDoorsLength; o++) {
                let params = doors[openDoors[o]].params;
                if(!params.open || (params.animating && !params.animatingDirOpen)) {
                    this.animateDoor(params, doors, 'open');
                }
            }
        }
        const doorKeys = Object.keys(doors);
        let doorKeysLength = doorKeys.length,
            d = 0;
        for(d=0; d<doorKeysLength; d++) {
            let door = doors[doorKeys[d]].params;
            if(!openDoors.includes(door.doorID) && (door.open || (door.animating && door.animatingDirOpen))) {
                this.animateDoor(door, doors, 'closed');
            }
        }
    }

    animateDoor(door, doors, dirTo) {
        let doorID = door.doorID,
            doorGroup = this.scene.getObjectByName(doorID).children,
            duration = 0.3,
            doorOne = doorGroup[0],
            doorTwo = doorGroup[1],
            orientationSplit = doorOne.name.split('--'),
            orientation = orientationSplit[orientationSplit.length-1];
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