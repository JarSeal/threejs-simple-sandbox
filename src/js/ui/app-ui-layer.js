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
                    animPhase: 0,
                    keepUpdatingWhenPressed: true,
                    firstClick: null,
                    colors: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,1)'],
                    color: function(sceneState) {
                        //let tl = new TimelineMax();
                        if(this.id == sceneState.ui.curId) {
                            if(sceneState.ui.curState == 'startClick') {
                                if(sceneState.ui.viewData[this.index].animPhase === 0) {
                                    new TimelineMax().to(sceneState.ui.viewData[this.index], 0.1, {radius:60})
                                                     .to(sceneState.ui.viewData[this.index], 0.4, {radius:50, ease: Elastic.easeOut});
                                    sceneState.ui.viewData[this.index].animPhase = 1;
                                }
                                return this.colors[1];
                            }
                        }
                        if(sceneState.ui.viewData[this.index].animPhase == 1) {
                            new TimelineMax().to(sceneState.ui.viewData[this.index], 0.1, {radius:40})
                                             .to(sceneState.ui.viewData[this.index], 0.4, {radius:50, ease: Elastic.easeOut});
                            sceneState.ui.viewData[this.index].animPhase = 0;
                        }
                        return this.colors[0];
                    },
                    action: function(sceneState) {
                        let hero = sceneState.players.hero,
                            heroMaterial = hero.mesh.children[0].material;
                        if(this.id == sceneState.ui.curId) {
                            if(sceneState.ui.curState == 'startClick') {
                                heroMaterial.color.setHex(0xffffff);
                                return;
                            }
                        }
                        heroMaterial.color.setHex(0xff0088);
                    }
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
                        data[i].action(this.sceneState);
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