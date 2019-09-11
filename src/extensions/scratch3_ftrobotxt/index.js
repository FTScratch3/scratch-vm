const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const {ftxtSession, ScratchLinkWebSocketTXT} = require("../../io/ftxtSession");
const {Motor, MotorDirectionEnum, MotorSyncEnum} = require("./motor");
const {Output, OutputID} = require("./output");
const {Counter, CounterID} = require("./counter");
const {
    Input, InputID, InputModes, InputAnalogSensorTypes,
    InputDigitalSensorTypes, InputDigitalSensorChangeTypes,
} = require("./input");
const txtImageSmall = "data:image/png;base64,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";

// TODO: Grafiken

/**
 * Manage communication with a TXT device over a Device Manager client socket.
 */
class TxtController {

    /**
     * @return {string} - the type of Device Manager device socket that this class will handle.
     */
    static get DEVICE_TYPE() {
        return 'txt';
    }

    /**
     * Construct a TXT communication object.
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
        this._extensionId = extensionId;

        this._updateInterval = 0;


        /**
         * Callbacks used to wait for motor input
         * @type {Array}
         * @private
         */
        this._motorWaitCallbacks = [];
        this._inputWaitCallbacks = [];
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


        this._runtime.registerPeripheralExtension(extensionId, this);
        this.startUpdateCheck();
    }

    startUpdateCheck() {
        // Every 5 ms check for updates
        if (this._updateInterval === 0) {
            this._updateInterval = setInterval(() => {
                this.sendUpdateIfNeeded();
            }, 5);
        }
    }

    stopUpdateCheck() {
        if (this._updateInterval !== 0) {
            clearInterval(this._updateInterval);
            this._updateInterval = 0;
        }
    }

    // CONNECTION METHODS

    isConnected() {
        return this.getPeripheralIsConnected();
    }

    getPeripheralIsConnected() {
        return this._socket ? this._socket.getPeripheralIsConnected() : false;
    }

    scan() {
        if (!this._socket) {
            this._socket = new ftxtSession(this._runtime,
                this._extensionId,
                ScratchLinkWebSocketTXT,
                () => this._onSessionConnect(),
                message => this.onSensData(message),
                () => this.onSoundDone()
            );
        }
        this._socket.connect();
    }

    disconnect() {
        if (this._socket) {
            this.reset();
            this._socket.disconnectSession();
        }
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
        if (this._socket && this.checkIfUpdateIsNeeded()) {
            this.sendActuPacked();
            return true;
        }
        return false;
    }

    sendActuPacked() {
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

    checkCallbacks() {
        // Call every callback and remove those that are done
        this._motorWaitCallbacks = this._motorWaitCallbacks.filter(value => !value());
        this._inputWaitCallbacks = this._inputWaitCallbacks.filter(value => !value());
    }

    // Sensor help methods


    adjustModeAndWaitForChange(input, newMode, bDigital) {
        return new Promise(resolve => {
            let oldType = input.mode;
            if (bDigital) {
                input.adjustDigitalInputMode(newMode);
            } else {
                input.adjustAnalogInputMode(newMode);
            }
            if (oldType !== input.mode) {
                this.waitForInputChange().then(resolve);
            } else {
                resolve();
            }
        })
    }

    waitForInputChange() {
        return new Promise(resolve1 => {
            this.sendUpdateIfNeeded();
            let check = () => {
                resolve1();
                return true;
            };
            this._inputWaitCallbacks.push(check);
        })
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

        // Force the client to update all values
        for (let motor of this.motors) motor.mod = true;
        for (let input of this.inputs) input.mod = true;
        for (let output of this.outputs) output.mod = true;
        for (let counter of this.counters) counter.mod = true;

        this.sendActuPacked();
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
        if (soundID < 1) soundID = 1;
        if (soundID > 29) soundID = 29;
        this._socket.sendJsonMessage("PLAY", {idx: soundID});
    }

    doPlaySoundAndWait(soundID) {
        if (soundID < 1) soundID = 1;
        if (soundID > 29) soundID = 29;
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
        this.sendUpdateIfNeeded();
    }

    setMotorSyncNone(motorId) {
        this.getMotorById(motorId).resetSync();
        this.sendUpdateIfNeeded();
    }

    doSetMotorSpeed(motorId, speed) {
        let motor = this.getMotorById(motorId)
            .setSpeed08(speed);

        if (motor.sync > -1)
            this.doSetMotorSpeed(motor.sync, speed);

        this.sendUpdateIfNeeded();
    }

    doSetMotorSpeedDir(motorId, speed, directionID) {
        let motor = this.getMotorById(motorId)
            .setDirection(directionID)
            .setSpeed08(speed);

        if (motor.sync > -1)
            this.doSetMotorSpeed(motor.sync, speed);

        this.sendUpdateIfNeeded();
    }

    doSetMotorDir(motorId, directionID) {
        this.getMotorById(motorId)
            .setDirection(directionID);

        this.sendUpdateIfNeeded();
    }

    // Methods for blocks
    doSetMotorSpeedDirDist(motorId, steps, speed, directionID) {
        let motor = this.getMotorById(motorId)
            .setDirection(directionID)
            .setSpeed08(speed)
            .setDistanceLimit(steps);

        if (motor.sync > -1)
            this.doSetMotorSpeed(motor.sync, speed);

        this.sendUpdateIfNeeded();

        return this.waitForMotorCallback(motorId, steps)
            .then(() => {
                this.doStopMotorAndReset(motorId, false);
                this.sendUpdateIfNeeded();
            });
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

        return this.waitForMotorCallback(motor1.id, steps)
            .then(() => {
                this.doStopMotorAndReset(motor1.id, false);
                this.sendUpdateIfNeeded();
            });
    }

    doStopMotorAndReset(motorId, resetSync = false) {
        let motorById = this.getMotorById(motorId);
        let sync = motorById.sync;
        motorById
            .setSpeed08(0)
            .setDistanceLimit(0);
        this.sendUpdateIfNeeded();

        if (resetSync) {
            motorById.resetSync();
            this.sendUpdateIfNeeded();
        }

        if (sync > -1) {
            this.doStopMotorAndReset(sync, resetSync);
        }
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
        return this.adjustModeAndWaitForChange(input, sensorID, false)
            .then(() => input.value);
    }

    getDigitalSensor(inputId, sensorID) {
        let input = this.getInputById(inputId);
        return this.adjustModeAndWaitForChange(input, sensorID, true)
            .then(() => input.value === 1);
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
        input.adjustAnalogInputMode(sensorType);
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
        for (let motor of this.motors) motor.reset();
        for (let input of this.inputs) input.reset();
        for (let output of this.outputs) output.reset();
        for (let counter of this.counters) counter.doReset();
        this.sendUpdateIfNeeded();

        if (this._socket)
            this._socket.sendResetMessage();
        // TODO: Delete motor callbacks
    }

}


/**
 * Scratch 3.0 blocks to interact with a TXT device.
 */
class Scratch3TxtBlocks {

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID() {
        return 'ftxt';
    }

    /**
     * Construct a set of TXT blocks.
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
                        default: 'Read value of counter [COUNTER_ID]',
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
                /*
                {
                    opcode: 'doStopAllMotor',
                    text: formatMessage({
                        id: 'ftxt.doStopAllMotor',
                        default: 'Stop all motors',
                        description: 'Stop all motors.'
                    }),
                    blockType: BlockType.COMMAND
                },
                */

                // MOTOR DONE
                {
                    opcode: 'doSetMotorSpeedDirDist',
                    text: formatMessage({
                        id: 'ftxt.doSetMotorSpeedDirDist',
                        default: 'Move motor [MOTOR_ID] [DIRECTION] with [SPEED] by [STEPS] steps',
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
                        default: 'Move motor [MOTOR_ID] [DIRECTION] and [MOTOR_ID2] [DIRECTION2] with [SPEED] by [STEPS] steps',
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
                        default: 'Stop move [MOTOR_ID]',
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
                motorID: Scratch3TxtBlocks._buildIDMenu(4, "M"),
                counterID: Scratch3TxtBlocks._buildIDMenu(4, "C"),
                inputID: Scratch3TxtBlocks._buildIDMenu(8, "I"),
                outputID: Scratch3TxtBlocks._buildIDMenu(8, "O"),
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
                default: 'Switch',
                description: 'Switch'
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
                default: 'Reed switch',
                description: 'Reed switch'
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
            value: InputModes.mode_d10v.toString()
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_d5k',
                default: 'Digital resistance',
                description: 'Digital resistance'
            }),
            value: InputModes.mode_d5k.toString()
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_a10v',
                default: 'Analogue voltage',
                description: 'Analogue voltage'
            }),
            value: InputModes.mode_a10v.toString()
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_a5k',
                default: 'Analogue resistance',
                description: 'Analogue resistance'
            }),
            value: InputModes.mode_a5k.toString()
        }, {
            text: formatMessage({
                id: 'ftxt.input_mode_ultrasonic',
                default: 'Ultrasonic',
                description: 'Ultrasonic'
            }),
            value: InputModes.mode_ultrasonic.toString()
        }];
    }

    static _buildOpenCloseMenu() {
        return [{
            text: formatMessage({
                id: 'ftxt.input_digital_opens',
                default: "opens",
                description: "opens"
            }),
            value: InputDigitalSensorChangeTypes.button_opens.toString()
        }, {
            text: formatMessage({
                id: 'ftxt.input_digital_closes',
                default: "closes",
                description: "closes"
            }),
            value: InputDigitalSensorChangeTypes.button_closes.toString()
        }];
    }

    static _buildDirectionMenu() {
        return [{
            text: formatMessage({
                id: 'ftxt.motor_forward',
                default: "forward",
                description: "forward"
            }),
            value: MotorDirectionEnum.MOTOR_FORWARD.toString()
        }, {
            text: formatMessage({
                id: 'ftxt.motor_backwards',
                default: "backwards",
                description: "backwards"
            }),
            value: MotorDirectionEnum.MOTOR_BACKWARDS.toString()
        }];
    }

    static _buildIDMenu(count, prefix = "") {
        const result = [];
        for (let n = 0; n < count; n++) {
            result.push({
                text: prefix + String(n + 1),
                value: n.toString()
            })
        }
        return result;
    }

    // ---- MENU DONE

    /**
     * Use the Device Manager client to attempt to connect to a TXT device.
     */
    connect() {
        console.log("TRY TO CONNECT");
        if (this._device) {
            return;
        } else {
            //TODO: Automatic reconnect
            this._device = new TxtController(this.runtime, Scratch3TxtBlocks.EXTENSION_ID);
            this._device.reset();
        }

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

    doStopAllMotor() {
        for (let motor of this._device.motors) {
            this._device.doSetMotorSpeed(
                Cast.toNumber(motor.id),
                0
            );
        }
    }

    doStopMotor(args) {
        return this._device.doSetMotorSpeed(
            Cast.toNumber(args.MOTOR_ID),
            0
        );
    }

    doStopMotorAndReset(args) {
        return this._device.doStopMotorAndReset(
            Cast.toNumber(args.MOTOR_ID),
            true
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

    onInput(args) { // If value of [SENSOR] [INPUT] [OPERATOR] [VALUE]
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
