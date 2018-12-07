const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
import {ftxtSession, ScratchLinkWebSocketBTSmart} from "../../io/ftxtSession";
import {Motor, MotorDirectionEnum, MotorSyncEnum} from "../scratch3_ftrobotxt/motor";
import {Output, OutputID} from "./output";
import {
    Input, InputID, InputModes, InputAnalogSensorTypes,
    InputDigitalSensorTypes, InputDigitalSensorChangeTypes,
} from "../scratch3_ftrobotxt/input";

import btsmartImageSmall from './btsmart_small.png';
// TODO: Grafiken

/**
 * Manage communication with a WeDo 2.0 device over a Device Manager client socket.
 */
class BTController {

    /**
     * @return {string} - the type of Device Manager device socket that this class will handle.
     */
    static get DEVICE_TYPE() {
        return 'btsmart';
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

        this.outputs = [
            new Output(0), new Output(1)
        ];
        this.inputs = [
            new Input(0), new Input(1), new Input(2), new Input(3), new Input(4)
        ];


        this._runtime.registerExtensionDevice(extensionId, this);
    }

    // CONNECTION METHODS

    getPeripheralIsConnected() {
        return this._socket ? this._socket.getPeripheralIsConnected() : false;
    }

    startDeviceScan() {
        this._socket = new ftxtSession(this._runtime,
            ScratchLinkWebSocketBTSmart,
            () => this._onSessionConnect(),
            message => this.onSensData(message),
            () => console.error("Received on sound done. But BTSmart has no sounds ôo")
        );
    }

    disconnectSession() {
        this.reset();
        this._socket.disconnectSession();
    }


    // CONNECTION METHODS DONE

    checkIfUpdateIsNeeded() {
        let needsUpdate = false;

        for (let output of this.outputs) needsUpdate |= output.mod;
        for (let input of this.inputs) needsUpdate |= input.mod;

        return needsUpdate;
    }

    sendUpdateIfNeeded() {
        for (let output of this.outputs) {
            if (output.mod) {
                this._socket.sendJsonMessage("SETO", output);
                output.transmitted();
            }
        }
        for (let input of this.inputs) {
            if (input.mod) {
                this._socket.sendJsonMessage("CFGI", input);
                input.transmitted();
            }
        }
    }

    // events

    onSensData(message) {
        console.log("onSensData", {message});
        for (let n = 0; n < 5; n++) {
            this.inputs[n].setNewValue(message.inputs[n]);
        }

        this.onNewData();
    }

    onNewData() {
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
     * @returns {Input|null}
     */
    getInputById(id) {
        if (id < 0 || id > 3)
            return null;
        return this.inputs[id];
    }

    /**
     * @param {number} id
     * @returns {Motor|null}
     */
    getMotorById(id) {
        if (id < 0 || id > 1)
            return null;
        return this.outputs[id];
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
    doSetOutputValue(outputID, value) {
        this.outputs[outputID].setValue08(value);
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
class Scratch3BTSmartBlocks {

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID() {
        return 'ftbtsmart';
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
            id: Scratch3BTSmartBlocks.EXTENSION_ID,
            name: 'BTSmart',
            blockIconURI: btsmartImageSmall,
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
                            defaultValue: InputAnalogSensorTypes.sens_color
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
                            defaultValue: InputAnalogSensorTypes.sens_ntc
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
                            menu: 'outputID',
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
                            menu: 'outputID',
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
                            menu: 'outputID',
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
                            menu: 'outputID',
                            defaultValue: 0
                        },
                    }
                },
                // MOTOR DONE

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
                inputID: Scratch3BTSmartBlocks._buildIDMenu(4),
                outputID: Scratch3BTSmartBlocks._buildIDMenu(2),
                inputModes: Scratch3BTSmartBlocks._buildInputModeMenu(),
                inputAnalogSensorTypes: Scratch3BTSmartBlocks._buildAnalogSensorTypeMenu(),
                inputDigitalSensorTypes: Scratch3BTSmartBlocks._buildDigitalSensorTypeMenu(),
                inputDigitalSensorChangeTypes: Scratch3BTSmartBlocks._buildOpenCloseMenu(),
                motorDirection: Scratch3BTSmartBlocks._buildDirectionMenu(),
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
        this._device = new BTController(this.runtime, Scratch3BTSmartBlocks.EXTENSION_ID);
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

module.exports = Scratch3BTSmartBlocks;
