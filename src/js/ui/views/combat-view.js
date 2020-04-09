import DropDown from "../form-elems/drop-down.js";
import OnOff from "../form-elems/on-off.js";

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
                                let angle = calculateAngle(hero.pos, sceneState.ui.curSecondaryTarget);
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
                    index: 1,
                    id: 'logDisplay',
                    created: false,
                    color: 'rgba(255,255,255,0.5)',
                    width: 250,
                    height: 320,
                    padding: 20,
                    showEachLogItem: 5400, // in ms
                    fadeTime: 200, // in ms
                    listParentElem: null,
                    listUlElem: null,
                    pos: [document.documentElement.clientWidth - this.width, document.documentElement.clientHeight - this.height],
                    resize: function() {
                        this.pos = [document.documentElement.clientWidth - this.width, document.documentElement.clientHeight - this.height];
                    },
                    toggleLogList: (e) => {
                        e.stopPropagation();
                        if(this.listOpen === undefined) this.listOpen = true;
                        this.listOpen = !this.listOpen;
                        if(this.listOpen) {
                            document.getElementById('log-list').classList.remove("log-list--open");
                        } else {
                            document.getElementById('log-list').classList.add("log-list--open");
                        }
                    },
                    renderLogList: function(logList) {
                        let logListLength = logList.length,
                            i = 0,
                            now = performance.now(),
                            removeThese = [];
                        if(!this.created) {
                            this.createLogList();
                            this.createSettings();
                            this.created = true;
                        }
                        for(i=0; i<logListLength; i++) {
                            if(!logList[i][4]) {
                                // New item found, recreate the list
                                logList[i].push(now);
                                logList[i].push("log-item-"+i+"-"+Math.round(now));
                                this.listUlElem.insertAdjacentHTML('afterbegin',
                                    '<li class="log-list-item" id="'+logList[i][5]+'">'+
                                        '<span class="log-list-item__type">'+logList[i][3]+'</span>'+
                                        '<span class="log-list-item__user-date">'+logList[i][1]+' - '+
                                        logList[i][0]+'</span><br>'+
                                        '<span class="log-list-item__msg">'+logList[i][2]+'</span>'+
                                    '</li>'
                                )
                            } else
                            if(logList[i][4] + this.showEachLogItem < now) {
                                let curElem = document.getElementById(logList[i][5]);
                                if(this.listUlElem && curElem) this.listUlElem.removeChild(curElem);
                                removeThese.push(i);
                            } else
                            if(logList[i][4] + (this.showEachLogItem - this.fadeTime) < now) {
                                let curElem = document.getElementById(logList[i][5]);
                                curElem.classList.add('fadeOut');
                            } else
                            if(logList[i][4] + this.fadeTime < now) {
                                let curElem = document.getElementById(logList[i][5]);
                                curElem.classList.add("fadeIn");
                            }
                        }
                        for(i=0; i<removeThese.length; i++) {
                            logList.splice(removeThese[i], 1);
                        }
                    },
                    createLogList: function() {
                        let appElem = document.getElementById("mainApp"),
                            toggleButton = document.createElement("div");
                        toggleButton.setAttribute("id", "log-list__toggle");
                        toggleButton.onclick = this.toggleLogList;
                        this.listParentElem = document.createElement('div');
                        this.listParentElem.setAttribute("id", "log-list");
                        this.listUlElem = document.createElement('ul');
                        this.listParentElem.appendChild(toggleButton);
                        this.listParentElem.appendChild(this.listUlElem);
                        appElem.appendChild(this.listParentElem);
                    },
                    toggleSettings: (e, settingsTemplate, settingsUI, resetSettings, toggleSettings) => {
                        e.stopPropagation();
                        if(this.settingsOpen === undefined) this.settingsOpen = true;
                        this.settingsOpen = !this.settingsOpen;
                        if(settingsTemplate !== undefined) {
                            settingsTemplate(settingsUI, resetSettings, toggleSettings);
                        }
                        if(this.settingsOpen) {
                            document.getElementById('settings-modal').classList.remove("settings-modal--open");
                        } else {
                            document.getElementById('settings-modal').classList.add("settings-modal--open");
                        }
                    },
                    resetSettings: (e) => {
                        let defaults = this.sceneState.defaultSettings;
                        this.sceneState.settings = Object.assign({}, defaults);
                    },
                    settingsUI: {},
                    createSettings: function() {
                        let appElem = document.getElementById("mainApp"),
                            settingsButton = document.createElement("div");
                        settingsButton.setAttribute("id", "settings-button");
                        settingsButton.onclick = (e) => {this.toggleSettings(e, this.settingsTemplate, this.settingsUI, this.resetSettings, this.toggleSettings);};
                        this.listParentElem.appendChild(settingsButton);
                        appElem.appendChild(this.listParentElem);
                        appElem.insertAdjacentHTML('afterbegin',
                            '<div id="settings-modal">'+
                                '<button id="settings-modal-close"></button>'+
                                '<div class="modal-content" id="settings-modal-content"></div>'+
                            '</div>'
                        );
                        document.getElementById("settings-modal-close").onclick = (e) => {this.toggleSettings(e, this.settingsTemplate, this.settingsUI, this.resetSettings);};
                    },
                    settingsTemplate: (settingsUI, resetSettings, toggleSettings) => {
                        let modalContent = document.getElementById("settings-modal-content");
                        let removeTemplate = () => {
                            settingsUI.maxParticles.removeListeners();
                            settingsUI.useTransparency.removeListeners();
                            settingsUI = {};
                            modalContent.innerHTML = "";
                        };
                        if(this.templateCreated === undefined) this.templateCreated = false;
                        if(this.templateCreated) {
                            removeTemplate();
                        } else {
                            // Add template
                            settingsUI.maxParticles = new DropDown(this.sceneState, "maxSimultaneousParticles", "int", [
                                {title: "20", value: 20},
                                {title: "50", value: 50},
                                {title: "200", value: 200},
                                {title: "500", value: 500},
                                {title: "1000", value: 1000},
                            ]);
                            settingsUI.useTransparency = new OnOff(this.sceneState, "useTransparency");
                            modalContent.insertAdjacentHTML('afterbegin',
                                '<ul class="settings-list">'+
                                    '<li class="sl-item">'+
                                        '<h3>Max particles:</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.maxParticles.render() +
                                        '</div>'+
                                    '</li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Use transparency:</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.useTransparency.render() +
                                        '</div>'+
                                    '</li>'+

                                    '<li class="sl-item sl-item--empty"></li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Reset to default:</h3>'+
                                        '<div class="sl-setting">'+
                                            '<button class="settings-button" id="reset-to-default">Reset</button>'+
                                        '</div>'+
                                    '</li>'+
                                '</ul>'
                            );
                            settingsUI.maxParticles.addListeners();
                            settingsUI.useTransparency.addListeners();
                            
                            document.getElementById("reset-to-default").addEventListener("click", (e) => {
                                resetSettings(e);
                                removeTemplate();
                                toggleSettings(e);
                                this.templateCreated = false;
                            });
                        }
                        this.templateCreated = !this.templateCreated;
                    },
                }
            ];
            return uiData;
        }
    }
}

export default CombatView