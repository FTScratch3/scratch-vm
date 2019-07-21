const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const {ftxtSession, ScratchLinkWebSocketBTSmart} = require("../../io/ftxtSession");
const {Motor, MotorDirectionEnum, MotorSyncEnum} = require("../scratch3_ftrobotxt/motor");
const {Output, OutputID} = require("./output");
const {
    Input, InputID, InputModes, InputAnalogSensorTypes,
    InputDigitalSensorTypes, InputDigitalSensorChangeTypes,
} = require("../scratch3_ftrobotxt/input");

const btsmartImageSmall = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAArCAYAAAAKasrDAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAZdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjAuMjHxIGmVAAAO20lEQVRYR+2XeVDcZZrHo1Z5rLNj1FFnvHan1DhuRctxxi2jcbKT1VGT6Jo7JiREJIncNzR0Q3M1NNBAQ9PNfd/3DU1zNzeBACGEhCMkgYCBEGPiuWPls29T7c7Mbg1Lbe3O7h/zrXrq/VHV9O/Tz/2u+6v+Erp9+/Y9cxNjv7yUn3S0b//mDWft9m+YU0k2LOYnbbgy0PG0+WN/OV3KDX1wMsDht0NH3w/ofvulmo5Nz349Pz5Or9V2eqy20X/iQ4bs93Pa4QDDYZLvz6eob01Xl9yaLM+/NZmfcWumturWbKfx1vzQ4K3LAwOZC8s3M+eWbmRembmcuXBpNvn6yIjltbNnLefnr1nOz82L86rl1atXLW/evPkTM8LqGnM8FFf/szupfWwdNY+uo+6xOxkoyafR8TBKbydUMldiA73QBHsTEiojIkpBYVYixsZ6utpbONndQW+Xkd7+XgaHh5hf/pwvvv6WuaXrjF68zOmpKc5fmOHCwiIz81eZXri6cl66NJtiRlhd3a8/e6hWgJngah4RgML6E9SccT+Oj68PUn8ZMQla5CH+BIT5oU3TUtvRxuwX3zB36zsuXPscowBrGuinaegkU4tL3PjmWy4K0OHZKwxdnuOsgJq8uiQ+u8yU+PxFAX/h/OTaAIcPvrWr3uQ5M1zdI3cwrvRjTmaHLkhGqswBDy9PCsuK8ZQ4EqUKpqyqiuvffs8X333P7M1vKG9vpripjtreDk7PzXHr2+8YmZune2KSrrNj6JubGZi5QN/4GH3DI0wJ4Ivnxk6bEVbXdLj8JcPWl6NSXn7q1rFnHiX/8bvp87Snz8eGABsLQo8dwvqYNen5uTg6O+Ar8yNWp1sBvCkA57/8jtIWPdnVxZS26umfmhCA/0rbmdPoB/up6DTi7uVF2+gwBfo64uJ1jF+6zIWBvgtmhLWp5oX1gzG/epqqXzxAj6M1LVJ7PN3ccHT3QalJIkAVjTJaRUBEKBWtTSwIsGvffM9lEeqChipSijPI05dxRnhw+evvaB8doaq7k8qudpqHBqnr66Cuq42h8bOMTEww0VS7NsBhN4v7+9/7x/G2l5+8rX9EFMvDd3DSxpLTvm4EBkTgG5GKvzoL/6gUYhOTCYqORJedRUVbO1Ud7RQZ6tBkxKPNiiezMp/lr77m69//nsZTw5QZjZQb22g5NUDryDAlIg3a+rroGz3NeEnWbFFR0V1mjD+vmWj5+tYND1PzkCgSs/VZ7qVHEUJIZC5BugoUCRUok0pIL6wiLCGDyJRMQjQ6gmKiCFarUGqjiEqNJ7GoCOPoOQanZ0VoT1LU0kFJS4swA3pR5VkVRRTXl9M+0Mv5nHhmZmbWmzH+vK4PDDzQ/uIT3/874IPr6Pnwbfo1CUSqiwRcHcrkOtS5jZQauonLrSI2qwxFTCJBsQmEaBOJTM1Gm19NSkUrmXXdZOt7yK7vJLuuhdx6PVlVpRQ1VJOan06dyNNGEfZxbRBDra3/NaBJzU/dN/EDnMmMW37FqewCdKpsFIl6QpP1ArCF8qZ+EooNaHJrCNVmEp5SQnRmNdrCJhLLjKRUdpmtg+TyZhKKqtDl5pJTWUpORRn+ymAkMindp04yGupGa3r02gA7fv3MxA9wJmv95TMMV9STHhRPcIKekKQGIjKayKvuIq6ghejsRqKyTNDNaAra0BV3EF/SSUJph3huRZOvF+ClhMenoIyNQpOiIyEzlaAgOSlpiRiMzQz7nmCkueJ5M8LqOvn+5j8Arl9H04bHGG1op9Q7lOD4euHFBsLTGkWlGonMbCI6t01YOzH5RmILOgSkccVi81oEeC3hyYWExImCilITqApDGRWKWhuBJk5JeV4SNTXFDEusmO5u+sSMsLq6X/l5Vp2AqzeZADQ88SOWRN70OTmgVOejic+n3tiPLr8BX0UyKXmFlDUPCUgj6jxhJuCcFgEvfkhqJcqEAlE4GYTGJgnACPwVvihE86+sLae3uYaa8myGZccYzo9fG2Dfoe07+4/uLo/6ux8jee5RGn9yJ9N5GRh3/5ZIi70kOFix9Z+3Ehmr48THNuzeu5us0nois9uFtQlrFXDNRKTrRV6KSk8sEeHNJUKtQyU8mJ2bQYivEwGexxg0NtLaVs+Ivx0dSre1AZq00FC5tfjJewl/5WlaH72LLl00ObvfwsXWHm9XH1KKKpFH5yEJziQyrVbkWi/hmW2oMltRZbWIs4mw1HpCkyoJ1hbgHx4r+qgv2eoQempK0Hoco9DPkSyZLZMzU3T62vze4PnxPvPrV9fFCLms+7Vf3Gx99iGafnoPhofuYCA6lGrLfbj6qvFS5uCnqSEosRGdCGloahvKtHbCM0zeaxMhNnnQIMJbS2BsAb5hOoJVUUSLAkkT/VEtwvvRpn/im1efpNT6X5i8dIG0EK+1j7qejU9sM+VerckeEHkorF3M3RJZACpdGYFxVfipKwiIb1oBVCS3CMhWAdgqCqWdrPo+Ud2NxGRV4xeRiIefgiitlpi4GLQxYaSESvHf9x6Fh98jzvEg4xem0Aa6rh3wtO3hbQ0Crk6A/WDDv36OkiojhfU9xKRXIwtORK5tIkp4LTChieCkJpSpjahzWkVT7ie+UABmViFXJeLqI8fF0wtPT1cCpV4UFxegCXAhxMWCNG0ItU21xCokC7OnB18yI6yu2dy0/wy48UmKK43Utg+jyaoX+2AS/rpm1Jnt4mwkMN5AsKn9pDeSVCZaTW4DqrQKMV2y8QnRCdMiVcTiExgu9ko/UjJSKCrNJTdLR352AtUhHgx+tDXXjLC6lvLyHm98+M4/AP54HaeeeZgMAWboGiMqTU9gZA6+GoPwZivyOAP+Wr2wOjGr60QzrxdnNXJNmUiFwhXzVxcgj8xAEhSFp0xGXlkZUrEEa9VBNBaLkRenYNrF4owZYXXNWG65t+XpB/7Eg71vvkyhfxw5og96R9UiVdcji9WjSWsWBdMgIE2AAkxMmhWLFwWiE5UuIGXRhQQITwapE3GT+WPv4k5mXja+vu54uDmQEK/B2FTDhLf1vBlhdc2kp9/bsfFp9AJsxdbfQd87m7kmsUcXnIZEVSXmsYEwMU00aQYB0kBu3aBoLS3EiKLRFXeSXCFmcEU7ukI9PsoEXKVynDzdOGZzggMHrdi5ZydBIXI+PWFFdJQSfWkO5+z2rg0QuGtMFWyl3/RCmfzZR4j9+Xq6N73IdYkNhZ4+hMrFPI2MJre4FAcXGW5ucnbu3snA1GUGZxbEmr/E2MKyOD8Tm/MZsenE4ewlxcXLGztnAfmpDYGhgTg5HMXDxYpguRM5iZGc2f+btQGadDVO/qPOt14Oyt7wIOkbH8P4wuOckzmSvPcd/HZtw2nfB3hIpRy39cLezgufAH/GP7vGzI2vVmz6+k3x9xLd5ydRJZsKJRZ3PxVhmmQk8kAkvt7I5B74iO+M1ChJjAtn7MCWr65PTz9gRlhd/e9uGmwRnmsV467tqb8R53qaI4MIOXwYG3u5eEk8CrG8hmiKkYZqSSos5NTFOWY+/5KppRtMXrvBeQHcP3WRrOpmEvNqSciuIrWgiuj4NCLj4wgRFy6przPq+Ehi1aGcPbiVwU7D42aE1TW46+3BPy6S5sfvpzEzh4gjttj6pOEcWIB3ZDnxOfXockybsYEifSNjIqxTi8ucv7rMOXH3HZ1doLi5lzAx8gJEgfmExOMsCcDOyR4n52NIvG1RRQcTGxMqQrwFQ4pmbYCtT94XXPdHvdDwyN20ZxWSbWmPgzwP56BCpNEVJIqGrBUbdFVjC0UC8vSlK0wKD04sfs65z5Y5NTNLTdcppJH5uCsycfGLwcHTDwcxmVydj+PpeJTUuDDRsJWM7HmDCg+rtQF2v7HxTwBNldyamkuVpS12fnk4BuTjEVYsxpmeiJgkEcICcQkS993piyvhNdkZ4b2Ry1cobjmJj6oQiTIT94BYHL38iE4Qy6+oYneHIzSL9T8/OYqBT3YwVp79phlhdQ0f2bkCaJrFJjO1m8ZoHU1HjmHrmyMgc3D0z8EnQiwD/mqCo9UYBgYYF6E9b/Le4nXOihwcujRHXkMnktBUpMoY0QcDOO7gQnCkmlhtjLhjf8wu0XK6ezvp8bPnXEWenRlhdZ05YWG/AmiGNC0MzYEKuo9aYS/NxMEvC0+lWLfCcggJS0ARraG+p0e0l8WVaj67cI3RK58xcOEiubUG0QcDcHR1EhVvjfXB3Xx6eB/eUg8cLHYQGSQhM0XNwIld9Mb4rw2wd8/bWxufuJ+6h8TIE5AmwFFbSy4e3YenbzyOUi1pRXV4ycORSBXIFSr0rS0CakHAiT44vyj64Dx9k5PkVJXjJvHB2dkZZ7GVO5z4BH8PO+Su1sjsDqJw+xi1WB66rXbQZXdgbYC3b1++b6wk97mqra/c9hA9sPin9zJy4F0uW2xHabGfhEN72fH+NqLVamw+ssBqzwfi3qwSOTfH2JWronrnRYHM0Dk6QlZRHjJPd/xdHQlzdyBIFIfC5iDVtvs5Z7uHRevtzNntuX3F1eKLud2bd5gRVteNS5cenI7xCxqy2XO7ZvdrVD/3IN3v/4auox/ie3AP4eIyf8L6Y3EBSuW4tSsKHwnFVWX0nztH/9mzdA4O0NLRjr6umlq1gvpPD9Jn+T4z+96kZ8vzdG9/7eRnidHSm+lxki9yk44snzz5ovnVa5fhZ/euhLdBnKbnjndfp9rmEO4nXHGwkSH1DMfbRYG3o4QAF0dy4qIwVpZwKiOecZUfl12PcH3fZm7s2sQNy/cWv3T4qH3Z59OA86HSt5bGx//W/Jr/vppFaKtF7lWZrX3LKxjsj+Fv+QnK4zakOrlQ6WRHwScWJB34gKa9b7EgOc7NvZv56uDWiZte1pXXgr2O3ho5+aKY73eYv/Z/Th1vvEi18OAPgJ2vPse4x3H6P3idid+9xOKWZ1n83UZGNz9/48LhnbqljMQPPh8f+vsb3d0P/a8A/Ud1Ht23rWvf9qimV5/PbHntHwa63nl9dikxavGL3ZtnbxzdUbboY+e83Kx//fbExD3mf/m/F2fO3G1+/Kv+n2vdun8DynF6lJYCbtYAAAAASUVORK5CYII=";


/**
 * Manage communication with a BTSmart  device over a Device Manager client socket.
 */
class BTController {

    /**
     * @return {string} - the type of Device Manager device socket that this class will handle.
     */
    static get DEVICE_TYPE() {
        return 'btsmart';
    }

    /**
     * Construct a BTSmart communication object.
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

        this.outputs = [
            new Output(0), new Output(1)
        ];
        this.inputs = [
            new Input(0), new Input(1), new Input(2), new Input(3), new Input(4)
        ];


        this._runtime.registerPeripheralExtension(extensionId, this);
        this.startUpdateCheck();
    }

    startUpdateCheck() {
        // Every N ms check for updates
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
        this._socket = new ftxtSession(this._runtime,
            this._extensionId,
            ScratchLinkWebSocketBTSmart,
            () => this._onSessionConnect(),
            message => this.onSensData(message),
            () => console.error("Received on sound done. But BTSmart has no sounds ôo")
        );
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

        for (let output of this.outputs) needsUpdate |= output.mod;
        for (let input of this.inputs) needsUpdate |= input.mod;

        return needsUpdate;
    }

    sendUpdateIfNeeded() {
        if (this._socket && this.checkIfUpdateIsNeeded()) {
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
    }

    // events

    onSensData(message) {
        // console.log("onSensData", {message});
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
        if (this._socket)
            this._socket.sendResetMessage();
    }

}


/**
 * Scratch 3.0 blocks to interact with a BTSmart device.
 */
class Scratch3BTSmartBlocks {

    /**
     * @return {string} - the ID of this extension.
     */
    static get EXTENSION_ID() {
        return 'ftbtsmart';
    }

    /**
     * Construct a set of BTSmart blocks.
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
     * Use the Device Manager client to attempt to connect to a BTSmart device.
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

