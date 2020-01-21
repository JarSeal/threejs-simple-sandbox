
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
                }
            ];
            return uiData;
        }
    }
}

export default CombatView