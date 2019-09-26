import { calculateAngle } from '../util.js';

class AppUiLayer {
    constructor(sceneState) {
        this.sceneState = sceneState;
        this.uiCanvas = document.getElementById("uiCanvas");
        this.uiContext;
        this.init();
    }

    init() {
        let ui = this.sceneState.ui;
        this.uiContext = this.uiCanvas.getContext("2d");
        this.resize();

        if(!ui.view) {
            ui.view = "combat";
            ui.viewData = this.combatView();
            ui.update = true;
            console.log('init new UI');
        }
    }

    combatView() {
        if(this.sceneState) {
            let uiData = [
                {
                    type: 'circleButton',
                    index: 0,
                    id: 'shootButton',
                    pos: [75, window.innerHeight - 75],
                    radius: 50,
                    keepUpdatingWhenPressed: true,
                    firstClick: null,
                    colors: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,1)'],
                    colorPhase: 0,
                    color: function(sceneState) {
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
                            heroMaterial = hero.mesh.children[0].material,
                            angle;
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
            ];
            return uiData;
        }
    }

    resize() {
        this.uiCanvas.width = window.innerWidth;
        this.uiCanvas.height = window.innerHeight;
        this.sceneState.ui.update = true;
    }

    drawUi() {
        let view = this.sceneState.ui.view,
            ctx = this.uiContext,
            data,
            dataLength,
            i;
        switch(view) {
            case "combat":
                data = this.sceneState.ui.viewData;
                dataLength = data.length;
                ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
                for(i=0; i<dataLength; i++) {
                    if(data[i].type == 'circleButton') {
                        ctx.fillStyle = data[i].color(this.sceneState);
                        ctx.beginPath();
                        ctx.arc(data[i].pos[0], data[i].pos[1], data[i].radius, 0, 2 * Math.PI);
                        ctx.fill();
                        data[i].action(this.sceneState, calculateAngle);
                    }
                }
                break;
        }
    }

    renderUi() {
        if(this.sceneState.ui.update) {
            this.drawUi();
            if(!this.sceneState.ui.keepUpdating) {
                //this.sceneState.ui.update = false;
            }
        }
    }
}

export default AppUiLayer