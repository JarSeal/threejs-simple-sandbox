

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
        let uiData = {
            type: 'circle',
            id: 'shootButton',
            pos: [75, window.innerHeight - 75],
            radius: 50,
            state: 0,
            firstClick: null,
            action: null,
        };
        return uiData;
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
            startAngle = 0,
            endAngle = 0;
        switch(view) {
            case "combat":
                data = this.combatView();
                startAngle = 0;
                endAngle = 2 * Math.PI;
                ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
                ctx.fillStyle = "rgba(255,255,255,0.5)";
                ctx.opacity = 0.5;
                ctx.beginPath();
                ctx.arc(data.pos[0], data.pos[1], data.radius, startAngle, endAngle);
                ctx.fill();
                this.sceneState.ui.viewData.push(data);
                break;
        }
    }

    renderUi() {
        if(this.createNewUi || this.sceneState.ui.update) {
            this.drawUi();
            this.createNewUi = false;
            this.sceneState.ui.update = false;
        }
    }
}

export default AppUiLayer