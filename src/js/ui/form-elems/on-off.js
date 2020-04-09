
class OnOff {
    constructor(sceneState, key) {
        this.sceneState = sceneState;
        this.key = key;
        this.isOn = sceneState.settings[this.key];
        this.switch = (e) => {
            let curElem = document.getElementById(this.getId());
            if(this.isOn) {
                curElem.classList.remove('on-off--on');
            } else {
                curElem.classList.add('on-off--on');
            }
            this.isOn = !this.isOn;
            this.sceneState.settings[this.key] = this.isOn;
            this.sceneState.localStorage.setItem(this.key, this.isOn);
        };
    }

    getId() {
        return 'on-off-' + this.key;
    }

    render() {
        return '<div class="on-off'+(this.isOn ? ' on-off--on' : '')+'" id="'+this.getId()+'">'+
            '<div class="on-off__sled"></div>'+
        '</div>';
    }

    addListeners() {
        let onOffElem = document.getElementById(this.getId());
        onOffElem.addEventListener("click", this.switch);
    }

    removeListeners() {
        let onOffElem = document.getElementById(this.getId());
        onOffElem.removeEventListener("click", this.switch);
    }
}

export default OnOff;