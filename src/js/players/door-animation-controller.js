

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
        if(openDoors.length) {
            let doors = this.sceneState.consequences.getDoors(),
                openDoorsLength = openDoors.length,
                o = 0;
            for(o=0; o<openDoorsLength; o++) {
                if(doors[openDoors[o]].params.closed || doors[openDoors[o]].params.animating) {
                    this.animateDoor(doors[openDoors[o]].params);
                }
            }
        }
    }

    animateDoor(door) {
        console.log('Animate door', door);
    }
}

export default DoorAnimationController;