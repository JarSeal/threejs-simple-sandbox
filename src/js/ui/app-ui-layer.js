

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

    resize() {
        this.uiCanvas.width = window.innerWidth;
        this.uiCanvas.height = window.innerHeight;
        this.createNewUi = true;
    }

    createUi() {
        let view = this.sceneState.ui.view;
        let ctx = this.uiContext;
        switch(view) {
            case "combat":
                console.log('test**************************************************');
                ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(75, window.innerHeight - 75, 50, 0, 2 * Math.PI);
                ctx.fill();
                break;
        }
    }

    renderUi() {
        if(this.createNewUi) {
            this.createUi();
            this.createNewUi = false;
        }
    }
}

export default AppUiLayer