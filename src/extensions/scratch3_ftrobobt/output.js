import {MotorDirectionEnum} from "../scratch3_ftrobotxt/motor"

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
    constructor(id) {
        this.idx = id;
        this.mod = false;		// output was changed?
        this.value = 0;

        this.dir = MotorDirectionEnum.MOTOR_FORWARD;			// -1 (back), 0 (stop), 1 (forward)
    }

    setDirection(dir) {
        if (this.dir !== dir)
            this.mod = true;
        this.dir = dir;

        return this;
    }

    setSpeed08(val) {
        return this.setValue(val);
    }

    setLamp(val) {
        this.setValue08(val);
        if (this.dir !== MotorDirectionEnum.MOTOR_FORWARD)
            this.modified();
        this.dir = MotorDirectionEnum.MOTOR_FORWARD;

        return this;
    }


    setValue08(newValue) {
        newValue = Math.max(newValue, 0);
        newValue = Math.min(newValue, 8);

        return this.setValue(newValue)
    }

    setValue(newValue) {
        newValue = Math.max(newValue, 0);
        newValue = Math.min(newValue, 8);

        if (this.value !== newValue)
            this.modified();

        this.value = newValue;
        return this;
    }

    modified() {
        this.mod = true;
    }

    transmitted() {
        this.mod = false;
    }

    init() {
        this.value = 0;
        this.dir = MotorDirectionEnum.MOTOR_FORWARD
    }
}

module.exports = {
    Output,
    OutputID
};
