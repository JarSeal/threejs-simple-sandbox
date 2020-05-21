

class DoorAnimationController {
    constructor(scene, sceneState) {
        this.scene = scene;
        this.sceneState = sceneState;
    }

    checkDoors() {
        let playerPositions = this.sceneState.consequences.getAllCurrentPlayerPositions(),
            playerPositionsLength = playerPositions.length,
            p = 0,
            tileMap = this.sceneState.shipMap[this.sceneState.floor],
            openDoors = [];
        for(p=0; p<playerPositionsLength; p++) {
            let curTile = tileMap[playerPositions[p][0]][playerPositions[p][1]];
            if(curTile.doorParams && curTile.doorParams.length) {
                let params = curTile.doorParams,
                    paramsLength = params.length,
                    d = 0;
                for(d=0; d<paramsLength; d++) {
                    if(!openDoors.includes(params[d].doorID)) {
                        openDoors.push(params[d].doorID);
                    }
                }
            }
        }
        let doors = this.sceneState.consequences.getDoors();
        if(openDoors.length) {
            let openDoorsLength = openDoors.length,
                o = 0;
            for(o=0; o<openDoorsLength; o++) {
                let params = doors[openDoors[o]].params;
                if(!params.open || (params.animating && !params.animationDirOpen)) {
                    this.animateDoor(params, doors, 'open');
                }
            }
        }
        const doorKeys = Object.keys(doors);
        let doorKeysLength = doorKeys.length,
            d = 0;
        for(d=0; d<doorKeysLength; d++) {
            let door = doors[doorKeys[d]].params;
            if(!openDoors.includes(door.doorID) && (door.open || (door.animating && door.animationDirOpen))) {
                this.animateDoor(door, doors, 'closed')
            }
        }
    }

    animateDoor(door, doors, dirTo) {
        let doorID = door.doorID,
            doorGroup = this.scene.getObjectByName(doorID).children,
            duration = 0.3,
            doorOne = doorGroup[0],
            doorTwo = doorGroup[1],
            orientationSplit = doorOne.name.split("--"),
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
            if(orientation == "odd") {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    y: doorOne.userData.pos[1] - door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorOne.userData.tl = undefined;
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    y: doorTwo.userData.pos[1] + door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorTwo.userData.tl = undefined;
                    }
                });
            } else {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    x: doorOne.userData.pos[0] - door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorOne.userData.tl = undefined;
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    x: doorTwo.userData.pos[0] + door.openOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorTwo.userData.tl = undefined;
                    }
                });
            }
        } else {
            doors[doorID].params['animating'] = true;
            doors[doorID].params['animatingDirOpen'] = false;
            doors[doorID].params.open = false;
            if(orientation == "odd") {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    y: doorOne.userData.pos[1] - door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorOne.userData.tl = undefined;
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    y: doorTwo.userData.pos[1] + door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorTwo.userData.tl = undefined;
                    }
                });
            } else {
                doorOne.userData.tl.to(doorOne.position, duration, {
                    x: doorOne.userData.pos[0] - door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorOne.userData.tl = undefined;
                    }
                });
                doorTwo.userData.tl.to(doorTwo.position, duration, {
                    x: doorTwo.userData.pos[0] + door.closedOffset,
                    ease: Sine.easeInOut,
                    onComplete: () => {
                        doors[doorID].params.open = true;
                        doorTwo.userData.tl = undefined;
                    }
                });
            }
        }
    }
}

export default DoorAnimationController;