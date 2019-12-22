import CombatView from './views/combat-view.js';
import { calculateAngle } from '../util.js';

class AppUiLayer {
    constructor(sceneState) {
        this.logs = [];
        this.sceneState = sceneState;
        this.uiCanvas = document.getElementById("uiCanvas");
        this.logList = [[
            sceneState.initTime.ms,
            "[SYSTEM]",
            "START of logging!",
            "S"
        ]];
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

        if(!ui.view) {
            ui.view = "combat";
            ui.viewData = new CombatView(this.sceneState).getView();
        }
        this.resize();
    }

    resize() {
        this.uiCanvas.width = document.documentElement.clientWidth;
        this.uiCanvas.height = document.documentElement.clientHeight;
        let data = this.sceneState.ui.viewData,
            dataLength = data.length,
            i;
        for(i=0; i<dataLength; i++) {
            data[i].resize();
        }
        this.sceneState.ui.update = true;
    }

    drawUi() {
        let view = this.sceneState.ui.view,
            ctx = this.uiContext,
            data,
            dataLength,
            i;
        ctx.clearRect(0,0,document.documentElement.clientWidth, document.documentElement.clientHeight);
        if(this.sceneState.ui.viewLoading) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.rect(document.documentElement.clientWidth - 90, 40, 50, 50);
            ctx.fill();
        }
        switch(view) {
            case "combat":
                data = this.sceneState.ui.viewData;
                dataLength = data.length;
                for(i=0; i<dataLength; i++) {
                    if(data[i].type == 'circleButton') {
                        ctx.fillStyle = data[i].color(this.sceneState, this.ctrl);
                        ctx.beginPath();
                        ctx.arc(data[i].pos[0], data[i].pos[1], data[i].radius, 0, 2 * Math.PI);
                        ctx.fill();
                        data[i].action(this.sceneState, calculateAngle);
                    } else
                    if(data[i].type == 'logDisplay') {
                        data[i].renderLogList(this.logList);
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

    logMessage(when, who, what, type) {
        when = Math.round((when - this.sceneState.initTime.ms) / 1000) + "s"; // Temp solution
        this.logList.unshift([
            when, who, what, type
        ]);
    }
}

export default AppUiLayer