
class CombatView {
    constructor(sceneState) {
        this.sceneState = sceneState;
    }

    getView() {
        if(this.sceneState) {
            let uiData = [
                {
                    type: 'circleButton',
                    index: 0,
                    id: 'shootButton',
                    size: 75,
                    pos: [this.size, window.innerHeight - this.size],
                    radius: 50,
                    resize: function() {
                        this.pos = [this.size, window.innerHeight - this.size];
                    },
                    keepUpdatingWhenPressed: true,
                    firstClick: null,
                    colors: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,1)'],
                    colorPhase: 0,
                    color: function(sceneState, ctrl) {
                        if(ctrl.keyDown) {
                            sceneState.ui.curState = 'startClick';
                            sceneState.ui.curId = this.id;
                            sceneState.ui.ctrl = true;
                        } else if(ctrl.keyUp && sceneState.ui.ctrl) {
                            sceneState.ui.curState = null;
                            sceneState.ui.curId = null;
                            sceneState.ui.curSecondaryState = null;
                            sceneState.ui.curSecondaryTarget = null;
                            sceneState.ui.ctrl = false;
                        }
                        // UI layer change:
                        if(this.id == sceneState.ui.curId) {
                            if(sceneState.ui.curState == 'startClick') {
                                if(sceneState.ui.viewData[this.index].colorPhase === 0) {
                                    new TimelineMax().to(sceneState.ui.viewData[this.index], 0.1, {radius:60})
                                                     .to(sceneState.ui.viewData[this.index], 0.4, {radius:50, ease: Elastic.easeOut});
                                    sceneState.ui.viewData[this.index].colorPhase = 1;
                                }
                                return this.colors[1];
                            }
                        }
                        if(sceneState.ui.viewData[this.index].colorPhase == 1) {
                            new TimelineMax().to(sceneState.ui.viewData[this.index], 0.1, {radius:40})
                                             .to(sceneState.ui.viewData[this.index], 0.4, {radius:50, ease: Elastic.easeOut});
                            sceneState.ui.viewData[this.index].colorPhase = 0;
                        }
                        return this.colors[0];
                    },
                    actionPhase: 0,
                    action: function(sceneState, calculateAngle) {
                        // 3D layer change:
                        let hero = sceneState.players.hero,
                            heroMaterial = hero.mesh.children[0].material;
                        if(this.id == sceneState.ui.curId && sceneState.ui.curState == 'startClick') {
                            if(sceneState.ui.viewData[this.index].actionPhase === 0) {
                                heroMaterial.color.setHex(0xffffff);
                                sceneState.ui.viewData[this.index].actionPhase = 1;
                            }
                            if(sceneState.ui.curSecondaryTarget) {
                                // Calculate angle for player to turn to
                                let angle = calculateAngle(hero.pos,sceneState.ui.curSecondaryTarget);
                                // prevent unnecessary spin moves :)
                                if(Math.abs(hero.mesh.rotation.z - angle) > Math.PI) {
                                    angle < 0 ? hero.mesh.rotation.z = hero.mesh.rotation.z + Math.PI * -2 :
                                                hero.mesh.rotation.z = hero.mesh.rotation.z + Math.PI * 2;
                                }
                                new TimelineMax().to(
                                    hero.mesh.rotation,
                                    0.2,
                                    {
                                        z:angle,
                                        ease: Sine.easeInOut,
                                        onComplete: () => {
                                            hero.dir = angle;
                                        }
                                    });
                                sceneState.ui.curSecondaryTarget = null;
                            }
                            return;
                        }
                        if(sceneState.ui.viewData[this.index].actionPhase == 1) {
                            heroMaterial.color.setHex(0xff0088);
                            sceneState.ui.viewData[this.index].actionPhase = 0;
                        }
                    },
                },
                {
                    type: 'logDisplay',
                    index: 0,
                    id: 'logDisplay',
                    color: 'rgba(255,255,255,0.5)',
                    width: 250,
                    height: 320,
                    padding: 20,
                    pos: [window.innerWidth - this.width, window.innerHeight - this.height],
                    resize: function() {
                        this.pos = [window.innerWidth - this.width, window.innerHeight - this.height];
                    },
                    newItemWDate: function(ctx) {
                        ctx.font = "11px Arial";
                        ctx.fillStyle = "#000";
                        ctx.fillText(
                            "Mon 12:45.23",
                            this.pos[0] + this.padding,
                            this.pos[1] + this.padding + 10
                        );
                    }
                }
            ];
            return uiData;
        }
    }
}

export default CombatView