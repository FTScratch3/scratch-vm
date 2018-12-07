const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
import {ftxtSession, ScratchLinkWebSocketTXT} from "../../io/ftxtSession";
import {Motor, MotorDirectionEnum, MotorSyncEnum} from "./motor";
import {Output, OutputID} from "./output";
import {Counter, CounterID} from "./counter";
import {
    Input, InputID, InputModes, InputAnalogSensorTypes,
    InputDigitalSensorTypes, InputDigitalSensorChangeTypes,
} from "./input";
import txtImageSmall from './txt_controller_small.png';
// TODO: Grafiken

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
     * @param extensionId
     */
    constructor(runtime, extensionId) {
        /**
         * The socket-IO socket used to communicate with the Device Manager about this device.
         * @type {ftxtSession}
         * @private
         */
        this._runtime = runtime;
        this._runtime.on('PROJECT_STOP_ALL', this.reset.bind(this));

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


        this._runtime.registerExtensionDevice(extensionId, this);
    }

    // CONNECTION METHODS

    getPeripheralIsConnected() {
        return this._socket ? this._socket.getPeripheralIsConnected() : false;
    }

    startDeviceScan() {
        this._socket = new ftxtSession(this._runtime,
            ScratchLinkWebSocketTXT,
            () => this._onSessionConnect(),
            message => this.onSensData(message),
            () => this.onSoundDone()
        );
    }

    disconnectSession() {
        this.reset();
        this._socket.disconnectSession();
    }


    // CONNECTION METHODS DONE

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
    }

    // Status

    isDeviceConnected() {
        this._socket.connectedToDevice();
    }

    // Getter
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
     * @param {number} id
     * @returns {Input|null}
     */
    getInputById(id) {
        if (id < 0 || id > 7)
            return null;
        return this.inputs[id];
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
            let counter = this.getCounterById(motorId);
            let check = () => {
                if (counter.value >= steps) {
                    resolve();
                    return true;
                }
                return false;
            };
            setTimeout(() => {
                this._motorWaitCallbacks.push(check);
            }, 150);
        });
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

    setMotorSync(motor1Id, motor2Id) {
        this.getMotorById(motor1Id).setSync(motor2Id);
    }

    setMotorSyncNone(motorId) {
        this.getMotorById(motorId).resetSync();
    }

    doSetMotorSpeed(motorId, speed) {
        this.getMotorById(motorId)
            .setSpeed08(speed);
        this.sendUpdateIfNeeded();
    }

    doSetMotorSpeedDir(motorId, speed, directionID) {
        this.getMotorById(motorId)
            .setDirection(directionID)
            .setSpeed08(speed);
        this.sendUpdateIfNeeded();
    }

    doSetMotorDir(motorId, directionID) {
        this.getMotorById(motorId)
            .setDirection(directionID);
        this.sendUpdateIfNeeded();
    }

    // Methods for blocks
    doSetMotorSpeedDirDist(motorId, steps, speed, directionID) {
        this.getMotorById(motorId)
            .setDirection(directionID)
            .setSpeed08(speed)
            .setDistanceLimit(steps);

        this.sendUpdateIfNeeded();

        return this.waitForMotorCallback(motorId, steps);
    }

    doSetMotorSpeedDirSync(motor1Id, directionID1, motor2Id, directionID2, speed) {
        if (motor1Id === motor2Id)
            return;

        let motor1 = this.getMotorById(motor1Id);
        let motor2 = this.getMotorById(motor2Id);

        motor1
            .setSync(motor2.id)
            .setDirection(directionID1)
            .resetDistanceLimit()
            .setSpeed08(speed);

        motor2
            .setDirection(directionID2)
            .resetDistanceLimit()
            .setSpeed08(speed);

        this.sendUpdateIfNeeded();
    }

    doSetMotorSpeedDirDistSync(motor1Id, directionID1, motor2Id, directionID2, steps, speed,) {
        if (motor1Id === motor2Id)
            return;

        let motor1 = this.getMotorById(motor1Id);
        let motor2 = this.getMotorById(motor2Id);

        motor1
            .setSync(motor2.id)
            .setDirection(directionID1)
            .setSpeed08(speed)
            .setDistanceLimit(steps);

        motor2
            .setDirection(directionID2)
            .setSpeed08(speed)
            .setDistanceLimit(steps);

        this.sendUpdateIfNeeded();

        return this.waitForMotorCallback(motor1.id, steps);
    }

    doStopMotorAndReset(motorId) {
        this.getMotorById(motorId)
            .setSync(MotorSyncEnum.SYNC_NONE)
            .setSpeed08(0)
            .setDistanceLimit(0);

        this.sendUpdateIfNeeded();
    }


    doSetOutputValue(outputID, value) {
        this.outputs[outputID].setValue08(value);
        this.sendUpdateIfNeeded();
    }

    doResetCounter(counterID) {
        this.getCounterById(counterID).doReset();
        this.sendUpdateIfNeeded();
    }

    doConfigureInput(inputId, modeId) {
        this.getInputById(inputId).setMode(modeId);
        this.sendUpdateIfNeeded();
    }

    getSensor(inputId, sensorID) {
        let input = this.getInputById(inputId);
        input.adjustAnalogInputMode(sensorID);
        this.sendUpdateIfNeeded();

        return input.value;
    }

    getDigitalSensor(inputId, sensorID) {
        let input = this.getInputById(inputId);
        input.adjustDigitalInputMode(sensorID);
        this.sendUpdateIfNeeded();

        return input.value === 1;
    }

    onOpenClose(inputId, sensorID, directionType) {
        let input = this.getInputById(inputId);
        input.adjustDigitalInputMode(sensorID);
        this.sendUpdateIfNeeded();

        if (directionType === InputDigitalSensorChangeTypes.button_opens) {
            return input.oldValue === 1 && input.value === 0;
        } else if (directionType === InputDigitalSensorChangeTypes.button_closes) {
            return input.oldValue === 0 && input.value === 1;
        } else
            return false;
    }

    onCounter(counterID, operator, value) {
        let counter = this.getCounterById(counterID);
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

    onInput(inputId, sensorType, operator, value) {
        let input = this.getInputById(inputId);
        input.adjustAnalogInputMode(inputId);
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

    // noinspection JSMethodCanBeStatic
    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: Scratch3TxtBlocks.EXTENSION_ID,
            name: 'TXT-Controller',
            blockIconURI: txtImageSmall,
            showStatusButton: true,
            blocks: [
                // EVENTS
                {
                    opcode: 'onOpenClose',
                    text: formatMessage({
                        id: 'ftxt.onOpenClose',
                        default: 'If [SENSOR] [INPUT] [OPENCLOSE]',
                        description: 'check when a certain sensor closes or opens'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputDigitalSensorTypes',
                            defaultValue: InputDigitalSensorTypes.sens_button
                        },
                        INPUT: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                        OPENCLOSE: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputDigitalSensorChangeTypes',
                            defaultValue: InputDigitalSensorChangeTypes.button_closes
                        },
                    }
                },
                {
                    opcode: 'onCounter',
                    text: formatMessage({
                        id: 'ftxt.onCounter',
                        default: 'If counter [COUNTER_ID] [OPERATOR] [VALUE]',
                        description: 'check when a certain counter changes its value'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        COUNTER_ID: {
                            type: ArgumentType.NUMBER,
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
                    text: formatMessage({
                        id: 'ftxt.onInput',
                        default: 'If value of [SENSOR] [INPUT] [OPERATOR] [VALUE]',
                        description: 'check when a certain input changes its value'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputAnalogSensorTypes',
                            defaultValue: InputAnalogSensorTypes.sens_distance
                        },
                        INPUT: {
                            type: ArgumentType.NUMBER,
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
                    text: formatMessage({
                        id: 'ftxt.getCounter',
                        default: 'Get value of counter [COUNTER_ID]',
                        description: 'get the value of a counter'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        COUNTER_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'counterID',
                            defaultValue: CounterID.C1
                        },
                    }
                },
                {
                    opcode: 'getSensor',
                    text: formatMessage({
                        id: 'ftxt.getSensor',
                        default: 'Read value of [SENSOR] [INPUT]',
                        description: 'get the value of a sensor'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputAnalogSensorTypes',
                            defaultValue: InputAnalogSensorTypes.sens_distance
                        },
                        INPUT: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                    }
                },
                {
                    opcode: 'isClosed',
                    text: formatMessage({
                        id: 'ftxt.isClosed',
                        default: 'Is [SENSOR] [INPUT] closed?',
                        description: 'check whether a sensor is closed'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        SENSOR: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputDigitalSensorTypes',
                            defaultValue: InputDigitalSensorTypes.sens_button
                        },
                        INPUT: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputID',
                            defaultValue: InputID.I1
                        },
                    }
                },

                // SETTER
                {
                    opcode: 'doPlaySound',
                    text: formatMessage({
                        id: 'ftxt.doPlaySound',
                        default: 'Play sound [NUM]',
                        description: 'Play a sound'
                    }),
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
                    text: formatMessage({
                        id: 'ftxt.doPlaySoundWait',
                        default: 'Play sound [NUM] and wait',
                        description: 'Play a sound and wait'
                    }),
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
                    text: formatMessage({
                        id: 'ftxt.doSetLamp',
                        default: 'Set lamp [OUTPUT] to [NUM]',
                        description: 'Set the value of the given lamp'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OUTPUT: {
                            type: ArgumentType.NUMBER,
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
                {
                    opcode: 'doSetOutput',
                    text: formatMessage({
                        id: 'ftxt.doSetOutput',
                        default: 'Set output [OUTPUT] to [NUM]',
                        description: 'Set the value of the given output'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OUTPUT: {
                            type: ArgumentType.NUMBER,
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
                    text: formatMessage({
                        id: 'ftxt.doResetCounter',
                        default: 'Reset counter [COUNTER_ID]',
                        description: 'Reset the value of the given counter'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        COUNTER_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'counterID',
                            defaultValue: CounterID.C1
                        },
                    }
                },
                {
                    opcode: 'doConfigureInput',
                    text: formatMessage({
                        id: 'ftxt.doConfigureInput',
                        default: 'Set input [INPUT] to [MODE]',
                        description: 'Set the mode of the given input.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        INPUT: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputID',
                            defaultValue: 0
                        },
                        MODE: {
                            type: ArgumentType.NUMBER,
                            menu: 'inputModes',
                            defaultValue: InputModes.mode_d10v
                        },
                    }
                },
                // MOTOR doSetMotorSpeed
                {
                    opcode: 'doSetMotorSpeed',
                    text: formatMessage({
                        id: 'ftxt.doSetMotorSpeed',
                        default: 'Set motor [MOTOR_ID] to [SPEED]',
                        description: 'Set the speed of the given motor'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
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
                    text: formatMessage({
                        id: 'ftxt.doSetMotorSpeedDir',
                        default: 'Set motor [MOTOR_ID] to [SPEED] [DIRECTION]',
                        description: 'Set speed and direction of the given motor'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
                        },
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8,
                            minValue: 0,
                            maxValue: 8
                        },
                        DIRECTION: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorDirection',
                            defaultValue: MotorDirectionEnum.MOTOR_FORWARD
                        }
                    }
                },
                {
                    opcode: 'doSetMotorDir',
                    text: formatMessage({
                        id: 'ftxt.doSetMotorDir',
                        default: 'Set motor [MOTOR_ID] to [DIRECTION]',
                        description: 'Set the direction of the given motor'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
                        },
                        DIRECTION: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorDirection',
                            defaultValue: MotorDirectionEnum.MOTOR_FORWARD
                        }
                    }
                },
                {
                    opcode: 'doStopMotor',
                    text: formatMessage({
                        id: 'ftxt.doStopMotor',
                        default: 'Stop motor [MOTOR_ID]',
                        description: 'Stop the given motor.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
                        },
                    }
                },

                // MOTOR DONE
                {
                    opcode: 'doSetMotorSpeedDirDist',
                    text: formatMessage({
                        id: 'ftxt.doSetMotorSpeedDirDist',
                        default: 'Move motor [MOTOR_ID] by [STEPS] steps with [SPEED] [DIRECTION]',
                        description: 'Move the motor by the given values.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
                        },
                        DIRECTION: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorDirection',
                            defaultValue: MotorDirectionEnum.MOTOR_FORWARD
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
                    text: formatMessage({
                        id: 'ftxt.doSetMotorSpeedDirSync',
                        default: 'Move motor [MOTOR_ID] [DIRECTION] and [MOTOR_ID2] [DIRECTION2] with [SPEED]',
                        description: 'Move the motor by the given values.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
                        },
                        MOTOR_ID2: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 1
                        },
                        DIRECTION: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorDirection',
                            defaultValue: MotorDirectionEnum.MOTOR_FORWARD
                        },
                        DIRECTION2: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorDirection',
                            defaultValue: MotorDirectionEnum.MOTOR_FORWARD
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
                    text: formatMessage({
                        id: 'ftxt.doSetMotorSpeedDirDistSync',
                        default: 'Move motor [MOTOR_ID] [DIRECTION] and [MOTOR_ID2] [DIRECTION2] by [STEPS] steps with [SPEED]',
                        description: 'Move the motor by the given values.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
                        },
                        MOTOR_ID2: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 1
                        },
                        DIRECTION: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorDirection',
                            defaultValue: MotorDirectionEnum.MOTOR_FORWARD
                        },
                        DIRECTION2: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorDirection',
                            defaultValue: MotorDirectionEnum.MOTOR_FORWARD
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
                    text: formatMessage({
                        id: 'ftxt.doStopMotorAndReset',
                        default: 'Reset [MOTOR_ID]',
                        description: 'Stop the motor and reset all synchronizations.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MOTOR_ID: {
                            type: ArgumentType.NUMBER,
                            menu: 'motorID',
                            defaultValue: 0
                        }
                    }
                },
                // RESET
                {
                    opcode: 'reset',
                    text: formatMessage({
                        id: 'ftxt.reset',
                        default: 'Reset',
                        description: 'Reset everything'
                    }),
                    blockType: BlockType.COMMAND
                },
                //*/
            ],
            menus: {
                motorID: Scratch3TxtBlocks._buildIDMenu(4),
                counterID: Scratch3TxtBlocks._buildIDMenu(4),
                inputID: Scratch3TxtBlocks._buildIDMenu(8),
                outputID: Scratch3TxtBlocks._buildIDMenu(8),
                inputModes: Scratch3TxtBlocks._buildInputModeMenu(),
                inputAnalogSensorTypes: Scratch3TxtBlocks._buildAnalogSensorTypeMenu(),
                inputDigitalSensorTypes: Scratch3TxtBlocks._buildDigitalSensorTypeMenu(),
                inputDigitalSensorChangeTypes: Scratch3TxtBlocks._buildOpenCloseMenu(),
                motorDirection: Scratch3TxtBlocks._buildDirectionMenu(),
                compares: ['<', '>']
            }
        };
    }

    // ---- MENU START

    static _buildDigitalSensorTypeMenu() {
        return [{
            text: formatMessage({
                id: 'ftxt.sensor_digital_button',
                default: 'Button',
                description: 'Button'
            }),
            value: String(InputDigitalSensorTypes.sens_button)
        }, {
            text: formatMessage({
                id: 'ftxt.sensor_digital_light_barrier',
                default: 'Light barrier',
                description: 'Light barrier'
            }),
            value: String(InputDigitalSensorTypes.sens_lightBarrier)
        }, {
            text: formatMessage({
                id: 'ftxt.sensor_digital_reed',
                default: 'Reed contact',
                description: 'Reed contact'
            }),
            value: String(InputDigitalSensorTypes.sens_reed)
        }, {
            text: formatMessage({
                id: 'ftxt.sensor_digital_trail',
                default: 'Trail Sensor',
                description: 'Trail Sensor'
            }),
            value: String(InputDigitalSensorTypes.sens_trail)
        }];
    }

    static _buildAnalogSensorTypeMenu() {
        return [{
            text: formatMessage({
                id: 'ftxt.sensor_analog_color',
                default: 'Color Sensor',
                description: 'Color Sensor'
            }),
            value: String(InputAnalogSensorTypes.sens_color)
        }, {
            text: formatMessage({
                id: 'ftxt.sensor_analog_distance',
                default: 'Distance Sensor',
                description: 'Distance Sensor'
            }),
            value: String(InputAnalogSensorTypes.sens_distance)
        }, {
            text: formatMessage({
                id: 'ftxt.sensor_analog_ntc',
                default: 'NTC Resistor',
                description: 'NTC Resistor'
            }),
            value: String(InputAnalogSensorTypes.sens_ntc)
        }, {
            text: formatMessage({
                id: 'ftxt.sensor_analog_photo',
                default: 'Photo Resistor',
                description: 'Photo Resistor'
            }),
            value: String(InputAnalogSensorTypes.sens_photo)
        }];
    }

    static _buildInputModeMenu() {
        return [{
            text: formatMessage({
                id: 'ftxt.input_mode_d10v',
                default: 'Digital voltage',
                description: 'Digital voltage'
            }),
            value: String(InputModes.mode_d10v)
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_d5k',
                default: 'Digital resistance',
                description: 'Digital resistance'
            }),
            value: String(InputModes.mode_d5k)
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_a10v',
                default: 'Analogue voltage',
                description: 'Analogue voltage'
            }),
            value: String(InputModes.mode_a10v)
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_a5k',
                default: 'Analogue resistance',
                description: 'Analogue resistance'
            }),
            value: String(InputModes.mode_a5k)
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_ultrasonic',
                default: 'Ultrasonic',
                description: 'Ultrasonic'
            }),
            value: String(InputModes.mode_ultrasonic)
        }];
    }

    static _buildOpenCloseMenu() {
        return [{
            text: formatMessage({
                id: 'ftxt.input_digital_opens',
                default: "opens",
                description: "opens"
            }),
            value: String(InputDigitalSensorChangeTypes.button_opens)
        }, {
            text: formatMessage({
                id: 'ftxt.input_digital_closes',
                default: "closes",
                description: "closes"
            }),
            value: String(InputDigitalSensorChangeTypes.button_closes)
        }];
    }

    static _buildDirectionMenu() {
        return [{
            text: formatMessage({
                id: 'ftxt.motor_forward',
                default: "forward",
                description: "forward"
            }),
            value: String(MotorDirectionEnum.MOTOR_FORWARD)
        }, {
            text: formatMessage({
                id: 'ftxt.motor_backwards',
                default: "backwards",
                description: "backwards"
            }),
            value: String(MotorDirectionEnum.MOTOR_BACKWARDS)
        }];
    }

    static _buildIDMenu(count) {
        const result = [];
        for (let n = 0; n < count; n++) {
            result.push({
                text: String(n + 1),
                value: String(n)
            })
        }
        return result;
    }

    // ---- MENU DONE

    /**
     * Use the Device Manager client to attempt to connect to a WeDo 2.0 device.
     * TODO!
     */
    connect() {
        console.log("TRY TO CONNECT");
        if (this._device) {
            return;
        }

        //TODO: Automatic reconnect
        this._device = new TxtController(this.runtime, Scratch3TxtBlocks.EXTENSION_ID);
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
        this._device.doPlaySound(
            Cast.toNumber(args.NUM)
        )
    }

    doPlaySoundWait(args) {
        return this._device.doPlaySoundAndWait(
            Cast.toNumber(args.NUM)
        );
    }

    doSetMotorSpeed(args) {
        return this._device.doSetMotorSpeed(
            Cast.toNumber(args.MOTOR_ID),
            Cast.toNumber(args.SPEED)
        );
    }

    doSetMotorSpeedDir(args) {
        return this._device.doSetMotorSpeedDir(
            Cast.toNumber(args.MOTOR_ID),
            Cast.toNumber(args.SPEED),
            Cast.toNumber(args.DIRECTION)
        );
    }

    doSetMotorDir(args) {
        return this._device.doSetMotorDir(
            Cast.toNumber(args.MOTOR_ID),
            Cast.toNumber(args.DIRECTION)
        );
    }

    doStopMotor(args) {
        return this._device.doSetMotorSpeed(
            Cast.toNumber(args.MOTOR_ID),
            0
        );
    }

    doStopMotorAndReset(args) {
        return this._device.doStopMotorAndReset(
            Cast.toNumber(args.MOTOR)
        );
    }


    doSetMotorSpeedDirDist(args) {
        return this._device.doSetMotorSpeedDirDist(
            Cast.toNumber(args.MOTOR_ID),
            Cast.toNumber(args.STEPS),
            Cast.toNumber(args.SPEED),
            Cast.toNumber(args.DIRECTION)
        )
    }

    doSetMotorSpeedDirSync(args) {
        return this._device.doSetMotorSpeedDirSync(
            Cast.toNumber(args.MOTOR_ID),
            Cast.toNumber(args.DIRECTION),
            Cast.toNumber(args.MOTOR_ID2),
            Cast.toNumber(args.DIRECTION2),
            Cast.toNumber(args.SPEED)
        )
    }

    // FIXME: Removing this block after executing it gives an exception
    doSetMotorSpeedDirDistSync(args) {
        return this._device.doSetMotorSpeedDirDistSync(
            Cast.toNumber(args.MOTOR_ID),
            Cast.toNumber(args.DIRECTION),
            Cast.toNumber(args.MOTOR_ID2),
            Cast.toNumber(args.DIRECTION2),
            Cast.toNumber(args.STEPS),
            Cast.toNumber(args.SPEED),
        )
    }

    isClosed(args) {
        // SENSOR, INPUT
        return this._device.getDigitalSensor(
            Cast.toNumber(args.INPUT),
            Cast.toNumber(args.SENSOR)
        );
    }

    getSensor(args) {
        // SENSOR, INPUT
        return this._device.getSensor(
            Cast.toNumber(args.INPUT),
            Cast.toNumber(args.SENSOR)
        );
    }

    getCounter(args) {
        return this._device.getCounterById(
            Cast.toNumber(args.COUNTER_ID)
        ).value;
    }

    doResetCounter(args) {
        return this._device.doResetCounter(
            Cast.toNumber(args.COUNTER_ID)
        );
    }

    doSetLamp(args) {
        this._device.doSetOutputValue(
            Cast.toNumber(args.OUTPUT),
            Cast.toNumber(args.NUM)
        );
    }

    doSetOutput(args) {
        this._device.doSetOutputValue(
            Cast.toNumber(args.OUTPUT),
            Cast.toNumber(args.NUM)
        );
    }

    doConfigureInput(args) {
        this._device.doConfigureInput(
            Cast.toNumber(args.INPUT),
            Cast.toNumber(args.MODE)
        );
    }

    onOpenClose(args) {
        return this._device.onOpenClose(
            Cast.toNumber(args.INPUT),
            Cast.toNumber(args.SENSOR),
            Cast.toNumber(args.OPENCLOSE)
        );
    }

    onCounter(args) { // COUNTER_ID, OPERATOR, VALUE
        return this._device.onCounter(
            Cast.toNumber(args.COUNTER_ID),
            args.OPERATOR,
            Cast.toNumber(args.VALUE)
        );
    }

    onInput(args) { // SENSOR, INPUT, OPERATOR, VALUE
        return this._device.onInput(
            Cast.toNumber(args.INPUT),
            Cast.toNumber(args.SENSOR),
            args.OPERATOR,
            Cast.toNumber(args.VALUE)
        );
    }

    reset() {
        return this._device.reset();
    }

}

module.exports = Scratch3TxtBlocks;
