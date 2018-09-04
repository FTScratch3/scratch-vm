/**
 * Enum for output specification.
 * @readonly
 * @enum {string}
 */
const OutputID = {
    O1: 0,
    O2: 1,
    O3: 2,
    O4: 3,
    O5: 4,
    O6: 5,
    O7: 6,
    O8: 7,
};


// describes one output (value)
class Output {
    constructor() {
        this.mod = false;		// output was changed?
        this.val = 0;
    }

    setValue08(newValue) {
        newValue = Math.max(newValue, 0);
        newValue = Math.min(newValue, 8);

        return this.setValue(newValue * 100 / 8)
    }

    setValue(newValue) {
        newValue = Math.max(newValue, 0);
        newValue = Math.min(newValue, 100);

        if (this.val !== newValue)
            this.modified();

        this.val = newValue;
        return this;
    }

    modified() {
        this.mod = true;
    }

    transmitted() {
        this.mod = false;
    }

    init() {
        this.val = 0;
    }
}

module.exports = {
    Output,
    OutputID
};
