
class DropDown {
    constructor(sceneState, key, typeOfValue, values) {
        this.sceneState = sceneState;
        this.dropDownOpen = false;
        this.key = key;
        this.typeOfValue = typeOfValue;
        this.values = values;
        this.outsideClick = (e) => {
            if(e.target && e.target.className && e.target.className != "drop-down-choice" && e.target.className != "drop-down__selected") {
                let dropDownElem = document.getElementById(this.getId());
                dropDownElem.classList.remove("drop-down--open");
                this.dropDownOpen = false;
            }
            document.body.removeEventListener('click', this.outsideClick, true);
        },
        this.dropDownClick = (e) => {
            let value = 0,
                dropDownElem = document.getElementById(this.getId());
            if(this.dropDownOpen) {
                if(e.target && e.target.className && e.target.className != "drop-down__selected") {
                    if(this.typeOfValue == "int") {
                        value = parseInt(e.target.outerText);
                    } else {
                        value = e.target.outerText;
                    }
                    dropDownElem.firstElementChild.innerHTML = value;
                    this.sceneState.settings[this.key] = value;
                    this.sceneState.localStorage.setItem(this.key, value);
                }
                dropDownElem.classList.remove("drop-down--open");
            } else {
                dropDownElem.classList.add("drop-down--open");
                document.body.addEventListener('click', this.outsideClick, true);
            }
            this.dropDownOpen = !this.dropDownOpen;
        };
    }

    getId() {
        return 'select-max-particles-' + this.key;
    }

    render() {
        let dropDown = '<div class="drop-down" id="'+this.getId()+'">'+
            '<div class="drop-down__selected">'+this.sceneState.settings[this.key]+'</div>'+
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
        dropDownElem.addEventListener("click", this.dropDownClick);
    }

    removeListeners() {
        let dropDownElem = document.getElementById(this.getId());
        dropDownElem.removeEventListener("click", this.dropDownClick);
    }
}

export default DropDown;