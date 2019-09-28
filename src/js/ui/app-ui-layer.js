import CombatView from './views/combat-view.js';
import { calculateAngle } from '../util.js';

class AppUiLayer {
    constructor(sceneState) {
        this.sceneState = sceneState;
        this.uiCanvas = document.getElementById("uiCanvas");
        this.uiContext;
        this.ctrl = {keyDown:false,keyUp:true};
        window.addEventListener('keydown', (e) => {
            this.ctrl.keyUp = false;
            if(e.ctrlKey) {
                this.ctrl.keyDown = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            this.ctrl.keyDown = false;
            this.ctrl.keyUp = true;
        });
        this.init();
    }

    init() {
        let ui = this.sceneState.ui;
        this.uiContext = this.uiCanvas.getContext("2d");
        this.resize();

        if(!ui.view) {
            ui.view = "combat";
            ui.viewData = new CombatView(this.sceneState).getView();
            ui.update = true;
            console.log('init new UI', ui.view);
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
                        ctx.fillStyle = data[i].color(this.sceneState, this.ctrl);
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