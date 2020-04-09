class LStorage {
    constructor() {
        this.localStorageAvailable = false;
        if(this.lsTest()) {
            this.localStorageAvailable = true;
        }
    }

    getItem(key, defaultValue) {
        // defaultValue is returned (if provided) if local storage is not available or the key is not found
        if(!this.localStorageAvailable) return defaultValue || null;
        if(this.checkIfItemExists(key)) {
            return localStorage.getItem(key);
        } else {
            return defaultValue || null;
        }
    }

    checkIfItemExists(key) {
        if(!this.localStorageAvailable) return false;
        return localStorage.hasOwnProperty(key);
    }

    setItem(key, value) {
        if(!this.localStorageAvailable) return false;
        localStorage.setItem(key, value);
        return true;
    }

    removeItem(key) {
        if(!this.localStorageAvailable) return false;
        localStorage.removeItem(key);
        return true;
    }

    lsTest(){
        var test = 'testLSAvailability';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    }
}

export default LStorage;