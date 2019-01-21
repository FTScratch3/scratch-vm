export class TxtInput {
    constructor() {
        this._value = 0;
        this._oldValue = 0;
    }

    setNewValue(value) {
        this._oldValue = this._value;
        this._value = value;
    }

    get value() {
        return this._value;
    }

    get oldValue() {
        return this._oldValue;
    }
}

