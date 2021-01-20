import DropDown from '../form-elems/drop-down.js';
import OnOff from '../form-elems/on-off.js';
import { TimelineMax, Elastic, Sine } from 'gsap-ssr';

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
                        this.pos = [this.size, document.getElementById('uiCanvas').height - this.size];
                        this.resizeWSceneState();
                    },
                    resizeWSceneState: () => {
                        const settingsModal = document.getElementById('settings-modal');
                        if(settingsModal) {
                            settingsModal.style.height = this.sceneState.getScreenResolution().y + 'px';
                        }
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
                                    new TimelineMax()
                                        .to(sceneState.ui.viewData[this.index], 0.1, {radius:60})
                                        .to(sceneState.ui.viewData[this.index], 0.4, {radius:50, ease: Elastic.easeOut});
                                    sceneState.ui.viewData[this.index].colorPhase = 1;
                                }
                                return this.colors[1];
                            }
                        }
                        if(sceneState.ui.viewData[this.index].colorPhase == 1) {
                            new TimelineMax()
                                .to(sceneState.ui.viewData[this.index], 0.1, {radius:40})
                                .to(sceneState.ui.viewData[this.index], 0.4, {radius:50, ease: Elastic.easeOut});
                            sceneState.ui.viewData[this.index].colorPhase = 0;
                        }
                        return this.colors[0];
                    },
                    rotatePlayerAnimation: function(sceneState, player, angle, turnTimeScale) {
                        player.rotationAnim = true;
                        player.rotationAnim = new TimelineMax().to(
                            player.mesh.rotation,
                            turnTimeScale,
                            {
                                z: angle,
                                ease: Sine.easeInOut,
                                onComplete: () => {
                                    player.dir = angle;
                                    player.rotationAnim = false;
                                    if(player.curRotationAnim && player.rotationAnims[player.curRotationAnim]) {
                                        player.rotationAnims[player.curRotationAnim].done = true;
                                        let keys = Object.keys(player.rotationAnims);
                                        if(keys.length) {
                                            keys.sort();
                                            for(let i=0; i<keys.length; i++) {
                                                let difference = 0, prevTime;
                                                if(i !== 0) {
                                                    prevTime = player.rotationAnims[keys[i-1]].clickTime;
                                                    difference = player.rotationAnims[keys[i]].clickTime - prevTime;
                                                }
                                                if(!player.rotationAnims[keys[i]].done) {
                                                    player.curRotationAnim = keys[i];
                                                    player.rotationAnims[keys[i]].waitTime = difference;
                                                    sceneState.ui.curSecondaryTarget = player.rotationAnims[keys[i]].target;
                                                    break;
                                                }
                                            }
                                        }
                                    } else {
                                        // Brutal reset in case of trouble
                                        player.rotationAnims = {};
                                    }
                                }
                            }
                        );
                        sceneState.ui.curSecondaryTarget = null;
                    },
                    actionPhase: 0,
                    action: function(sceneState, calculateAngle) {
                        if(!sceneState.players.hero || !sceneState.players.hero.mesh || !sceneState.players.hero.mesh.children || !sceneState.players.hero.mesh.children.length) return;
                        // 3D layer change:
                        let hero;
                        if(this.id == sceneState.ui.curId && sceneState.ui.curState == 'startClick') {
                            hero = sceneState.players.hero;
                            if(sceneState.ui.viewData[this.index].actionPhase === 0) {
                                if(hero.animTimeline._active) {
                                    hero.animTimeline.kill();
                                    hero.animTimeline = new TimelineMax();
                                }
                                hero.isAiming = true;
                                hero.aimingStarted = performance.now();
                                const fadeTime = 0.2;
                                if(sceneState.players.hero.anims.idle.isRunning()) {
                                    const from = sceneState.players.hero.anims.idle;
                                    let to = sceneState.players.hero.anims.aim,
                                        from2;
                                    if (sceneState.players.hero.anims.walk.weight > 0 &&
                                        !sceneState.players.hero.movingInLastTile) {
                                        to = sceneState.players.hero.anims.walkAndAim;
                                        from2 = sceneState.players.hero.anims.walk;
                                        from2.weight = 0;
                                    } else {
                                        if(sceneState.players.hero.movingInLastTile) {
                                            sceneState.players.hero.anims.walk.weight = 0;
                                            sceneState.players.hero.anims.walk.stop();
                                            sceneState.players.hero.anims.walkAndAim.weight = 0;
                                            sceneState.players.hero.anims.walkAndAim.stop();
                                        }
                                        to.play();
                                    }
                                    hero.animTimeline.to(to, fadeTime, {
                                        weight: 1,
                                        ease: Sine.easeInOut,
                                        onUpdate: () => {
                                            from.weight = 1 - to.weight;
                                            if(from2) {
                                                from2.weight = 0;
                                            }
                                        },
                                        onComplete: () => {
                                            from.weight = 0;
                                            from.stop();
                                            if(from2) {
                                                from2.weight = 0;
                                            }
                                        }
                                    });
                                } else if(sceneState.players.hero.anims.walk.isRunning()) {
                                    const from = sceneState.players.hero.anims.walk,
                                        to = sceneState.players.hero.anims.walkAndAim;
                                    hero.animTimeline.to(to, fadeTime, {
                                        weight: 1,
                                        ease: Sine.easeInOut,
                                        onUpdate: () => {
                                            from.weight = 1 - to.weight;
                                        },
                                        onComplete: () => {
                                            from.weight = 0;
                                        }
                                    });
                                }
                                sceneState.ui.viewData[this.index].actionPhase = 1;
                            }
                            if(sceneState.ui.curSecondaryTarget) {
                                // Calculate angle for player to turn to
                                const angle = calculateAngle(hero.pos, sceneState.ui.curSecondaryTarget),
                                    curAngle = hero.mesh.rotation.z;
                                // prevent unnecessary spin moves :)
                                let difference, newExessiveAngle, exessDiff, normalDiff,
                                    turnAmount = curAngle > angle ? curAngle - angle : angle - curAngle;
                                if(angle < 0 && curAngle > 0) {
                                    difference = Math.PI - curAngle;
                                    newExessiveAngle = -Math.PI - difference;
                                    exessDiff = Math.abs(newExessiveAngle - angle);
                                    normalDiff = Math.abs(curAngle - angle);
                                    if(exessDiff < normalDiff) {
                                        hero.mesh.rotation.z = newExessiveAngle;
                                        turnAmount = exessDiff;
                                    } else {
                                        turnAmount = normalDiff;
                                    }
                                }
                                if(angle > 0 && curAngle < 0) {
                                    difference = Math.PI - Math.abs(curAngle);
                                    newExessiveAngle = difference + Math.PI;
                                    exessDiff = Math.abs(newExessiveAngle - angle);
                                    normalDiff = Math.abs(curAngle - angle);
                                    if(exessDiff < normalDiff) {
                                        hero.mesh.rotation.z = newExessiveAngle;
                                        turnAmount = exessDiff;
                                    } else {
                                        turnAmount = normalDiff;
                                    }
                                }
                                if(hero.moving && turnAmount > Math.PI / 2) {
                                    // Make the hero walk backwards
                                    console.log('backwards walk', hero.dir);
                                    hero.moveBackwards = true;
                                } else if(hero.moving) {
                                    // Continue with hero movement
                                    console.log('frontwards walk', hero.dir);
                                    hero.moveBackwards = false;
                                } else {
                                    hero.moveBackwards = false;
                                }
                                const turnTimeScale = turnAmount / Math.PI * 0.2;
                                hero.rotationTime = turnTimeScale;
                                if(hero.rotationAnims[hero.curRotationAnim]) {
                                    const waitTime = hero.rotationAnims[hero.curRotationAnim].waitTime / 1000;
                                    hero.rotationAnims[hero.curRotationAnim].waitTime = turnTimeScale < waitTime ? waitTime - turnTimeScale : waitTime;
                                }
                                this.rotatePlayerAnimation(sceneState, hero, angle, turnTimeScale);
                            }
                            return;
                        }
                        if(sceneState.ui.viewData[this.index].actionPhase == 1) {
                            hero = sceneState.players.hero;
                            hero.isAiming = false;
                            hero.aimingStarted = 0;
                            const fadeTime = 0.3;
                            let from, from2, to;
                            if(hero.moving) {
                                to = hero.anims.walk;
                                to.weight = 0;
                            } else {
                                to = hero.anims.idle;
                                to.weight = 0;
                                hero.anims.walk.weight = 0;
                                hero.anims.walk.stop();
                            }
                            to.play();
                            if(hero.animTimeline._active) {
                                hero.animTimeline.kill();
                                hero.animTimeline = new TimelineMax();
                            }
                            if(hero.anims.walkAndAim.weight > 0) {
                                from = hero.anims.walkAndAim;
                                from2 = hero.anims.aim;
                                if(from.weight < 1) {
                                    to = hero.anims.idle;
                                    to.play();
                                } else {
                                    to = hero.anims.walk;
                                }
                                hero.animTimeline.to(to, fadeTime, {
                                    weight: 1,
                                    ease: Sine.easeInOut,
                                    onUpdate: () => {
                                        from.weight = 1 - to.weight;
                                        if(from2.weight > 0) {
                                            from2.weight = from.weight;
                                        }
                                    },
                                    onComplete: () => {
                                        from.weight = 0;
                                        from2.weight = 0;
                                        from2.stop();
                                        if(hero.anims.idle.isRunning()) {
                                            hero.anims.walk.stop();
                                            hero.anims.walkAndAim.stop();
                                        }
                                    }
                                });
                            } else {
                                from = hero.anims.aim;
                                hero.animTimeline.to(to, fadeTime, {
                                    weight: 1,
                                    ease: Sine.easeInOut,
                                    onUpdate: () => {
                                        from.weight = 1 - to.weight;
                                    },
                                    onComplete: () => {
                                        from.weight = 0;
                                        from.stop();
                                    }
                                });
                            }

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
                            document.getElementById('log-list').classList.remove('log-list--open');
                        } else {
                            document.getElementById('log-list').classList.add('log-list--open');
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
                                logList[i].push('log-item-'+i+'-'+Math.round(now));
                                this.listUlElem.insertAdjacentHTML('afterbegin',
                                    '<li class="log-list-item" id="'+logList[i][5]+'">'+
                                        '<span class="log-list-item__type">'+logList[i][3]+'</span>'+
                                        '<span class="log-list-item__user-date">'+logList[i][1]+' - '+
                                        logList[i][0]+'</span><br>'+
                                        '<span class="log-list-item__msg">'+logList[i][2]+'</span>'+
                                    '</li>'
                                );
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
                                curElem.classList.add('fadeIn');
                            }
                        }
                        for(i=0; i<removeThese.length; i++) {
                            logList.splice(removeThese[i], 1);
                        }
                    },
                    createLogList: function() {
                        const appElem = document.getElementById('mainApp'),
                            toggleButton = document.createElement('div');
                        toggleButton.setAttribute('id', 'log-list__toggle');
                        toggleButton.onclick = this.toggleLogList;
                        this.listParentElem = document.createElement('div');
                        this.listParentElem.setAttribute('id', 'log-list');
                        this.listUlElem = document.createElement('ul');
                        this.listParentElem.appendChild(toggleButton);
                        this.listParentElem.appendChild(this.listUlElem);
                        appElem.appendChild(this.listParentElem);
                    },
                    toggleSettings: (e, settingsTemplate, settingsUI, resetSettings, toggleSettings, toggleLogList) => {
                        e.stopPropagation();
                        document.getElementById('settings-modal').style.height = this.sceneState.getScreenResolution().y + 'px';
                        if(this.settingsOpen === undefined) this.settingsOpen = true;
                        this.settingsOpen = !this.settingsOpen;
                        if(settingsTemplate !== undefined) {
                            settingsTemplate(settingsUI, resetSettings, toggleSettings);
                        }
                        if(this.settingsOpen) {
                            document.getElementById('settings-modal').classList.remove('settings-modal--open');
                        } else {
                            document.getElementById('settings-modal').classList.add('settings-modal--open');
                        }
                        if(toggleLogList) toggleLogList(e);
                    },
                    resetSettings: () => {
                        const defaults = this.sceneState.defaultSettings;
                        this.sceneState.settings = Object.assign({}, defaults);
                        for (var key in defaults) {
                            this.sceneState.localStorage.removeItem(key);
                        }
                    },
                    settingsUI: {},
                    createSettings: function() {
                        let appElem = document.getElementById('mainApp'),
                            settingsButton = document.createElement('div');
                        settingsButton.setAttribute('id', 'settings-button');
                        settingsButton.onclick = (e) => {this.toggleSettings(e, this.settingsTemplate, this.settingsUI, this.resetSettings, this.toggleSettings, this.toggleLogList);};
                        this.listParentElem.appendChild(settingsButton);
                        appElem.appendChild(this.listParentElem);
                        appElem.insertAdjacentHTML('afterbegin',
                            '<div id="settings-modal">'+
                                '<button id="settings-modal-close"></button>'+
                                '<div class="settings-modal-scroller">'+
                                    '<div class="modal-content" id="settings-modal-content"></div>'+
                                '</div>'+
                            '</div>'
                        );
                        document.getElementById('settings-modal-close').onclick = (e) => {this.toggleSettings(e, this.settingsTemplate, this.settingsUI, this.resetSettings);};
                    },
                    settingsTemplate: (settingsUI, resetSettings, toggleSettings) => {
                        let modalContent = document.getElementById('settings-modal-content');
                        let removeTemplate = () => {
                            settingsUI.soundFxOn.removeListeners();
                            settingsUI.useRendererAntialiasing.removeListeners();
                            settingsUI.useSmaa.removeListeners();
                            settingsUI.useUnrealBloom.removeListeners();
                            settingsUI.rendererPixelRatio.removeListeners();
                            settingsUI.debugStatsMode.removeListeners();
                            settingsUI = {};
                            modalContent.innerHTML = '';
                        };
                        if(this.templateCreated === undefined) this.templateCreated = false;
                        if(this.templateCreated) {
                            removeTemplate();
                        } else {
                            // Add template
                            settingsUI.soundFxOn = new OnOff(this.sceneState, 'soundFxOn', true);
                            settingsUI.useRendererAntialiasing = new OnOff(this.sceneState, 'useRendererAntialiasing', true);
                            settingsUI.usePostProcessing = new OnOff(this.sceneState, 'usePostProcessing');
                            settingsUI.useSmaa = new OnOff(this.sceneState, 'useSmaa', true);
                            settingsUI.useUnrealBloom = new OnOff(this.sceneState, 'useUnrealBloom', true);
                            settingsUI.rendererPixelRatio = new DropDown(this.sceneState, 'rendererPixelRatio', 'float', [
                                {title: '1', value: 1},
                                {title: '1.5', value: 1.5},
                                {title: '2', value: 2},
                                {title: '2.5', value: 2.5},
                                {title: '3', value: 3},
                                {title: '3.5', value: 3.5},
                                {title: '4', value: 4},
                                {title: '4.5', value: 4.5},
                                {title: '5', value: 5},
                                {title: 'device val', value: window.devicePixelRatio || 1},
                            ], true);
                            settingsUI.debugStatsMode = new DropDown(this.sceneState, 'debugStatsMode', 'int', [
                                {title: 'Do not show', value: -1},
                                {title: 'FPS', value: 0},
                                {title: 'MSPF', value: 1},
                                {title: 'Memory usage', value: 2},
                            ], true);
                            modalContent.insertAdjacentHTML('afterbegin',
                                '<ul class="settings-list">'+
                                    '<li class="sl-item">'+
                                        '<h3>Sound FX on:</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.soundFxOn.render() +
                                        '</div>'+
                                    '</li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Use renderer antialiasing (post processing must be turned off to have any effect, will reload app):</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.useRendererAntialiasing.render() +
                                        '</div>'+
                                    '</li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Use post processing (if on, turn off renderer antialiasing):</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.usePostProcessing.render() +
                                        '</div>'+
                                    '</li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Use post processing SMAA antialiasing (post processing must be turned on):</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.useSmaa.render() +
                                        '</div>'+
                                    '</li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Use post processing bloom (post processing must be turned on):</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.useUnrealBloom.render() +
                                        '</div>'+
                                    '</li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Renderer / composer pixel ratio (current device pixel ratio: ' +
                                        (window.devicePixelRatio || 'unknown') + '):</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.rendererPixelRatio.render() +
                                        '</div>'+
                                    '</li>'+
                                    '<li class="sl-item">'+
                                        '<h3>Performance statistics default mode (hint: click on stats to change mode):</h3>'+
                                        '<div class="sl-setting">'+
                                            settingsUI.debugStatsMode.render() +
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
                            settingsUI.soundFxOn.addListeners();
                            settingsUI.useRendererAntialiasing.addListeners();
                            settingsUI.usePostProcessing.addListeners();
                            settingsUI.useSmaa.addListeners();
                            settingsUI.useUnrealBloom.addListeners();
                            settingsUI.rendererPixelRatio.addListeners();
                            settingsUI.debugStatsMode.addListeners();
                            
                            document.getElementById('reset-to-default').addEventListener('click', (e) => {
                                resetSettings(e);
                                removeTemplate();
                                toggleSettings(e);
                                this.templateCreated = false;
                                this.sceneState.updateSettingsNextRender = true;
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

export default CombatView;