const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const log = require('../../util/log');
const cast = require('../../util/cast');
const BLESession = require('../../io/bleSession');
const Base64Util = require('../../util/base64-util');
// describes one motor (speed, direction, distance, sync)
import {ftxtSession} from "../../io/ftxtSession";
import {Motor, MotorDirectionEnum} from "./motor";

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
    }

    transmitted() {
        this.mod = false;
    }

    init() {
        this.mode = -1;
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

    // Methods for blocks

    doSetMotorSpeedDirDist(motorName, steps, speed, directionName) {
        let motor = this.getMotorByName(motorName)
            .setDirection(this.getDirectionByName(directionName))
            .setSpeed(speed)
            .setDistanceLimit(steps);

        this.sendUpdateIfNeeded();

        return new Promise(resolve => {
            let check = () => {
                if (this.counters[motor.id].value >= steps) {
                    resolve();
                    return true;
                }
                return false;
            };
            this._motorWaitCallbacks.push(check);
        });
    }

    doSetOutputValue(outputID, value) {
        console.log(outputID, typeof outputID);
        this.outputs[outputID].setValue(value * 100 / 8);
        this.sendUpdateIfNeeded();
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
                            defaultValue: 1,
                            maxValue: 29
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8,
                            maxValue: 8
                        }
                    }
                }
            ], // TODO
            menus: {
                motorID: [MotorID.M1, MotorID.M2, MotorID.M3, MotorID.M4],
                counterID: [CounterID.C1, CounterID.C2, CounterID.C3, CounterID.C4],
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


    doSetMotorSpeedDirDist(args) {
        return this._device.doSetMotorSpeedDirDist(args.MOTOR_ID, args.STEPS, args.SPEED, args.DIRECTION)
    }

    getCounter(args) {
        return this._device.getCounterByName(args.COUNTER_ID).value;
    }

    doSetLamp(args) {
        let id = args.OUTPUT[5] - 1;
        this._device.doSetOutputValue(id, args.NUM);
    }

    doSetOutput(args) {
        let id = args.OUTPUT[7] - 1;
        this._device.doSetOutputValue(id, args.NUM);
    }

}

module.exports = Scratch3TxtBlocks;
