// describes one input-configuration (mode)
import {TxtInput} from "./txtInput";


/**
 * Enum for input specification.
 * @readonly
 * @enum {string}
 */
const InputID = {
    I1: 'Input 1',
    I2: 'Input 2',
    I3: 'Input 3',
    I4: 'Input 4',
    I5: 'Input 5',
    I6: 'Input 6',
    I7: 'Input 7',
    I8: 'Input 8',
};

/**
 * Enum for input mode specification.
 * @readonly
 * @enum {string}
 */
const InputModes = {
    mode_a5k: 'Analogue resistance',
    mode_d5k: 'Digital resistance',
    mode_a10v: 'Analogue voltage',
    mode_d10v: 'Digital voltage',
    mode_ultrasonic: 'Ultrasonic',
};

/**
 * Enum for input sensor specification.
 * @readonly
 * @enum {string}
 */
const InputAnalogSensorTypes = {
    sens_color: "Colour sensor",
    sens_distance: "Distance sensor",
    sens_ntc: "NTC resistance",
    sens_photo: "Photo resistance",
};

/**
 * Enum for input sensor specification.
 * @readonly
 * @enum {string}
 */
const InputDigitalSensorTypes = {
    sens_button: "Button",
    sens_lightBarrier: "Light barrier",
    sens_reed: "Reed contact"
};

/**
 * Enum for input sensor specification.
 * @readonly
 * @enum {string}
 */
const InputDigitalSensorChangeTypes = {
    button_opens: "opens",
    button_closes: "closes"
};

class Input extends TxtInput {
    constructor() {
        super();
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

    transmitted() {
        this.mod = false;
        return this;
    }

    init() {
        this.mode = -1;
        return this;
    }

    adjustAnalogInputMode(modeName) {
        switch (modeName) {
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

    adjustDigitalInputMode(modeName) {
        switch (modeName) {
            case InputDigitalSensorTypes.sens_button:
            case InputDigitalSensorTypes.sens_lightBarrier:
            case InputDigitalSensorTypes.sens_reed:
                return this.setMode(1);
            default:
                return this.setMode(-1)
        }

    }
}

module.exports = {
    Input,
    InputID,
    InputModes,
    InputAnalogSensorTypes,
    InputDigitalSensorTypes,
    InputDigitalSensorChangeTypes,
};
