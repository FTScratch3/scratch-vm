/**
 * Enum for output specification.
 * @readonly
 * @enum {string}
 */
const OutputID = {
    O1: 'Output 1',
    O2: 'Output 2',
    O3: 'Output 3',
    O4: 'Output 4',
    O5: 'Output 5',
    O6: 'Output 6',
    O7: 'Output 7',
    O8: 'Output 8',
};
/**
 * Enum for lamp specification.
 * @readonly
 * @enum {string}
 */
const LampID = {
    L1: 'Lamp 1',
    L2: 'Lamp 2',
    L3: 'Lamp 3',
    L4: 'Lamp 4',
    L5: 'Lamp 5',
    L6: 'Lamp 6',
    L7: 'Lamp 7',
    L8: 'Lamp 8',
};

// describes one output (value)
class Output {
    constructor() {
        this.mod = false;		// output was changed?
        this.val = 0;
    }

    setValue(newValue) {
        this.val = newValue;
        this.modified();
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
    OutputID,
    LampID
};
