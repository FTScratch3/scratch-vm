const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const log = require('../../util/log');
const cast = require('../../util/cast');
const BLESession = require('../../io/bleSession');
const Base64Util = require('../../util/base64-util');
// describes one motor (speed, direction, distance, sync)
import {ftxtSession} from "../../io/ftxtSession";
import {Motor, MotorDirectionEnum, MotorSyncEnum} from "./motor";

// TODO: Stop motor on program abort!!

class TxtInput {
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

// describes one input-configuration (mode)
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


// describes one counter-configuration
class Counter extends TxtInput {
    constructor() {
        super();

        this.mod = false;
        this.rst = false;
    }

    doReset() {
        this.rst = true;
        this.mod = true;
    }

    transmitted() {
        this.mod = false;
    }

    init() {
        this.rst = false;
    }
}


/**
 * Manage communication with a WeDo 2.0 device over a Device Manager client socket.
 */
class TxtController {

    /**
     * @return {string} - the type of Device Manager device socket that this class will handle.
     */
    static get DEVICE_TYPE() {
        return 'txt';
    }

    /**
     * Construct a WeDo2 communication object.
     * @param runtime
     */
    constructor(runtime) {
        /**
         * The socket-IO socket used to communicate with the Device Manager about this device.
         * @type {ftxtSession}
         * @private
         */
        this._runtime = runtime;
        this._socket = new ftxtSession(this._runtime,
            () => this._onSessionConnect(),
            message => this.onSensData(message),
            () => this.onSoundDone()
        );

        /**
         * Callbacks used to wait for motor input
         * @type {Array}
         * @private
         */
        this._motorWaitCallbacks = [];
        this._soundCallback = null;

        this.motors = [
            new Motor(0), new Motor(1), new Motor(2), new Motor(3),
        ];
        this.outputs = [
            new Output(0), new Output(1), new Output(2), new Output(3),
            new Output(4), new Output(5), new Output(6), new Output(7),
        ];
        this.inputs = [
            new Input(0), new Input(1), new Input(2), new Input(3),
            new Input(4), new Input(5), new Input(6), new Input(7),
        ];

        this.counters = [
            new Counter(0), new Counter(1), new Counter(2), new Counter(3)
        ];
    }


    checkIfUpdateIsNeeded() {
        let needsUpdate = false;

        for (let motor of this.motors) needsUpdate |= motor.mod;
        for (let output of this.outputs) needsUpdate |= output.mod;
        for (let input of this.inputs) needsUpdate |= input.mod;
        for (let counter of this.counters) needsUpdate |= counter.mod;

        return needsUpdate;
    }

    sendUpdateIfNeeded() {
        if (this.checkIfUpdateIsNeeded()) {
            this._socket.sendJsonMessage("ACTU", {
                motors: this.motors,
                outputs: this.outputs,
                inputs: this.inputs,
                counters: this.counters
            });

            // Reset "mod" state
            for (let motor of this.motors) motor.transmitted();
            for (let input of this.inputs) input.transmitted();
            for (let output of this.outputs) output.transmitted();
            for (let counter of this.counters) counter.transmitted();
        }
    }

    checkCallbacks() {
        for (let idx in this._motorWaitCallbacks) {
            let func = this._motorWaitCallbacks[idx];
            if (func()) {
                // remove the entry
                this._motorWaitCallbacks.splice(idx, 1);
            }
        }
    }

    // events

    onSensData(message) {
        for (let n = 0; n < 8; n++) {
            this.inputs[n].setNewValue(message.inputs[n]);
        }
        for (let n = 0; n < 4; n++) {
            this.counters[n].setNewValue(message.counters[n]);
        }

        this.onNewData();
    }

    onSoundDone() {
        if (this._soundCallback) {
            this._soundCallback();
            this._soundCallback = null;
        }
    }

    onNewData() {
        this.checkCallbacks();
    }

    /**
     * Starts reading data from device after BLE has connected to it.
     */
    _onSessionConnect() { // TODO Remove or use
        //const callback = this._processSessionData.bind(this);
        //this._ble.read(BLEUUID.service, BLEUUID.rxChar, true, callback);
        //this._timeoutID = window.setInterval(this.disconnectSession.bind(this), BLETimeout);
    }

    // Status

    isDeviceConnected() {
        this._socket.connectedToDevice();
    }

    // Getter

    getModeIdByName(modeName) {
        switch (modeName) {
            case InputModes.mode_d10v:
                return 0;
            case InputModes.mode_d5k:
                return 1;
            case InputModes.mode_a10v:
                return 2;
            case InputModes.mode_a5k:
                return 3;
            case InputModes.mode_ultrasonic:
                return 4;
            default:
                return -1;
        }
    }

    getDirectionByName(directionName) {
        return directionName === "FORWARD" ? MotorDirectionEnum.MOTOR_FORWARD : MotorDirectionEnum.MOTOR_BACKWARDS;
    }

    /**
     * @param {string} counterName
     * @returns {number}
     */
    getCounterIdByName(counterName) {
        return counterName[8] - 1;
    }

    /**
     * @param {number} id
     * @returns {Counter|null}
     */
    getCounterById(id) {
        if (id < 0 || id > 3)
            return null;
        return this.counters[id];
    }

    /**
     * @param {string|any} counterName
     * @returns {Counter|null}
     */
    getCounterByName(counterName) {
        return this.getCounterById(this.getCounterIdByName(counterName));
    }

    /**
     * @param {string} inputName
     * @returns {number}
     */
    getInputIdByName(inputName) {
        return inputName[6] - 1;
    }

    /**
     * @param {number} id
     * @returns {Input|null}
     */
    getInputById(id) {
        if (id < 0 || id > 3)
            return null;
        return this.inputs[id];
    }

    /**
     * @param {string|any} inputName
     * @returns {Input|null}
     */
    getInputByName(inputName) {
        return this.getInputById(this.getInputIdByName(inputName));
    }

    /**
     * @param {string} motorName
     * @returns {number}
     */
    getMotorIdByName(motorName) {
        return motorName[6] - 1;
    }

    /**
     * @param {number} id
     * @returns {Motor|null}
     */
    getMotorById(id) {
        if (id < 0 || id > 3)
            return null;
        return this.motors[id];
    }

    waitForMotorCallback(motorId, steps) {
        return new Promise(resolve => {
            let check = () => {
                if (this.counters[motorId].value >= steps) {
                    resolve();
                    return true;
                }
                return false;
            };
            this._motorWaitCallbacks.push(check);
        });
    }

    /**
     * @param {string} motorName
     * @returns {Motor|null}
     */
    getMotorByName(motorName) {
        return this.getMotorById(this.getMotorIdByName(motorName));
    }

    doPlaySound(soundID) {
        this._socket.sendJsonMessage("PLAY", {idx: soundID});
    }

    doPlaySoundAndWait(soundID) {
        return new Promise(resolve => {
            if (this._soundCallback !== null) {
                resolve();
                return;
            }
            this._soundCallback = () => {
                this._soundCallback = null;
                resolve();
            };
            this._socket.sendJsonMessage("PLAY", {idx: soundID});
        });
    }

    setMotorSync(motor1name, motor2name) {
        let otherMotorId = this.getMotorIdByName(motor2name);
        this.getMotorByName(motor1name).setSync(otherMotorId);
    }

    setMotorSyncNone(motorName) {
        this.getMotorByName(motorName).resetSync();
    }

    doSetMotorSpeed(motorName, speed) {
        this.getMotorByName(motorName)
            .setSpeed(speed);
        this.sendUpdateIfNeeded();
    }

    doSetMotorSpeedDir(motorName, speed, directionName) {
        this.getMotorByName(motorName)
            .setDirection(this.getDirectionByName(directionName))
            .setSpeed(speed);
        this.sendUpdateIfNeeded();
    }

    doSetMotorDir(motorName, directionName) {
        this.getMotorByName(motorName)
            .setDirection(this.getDirectionByName(directionName));
        this.sendUpdateIfNeeded();
    }

    // Methods for blocks
    doSetMotorSpeedDirDist(motorName, steps, speed, directionName) {
        let motor = this.getMotorByName(motorName)
            .setDirection(this.getDirectionByName(directionName))
            .setSpeed(speed)
            .setDistanceLimit(steps);

        this.sendUpdateIfNeeded();

        return this.waitForMotorCallback(motor.id, steps);
    }

    doSetMotorSpeedDirSync(motorName, motor2Name, speed, directionName) {
        if (motorName === motor2Name)
            return;

        let motor1 = this.getMotorByName(motorName);
        let motor2 = this.getMotorByName(motor2Name);

        motor1
            .setSync(motor2.id)
            .setDirection(this.getDirectionByName(directionName))
            .setSpeed(speed);

        motor2
            .setDirection(this.getDirectionByName(directionName))
            .setSpeed(speed);

        this.sendUpdateIfNeeded();
    }

    doSetMotorSpeedDirDistSync(motorName, motor2Name, steps, speed, directionName) {
        if (motorName === motor2Name)
            return;

        let motor1 = this.getMotorByName(motorName);
        let motor2 = this.getMotorByName(motor2Name);

        motor1
            .setSync(motor2.id)
            .setDirection(this.getDirectionByName(directionName))
            .setSpeed(speed)
            .setDistanceLimit(steps);

        motor2
            .setDirection(this.getDirectionByName(directionName))
            .setSpeed(speed)
            .setDistanceLimit(steps);

        this.sendUpdateIfNeeded();

        return this.waitForMotorCallback(motor.id, steps);
    }

    doStopMotorAndReset(motorName) {
        this.getMotorByName(motorName)
            .setSync(MotorSyncEnum.SYNC_NONE)
            .setSpeed(0)
            .setDistanceLimit(0);

        this.sendUpdateIfNeeded();
    }


    doSetOutputValue(outputID, value) {
        console.log(outputID, typeof outputID);
        this.outputs[outputID].setValue(value * 100 / 8);
        this.sendUpdateIfNeeded();
    }

    doResetCounter(counterName) {
        this.getCounterByName(counterName).doReset();
        this.sendUpdateIfNeeded();
    }

    doConfigureInput(inputName, modeName) {
        this.getInputByName(inputName)
            .setMode(this.getModeIdByName(modeName));
        this.sendUpdateIfNeeded();
    }

    getSensor(inputName, sensorName) {
        let inputByName = this.getInputByName(inputName);
        inputByName.adjustAnalogInputMode(sensorName);
        this.sendUpdateIfNeeded();

        return inputByName.value;
    }

    getDigitalSensor(inputName, sensorName) {
        let inputByName = this.getInputByName(inputName);
        inputByName.adjustDigitalInputMode(sensorName);
        this.sendUpdateIfNeeded();

        return inputByName.value === 1;
    }

    onOpenClose(inputName, sensorName, directionString) {
        let input = this.getInputByName(inputName);
        input.adjustDigitalInputMode(sensorName);
        this.sendUpdateIfNeeded();

        if (directionString === InputDigitalSensorChangeTypes.button_opens) {
            return input.oldValue === 1 && input.value === 0;
        } else if (directionString === InputDigitalSensorChangeTypes.button_closes) {
            return input.oldValue === 0 && input.value === 1;
        } else {
            console.error("Invalid change string: " + directionString + ". "
                + "Expected " + InputDigitalSensorChangeTypes.button_opens
                + " or " + InputDigitalSensorChangeTypes.button_closes + ".")
        }
    }

    onCounter(counterName, operator, value) {
        let counter = this.getCounterByName(counterName);
        if (operator === '>') {
            return !(counter.oldValue > value) && counter.value > value;
        } else if (operator === '<') {
            return !(counter.oldValue < value) && counter.value < value;
        } else if (operator === '=') {
            return !(counter.oldValue === value) && counter.value === value;
        } else {
            console.error("Invalid operator: " + operator)
        }
    }

    onInput(inputName, sensorType, operator, value) {
        let input = this.getInputByName(inputName);
        input.adjustAnalogInputMode(inputName);
        this.sendUpdateIfNeeded();

        if (operator === '>') {
            return !(input.oldValue > value) && input.value > value;
        } else if (operator === '<') {
            return !(input.oldValue < value) && input.value < value;
        } else if (operator === '=') {
            return !(input.oldValue === value) && input.value === value;
        } else {
            console.error("Invalid operator: " + operator)
        }
    }

    reset() {
        this._socket.sendResetMessage();
        // TODO: Delete motor callbacks
    }

}

/**
 * Enum for motor specification.
 * @readonly
 * @enum {string}
 */
const MotorID = {
    M1: 'Motor 1',
    M2: 'Motor 2',
    M3: 'Motor 3',
    M4: 'Motor 4',
};

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

/**
 * Enum for counter specification.
 * @readonly
 * @enum {string}
 */
const CounterID = {
    C1: 'Counter 1',
    C2: 'Counter 2',
    C3: 'Counter 3',
    C4: 'Counter 4',
};

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


/**
 * Enum for motor direction specification.
 * @readonly
 * @enum {string}
 */
const MotorDirection = {
    FORWARD: 'forward',
    REVERSE: 'backwards'
};

/**
 * Scratch 3.0 blocks to interact with a LEGO WeDo 2.0 device.
 */
class Scratch3TxtBlocks {

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID() {
        return 'ftxt';
    }

    /**
     * Construct a set of WeDo 2.0 blocks.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
    constructor(runtime) {
        /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this._connection = null;
        this._device = null;

        this.connect();
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: Scratch3TxtBlocks.EXTENSION_ID,
            name: 'TXT-Controller',
            iconURI: "", // TODO
            blocks: [
                // EVENTS
                {
                    opcode: 'onOpenClose',
                    text: 'If [SENSOR] [INPUT] [OPENCLOSE]',
                    blockType: BlockType.HAT,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            menu: 'inputDigitalSensorTypes',
                            defaultValue: InputDigitalSensorTypes.sens_button
                        },
                        INPUT: {
                            type: ArgumentType.STRING,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                        OPENCLOSE: {
                            type: ArgumentType.STRING,
                            menu: 'inputDigitalSensorChangeTypes',
                            defaultValue: InputDigitalSensorChangeTypes.button_closes
                        },
                    }
                },
                {
                    opcode: 'onCounter',
                    text: 'If [COUNTER_ID] [OPERATOR] [VALUE]',
                    blockType: BlockType.HAT,
                    arguments: {
                        COUNTER_ID: {
                            type: ArgumentType.STRING,
                            menu: 'counterID',
                            defaultValue: CounterID.C1
                        },
                        OPERATOR: {
                            type: ArgumentType.STRING,
                            menu: 'compares',
                            defaultValue: '>'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100,
                            minValue: 0
                        }
                    }
                },
                {
                    opcode: 'onInput',
                    text: 'If value of [SENSOR] [INPUT] [OPERATOR] [VALUE]',
                    blockType: BlockType.HAT,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            menu: 'inputAnalogSensorTypes',
                            defaultValue: InputAnalogSensorTypes.sens_distance
                        },
                        INPUT: {
                            type: ArgumentType.STRING,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                        OPERATOR: {
                            type: ArgumentType.STRING,
                            menu: 'compares',
                            defaultValue: '>'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100,
                            minValue: 0
                        }
                    }
                },


                // GETTER

                {
                    opcode: 'getCounter',
                    text: 'Get value of [COUNTER_ID] ',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        COUNTER_ID: {
                            type: ArgumentType.STRING,
                            menu: 'counterID',
                            defaultValue: CounterID.C1
                        },
                    }
                },
                {
                    opcode: 'getSensor',
                    text: 'Read value of [SENSOR] [INPUT]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            menu: 'inputAnalogSensorTypes',
                            defaultValue: InputAnalogSensorTypes.sens_distance
                        },
                        INPUT: {
                            type: ArgumentType.STRING,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                    }
                },
                {
                    opcode: 'isClosed',
                    text: 'Is [SENSOR] [INPUT] closed?',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.STRING,
                            menu: 'inputDigitalSensorTypes',
                            defaultValue: InputDigitalSensorTypes.sens_button
                        },
                        INPUT: {
                            type: ArgumentType.STRING,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                    }
                },

                // SETTER
                {
                    opcode: 'doPlaySound',
                    text: 'Play sound [NUM]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1,
                            maxValue: 29
                        }
                    }
                },
                {
                    opcode: 'doPlaySoundWait',
                    text: 'Play sound [NUM] and wait',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1,
                            maxValue: 29
                        }
                    }
                },

                {
                    opcode: 'doSetLamp',
                    text: 'Set [OUTPUT] to [NUM]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OUTPUT: {
                            type: ArgumentType.STRING,
                            menu: 'lampID',
                            defaultValue: LampID.L1
                        },
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0,
                            maxValue: 8
                        }
                    }
                },
                {
                    opcode: 'doSetOutput',
                    text: 'Set [OUTPUT] to [NUM]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OUTPUT: {
                            type: ArgumentType.STRING,
                            menu: 'outputID',
                            defaultValue: OutputID.O1
                        },
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0,
                            maxValue: 8
                        }
                    }
                },
                // ----------------------------
                {
                    opcode: 'doResetCounter',
                    text: 'Reset [COUNTER_ID]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        COUNTER_ID: {
                            type: ArgumentType.STRING,
                            menu: 'counterID',
                            defaultValue: CounterID.C1
                        },
                    }
                },
                {
                    opcode: 'doConfigureInput',
                    text: 'Set [INPUT] to [MODE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: 'inputModes',
                            defaultValue: InputModes.mode_d10v
                        },
                    }
                },
                // MOTOR doSetMotorSpeed
                {
                    opcode: 'doSetMotorSpeed',
                    text: 'Set [MOTOR_ID] to [SPEED]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8,
                            minValue: 0,
                            maxValue: 8
                        }
                    }
                },
                {
                    opcode: 'doSetMotorSpeedDir',
                    text: 'Set [MOTOR_ID] to [SPEED] [DIRECTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8,
                            minValue: 0,
                            maxValue: 8
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'motorDirection',
                            defaultValue: MotorDirection.FORWARD
                        }
                    }
                },
                {
                    opcode: 'doSetMotorDir',
                    text: 'Set [MOTOR_ID] to [DIRECTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'motorDirection',
                            defaultValue: MotorDirection.FORWARD
                        }
                    }
                },
                {
                    opcode: 'doStopMotor',
                    text: 'Stop [MOTOR_ID]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        }
                    }
                },

                // MOTOR DONE
                {
                    opcode: 'doSetMotorSpeedDirDist',
                    text: 'Move [MOTOR_ID] by [STEPS] steps with [SPEED] [DIRECTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'motorDirection',
                            defaultValue: MotorDirection.FORWARD
                        },
                        STEPS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100,
                            minValue: 0
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8,
                            minValue: 0,
                            maxValue: 8
                        }
                    }
                },
                {
                    opcode: 'doSetMotorSpeedDirSync',
                    text: 'Move [MOTOR_ID] and [MOTOR_ID2] with [SPEED] [DIRECTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        },
                        MOTOR_ID2: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M2
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'motorDirection',
                            defaultValue: MotorDirection.FORWARD
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8,
                            minValue: 0,
                            maxValue: 8
                        }
                    }
                },
                {
                    opcode: 'doSetMotorSpeedDirDistSync',
                    text: 'Move [MOTOR_ID] and [MOTOR_ID2] by [STEPS] steps with [SPEED] [DIRECTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        },
                        MOTOR_ID2: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M2
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: 'motorDirection',
                            defaultValue: MotorDirection.FORWARD
                        },
                        STEPS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100,
                            minValue: 0
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8,
                            minValue: 0,
                            maxValue: 8
                        }
                    }
                },
                {
                    opcode: 'doStopMotorAndReset',
                    text: 'Reset [MOTOR_ID]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.STRING,
                            menu: 'motorID',
                            defaultValue: MotorID.M1
                        }
                    }
                },
                // RESET
                {
                    opcode: 'reset',
                    text: 'Reset',
                    blockType: BlockType.COMMAND
                },
            ],
            menus: {
                motorID: [MotorID.M1, MotorID.M2, MotorID.M3, MotorID.M4],
                counterID: [CounterID.C1, CounterID.C2, CounterID.C3, CounterID.C4],
                inputID: [
                    InputID.I1, InputID.I2, InputID.I3, InputID.I4,
                    InputID.I5, InputID.I6, InputID.I7, InputID.I8,
                ],
                inputModes: [
                    InputModes.mode_a5k, InputModes.mode_a10v,
                    InputModes.mode_d5k, InputModes.mode_d10v,
                    InputModes.mode_ultrasonic
                ],
                inputAnalogSensorTypes: [
                    InputAnalogSensorTypes.sens_color,
                    InputAnalogSensorTypes.sens_distance,
                    InputAnalogSensorTypes.sens_ntc,
                    InputAnalogSensorTypes.sens_photo
                ],
                inputDigitalSensorTypes: [
                    InputDigitalSensorTypes.sens_button,
                    InputDigitalSensorTypes.sens_reed,
                    InputDigitalSensorTypes.sens_lightBarrier,
                ],
                inputDigitalSensorChangeTypes: [
                    InputDigitalSensorChangeTypes.button_closes,
                    InputDigitalSensorChangeTypes.button_opens,
                ],
                outputID: [
                    OutputID.O1, OutputID.O2, OutputID.O3, OutputID.O4,
                    OutputID.O5, OutputID.O6, OutputID.O7, OutputID.O8,
                ],
                lampID: [
                    LampID.L1, LampID.L2, LampID.L3, LampID.L4,
                    LampID.L5, LampID.L6, LampID.L7, LampID.L8,
                ],
                motorDirection: [MotorDirection.FORWARD, MotorDirection.REVERSE],
                compares: ['<', '>']
            }
        };
    }

    /**
     * Use the Device Manager client to attempt to connect to a WeDo 2.0 device.
     * TODO!
     */
    connect() {
        console.log("TRY TO CONNECT")
        if (this._device) {
            return;
        }

        //TODO: Automatic reconnect
        this._device = new TxtController(this.runtime);
    }

    getPeripheralIsConnected() {
        let connected = false;
        if (this._device) {
            connected = this._device.isDeviceConnected();
        }
        return connected;
    }

    // Beginning here: Block method definitions

    /**
     * TODO!
     * @param args
     */
    doPlaySound(args) {
        this._device.doPlaySound(args.NUM)
    }

    doPlaySoundWait(args) {
        return this._device.doPlaySoundAndWait(args.NUM);
    }

    doSetMotorSpeed(args) {
        return this._device.doSetMotorSpeed(args.MOTOR_ID, args.SPEED);
    }

    doSetMotorSpeedDir(args) {
        return this._device.doSetMotorSpeedDir(args.MOTOR_ID, args.SPEED, args.DIRECTION);
    }

    doSetMotorDir(args) {
        return this._device.doSetMotorDir(args.MOTOR_ID, args.DIRECTION);
    }

    doStopMotor(args) {
        return this._device.doSetMotorSpeed(args.MOTOR_ID, 0);
    }

    doStopMotorAndReset(args) {
        return this._device.doStopMotorAndReset(args.MOTOR_ID);
    }


    doSetMotorSpeedDirDist(args) {
        return this._device.doSetMotorSpeedDirDist(args.MOTOR_ID, args.STEPS, args.SPEED, args.DIRECTION)
    }

    doSetMotorSpeedDirSync(args) {
        return this._device.doSetMotorSpeedDirSync(args.MOTOR_ID, args.MOTOR_ID2, args.SPEED, args.DIRECTION)
    }

    doSetMotorSpeedDirDistSync(args) {
        return this._device.doSetMotorSpeedDirDistSync(args.MOTOR_ID, args.MOTOR_ID2, args.STEPS, args.SPEED, args.DIRECTION)
    }


    isClosed(args) {
        // SENSOR, INPUT
        return this._device.getDigitalSensor(args.INPUT, args.SENSOR);
    }

    getSensor(args) {
        // SENSOR, INPUT
        return this._device.getSensor(args.INPUT, args.SENSOR);
    }

    getCounter(args) {
        return this._device.getCounterByName(args.COUNTER_ID).value;
    }

    doResetCounter(args) {
        return this._device.doResetCounter(args.COUNTER_ID);
    }

    doSetLamp(args) {
        let id = args.OUTPUT[5] - 1;
        this._device.doSetOutputValue(id, args.NUM);
    }

    doSetOutput(args) {
        let id = args.OUTPUT[7] - 1;
        this._device.doSetOutputValue(id, args.NUM);
    }

    doConfigureInput(args) {
        this._device.doConfigureInput(args.INPUT, args.MODE);
    }

    onOpenClose(args) {
        return this._device.onOpenClose(args.INPUT, args.SENSOR, args.OPENCLOSE);
    }

    onCounter(args) { // COUNTER_ID, OPERATOR, VALUE
        return this._device.onCounter(args.COUNTER_ID, args.OPERATOR, args.VALUE);
    }

    onInput(args) { // SENSOR, INPUT, OPERATOR, VALUE
        return this._device.onInput(args.INPUT, args.SENSOR, args.OPERATOR, args.VALUE);
    }

    reset(args) {
        return this._device.reset();
    }

}

module.exports = Scratch3TxtBlocks;
