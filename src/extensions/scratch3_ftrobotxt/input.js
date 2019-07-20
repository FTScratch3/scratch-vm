// describes one input-configuration (mode)
import {TxtInput} from "./txtInput";


/**
 * Enum for input specification.
 * @readonly
 * @enum {string}
 */
export const InputID = {
    I1: 0,
    I2: 1,
    I3: 2,
    I4: 3,
    I5: 4,
    I6: 5,
    I7: 6,
    I8: 7,
};

/**
 * Enum for input mode specification.
 * @readonly
 * @enum {string}
 */
export const InputModes = {
    mode_d10v: 0,
    mode_d5k: 1,
    mode_a10v: 2,
    mode_a5k: 3,
    mode_ultrasonic: 4,
};

/**
 * Enum for input sensor specification.
 * @readonly
 * @enum {string}
 */
export const InputAnalogSensorTypes = {
    sens_color: 0,
    sens_distance: 1,
    sens_ntc: 2,
    sens_photo: 3,
};

/**
 * Enum for input sensor specification.
 * @readonly
 * @enum {string}
 */
export const InputDigitalSensorTypes = {
    sens_button: 0,
    sens_lightBarrier: 1,
    sens_reed: 2,
    sens_trail: 3,
};

/**
 * Enum for input sensor specification.
 * @readonly
 * @enum {string}
 */
export const InputDigitalSensorChangeTypes = {
    button_opens: 0,
    button_closes: 1
};

export class Input extends TxtInput {
    constructor(id) {
        super();
        this.idx = id;
        this.mod = false;		// input was changed?
        this.mode = -1;			// start with "unknown"
    }

    setMode(newMode) {
        const changed = this.mode !== newMode;
        this.mode = newMode;
        if (changed) {
            this.mod = true;
        }
        return this;
    }

    reset() {
        this._value = 0;
        this._oldValue = 0;
        this.mode = InputModes.mode_a5k;
        this.mod = true;

        return this;
    }

    transmitted() {
        this.mod = false;
        return this;
    }

    init() {
        this.mode = -1;
        return this;
    }

    adjustAnalogInputMode(modeId) {
        switch (modeId) {
            case InputAnalogSensorTypes.sens_color:
                return this.setMode(2);
            case InputAnalogSensorTypes.sens_ntc:
            case InputAnalogSensorTypes.sens_photo:
                return this.setMode(3);
            case InputAnalogSensorTypes.sens_distance:
                return this.setMode(4);
            default:
                return this.setMode(-1)
        }
    }

    adjustDigitalInputMode(modeId) {
        switch (modeId) {
            case InputDigitalSensorTypes.sens_button:
            case InputDigitalSensorTypes.sens_lightBarrier:
            case InputDigitalSensorTypes.sens_reed:
            case InputDigitalSensorTypes.sens_trail:
                return this.setMode(1);
            default:
                return this.setMode(-1)
        }

    }
}

