
class DropDown {
    constructor(sceneState, key, typeOfValue, values, updateSettings) {
        this.sceneState = sceneState;
        this.dropDownOpen = false;
        this.key = key;
        this.typeOfValue = typeOfValue;
        this.values = values;
        this.updateSettings = updateSettings;
        this.outsideClick = (e) => {
            if(e.target && e.target.className && e.target.className != 'drop-down-choice' && e.target.className != 'drop-down__selected') {
                let dropDownElem = document.getElementById(this.getId());
                dropDownElem.classList.remove('drop-down--open');
                this.dropDownOpen = false;
            }
            document.body.removeEventListener('click', this.outsideClick, true);
        },
        this.dropDownClick = (e) => {
            let value = 0,
                dropDownElem = document.getElementById(this.getId());
            if(this.dropDownOpen) {
                if(e.target && e.target.className && e.target.className != 'drop-down__selected') {
                    if(this.typeOfValue == 'int') {
                        value = parseInt(e.target.getAttribute('value'));
                    } else if(this.typeOfValue == 'float') {
                        value = parseFloat(e.target.getAttribute('value'));
                    } else {
                        value = e.target.getAttribute('value');
                    }
                    dropDownElem.firstElementChild.innerHTML = e.target.outerText;
                    this.sceneState.settings[this.key] = value;
                    this.sceneState.localStorage.setItem(this.key, value);
                }
                dropDownElem.classList.remove('drop-down--open');
            } else {
                dropDownElem.classList.add('drop-down--open');
                document.body.addEventListener('click', this.outsideClick, true);
            }
            this.dropDownOpen = !this.dropDownOpen;
            if(this.updateSettings) {
                this.sceneState.updateSettingsNextRender = true;
            }
        };
    }

    getId() {
        return 'drop-down-' + this.key;
    }

    render() {
        let dropDown = '<div class="drop-down" id="'+this.getId()+'">'+
            '<div class="drop-down__selected">'+
                this.values.filter(v => v.value.toString() === this.sceneState.settings[this.key].toString())[0].title
            +'</div>'+
            '<ul class="drop-down__ul">';
        for(let i=0; i<this.values.length; i++) {
            dropDown += '<li class="drop-down-choice" value="'+this.values[i].value+'">'+this.values[i].title+'</li>';
        }
        dropDown += '</ul>'+
        '</div>';
        return dropDown;
    }

    addListeners() {
        let dropDownElem = document.getElementById(this.getId());
        dropDownElem.addEventListener('click', this.dropDownClick);
    }

    removeListeners() {
        let dropDownElem = document.getElementById(this.getId());
        dropDownElem.removeEventListener('click', this.dropDownClick);
    }
}

export default DropDown;