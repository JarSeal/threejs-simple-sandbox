class AppUiLayer {
    constructor(sceneState) {
        this.sceneState = sceneState;
        this.uiCanvas = document.getElementById("uiCanvas");
        this.uiContext;
        this.createNewUi = false;
        this.init();
    }

    init() {
        let ui = this.sceneState.ui;
        this.uiContext = this.uiCanvas.getContext("2d");
        this.resize();

        if(!ui.view) {
            ui.view = "combat";
            this.createNewUi = true;
            console.log('init new UI');
        }
    }

    combatView() {
        if(this.sceneState) {
            let uiData = [
                {
                    type: 'circle',
                    id: 'shootButton',
                    pos: [75, window.innerHeight - 75],
                    radius: 50,
                    state: 0,
                    firstClick: null,
                    color: function(sceneState) {
                        if(this.id == sceneState.ui.curId) {
                            if(sceneState.ui.curState == 'startClick') {
                                return 'rgba(255,255,255,1)';
                            }
                        }
                        return 'rgba(255,255,255,0.5)';
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
        this.createNewUi = true;
    }

    drawUi() {
        let view = this.sceneState.ui.view,
            ctx = this.uiContext,
            data,
            dataLength,
            i;
        switch(view) {
            case "combat":
                data = this.combatView();
                dataLength = data.length;
                ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
                for(i=0; i<dataLength; i++) {
                    if(data[i].type == 'circle') {
                        ctx.fillStyle = data[i].color(this.sceneState);
                        ctx.beginPath();
                        ctx.arc(data[i].pos[0], data[i].pos[1], data[i].radius, 0, 2 * Math.PI);
                        ctx.fill();
                        data[i].action(this.sceneState);
                        this.sceneState.ui.viewData.push(data[i]);
                    }
                }
                break;
        }
    }

    renderUi() {
        if(this.sceneState.ui.update || this.createNewUi) {
            this.sceneState.ui.viewData = [];
            this.drawUi();
            this.createNewUi = false;
            this.sceneState.ui.update = false;
        }
    }
}

export default AppUiLayer