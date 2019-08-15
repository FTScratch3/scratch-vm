const ScratchLinkWebSocketTXT = 'ws://127.0.0.1:8001/api';
const ScratchLinkWebSocketBTSmart = 'ws://127.0.0.1:8001/api';

/**
 * Commands supported by this connection
 * @enum {string}
 */
const MessageType = {
    PING: 'PING', // OUT
    RESET: 'RSET',// OUT
    PONG: 'PONG', // IN
    SENS: 'SENS', // IN
    SOUND_DONE: 'SDON' // IN
};


class ftxtSession {

    constructor(runtime, extensionId, websocketAddress, connectCallback, sensCallback, soundDoneCallback) {
        this._runtime = runtime;
        this._extensionId = extensionId;

        this._status = 0;
        this._device = null;

        this._connectCallback = connectCallback;
        this._sensCallback = sensCallback;
        this._soundDoneCallback = soundDoneCallback;

        this._ws = null;
        this._connectionCheckInterval = null;
        this._forcedClose = false;

        this._websocketAddress = websocketAddress;
    }

    connect() {
        if (this._ws != null) {
            this._ws.onopen = () => null;
            this._ws.onerror = () => null;
            this._ws.onclose = () => null;
            this._ws.onmessage = () => null;
            this._ws.close();
        }
        this._connectionCheckInterval = null;
        this._forcedClose = false;

        this._ws = new WebSocket(this._websocketAddress);

        this._ws.onopen = () => this.connectToDevice();
        this._ws.onerror = () => this.handleDisconnectError('ws onerror');
        this._ws.onclose = () => this.handleDisconnectError('ws onclose');
        this._ws.onmessage = msg => this._didReceiveMessage(msg);
    }

    checkIfStillConnected() {
        if (this.connectedToDevice()) {
            this.sendPingMessage();
        } else {
            clearInterval(this._connectionCheckInterval);
            this._connectionCheckInterval = null;
        }
    }


    connectedToDevice() {
        return this._status === 2;
    }

    connectToDevice() {
        this._forcedClose = false;
        this.sendPingMessage();
    }

    _didReceiveMessage(msgStr) {
        let msg = new FTxtIncomingMessage(msgStr);

        switch (msg.type) {
            case MessageType.PONG:
                return this._handleMessagePong(msg);
            case MessageType.SENS:
                return this._handleMessageSens(msg);
            case MessageType.SOUND_DONE:
                return this._handleMessageSoundDone(msg);
        }
    }

    _handleMessageSoundDone(msg) {
        this._soundDoneCallback();
    }

    _handleMessageSens(msg) {
        this._sensCallback(msg.data);
    }

    _handleMessagePong(msg) {
        let connectedDevice = msg.data[0];
        let deviceChanged = this._device !== connectedDevice;
        this._device = connectedDevice;
        if (!connectedDevice) {
            // socket is connected, but no device is connected
            console.log("TXT disconnected from executable.");
            if (this._status === 2) {
                this._sendError();
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTION_LOST_ERROR, {
                    message: `FTScratchTXT.exe lost connection to `,
                    extensionId: this._extensionId
                });
            } else
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR);
            this._status = 1;
        } else {
            // socket and device connected
            this._status = 2;
            if (deviceChanged) {
                this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTED);
                this._connectCallback();
                if (this._connectionCheckInterval)
                    clearInterval(this._connectionCheckInterval);
                setInterval(() => this.checkIfStillConnected(), 1500);
            }
        }
    }

    /**
     * Handle an error resulting from losing connection to a peripheral.
     *
     * This could be due to:
     * - battery depletion
     * - going out of bluetooth range
     * - being powered down
     *
     * Disconnect the socket, and if the extension using this socket has a
     * disconnect callback, call it. Finally, emit an error to the runtime.
     */
    handleDisconnectError(e) {
        // log.error(`BLE error: ${JSON.stringify(e)}`);

        if (this._forcedClose) {
            this._forcedClose = false;
            return;
        }

        console.log("handle error " + e)
        if (this._status === 0) {
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR);
            return;
        }

        // TODO: Fix branching by splitting up cleanup/disconnect in extension
        this.disconnectSession();

        this._runtime.emit(this._runtime.constructor.PERIPHERAL_CONNECTION_LOST_ERROR, {
            message: `Scratch lost connection to`,
            extensionId: this._extensionId
        });
    }


    _sendError() {
        this.disconnectSession();
        this._runtime.emit(this._runtime.constructor.PERIPHERAL_REQUEST_ERROR);
    }


    /**
     * Try connecting to the input peripheral id, and then call the connect
     * callback if connection is successful.
     * @param {number} id - the id of the peripheral to connect to
     */
    connectDevice(id) {
        console.log("connectDevice", {id})
        // TODO: How??
    }

    /**
     * Close the websocket.
     */
    disconnectSession() {
        this._forcedClose = true;
        if (this._ws) this._ws.close();
        this._status = 0;

        this._runtime.emit(this._runtime.constructor.PERIPHERAL_DISCONNECTED);
    }

    /**
     * @return {boolean} whether the peripheral is connected.
     */
    getPeripheralIsConnected() {
        return this._status === 2;
    }

    /**
     * @param {string} message
     */
    sendMessage(message) {
        if (this._ws != null && this._ws.readyState === 1) {
            this._ws.send(message)
        }
    }

    sendPingMessage() {
        this.sendMessage(MessageType.PING);
    }

    sendResetMessage() {
        this.sendMessage(MessageType.RESET);
    }

    sendJsonMessage(cmd, object) {
        this.sendMessage(cmd + JSON.stringify(object));
    }
}


class FTxtIncomingMessage {

    /**
     * @param {string} message
     */
    constructor(message) {

        let data = message.data;
        this._type = data.substring(0, 4);
        const messageData = data.substring(4);
        this._data = (messageData) ? (JSON.parse(messageData)) : null;

        this._origin = message.origin;
    }

    /**
     * @returns {string}
     */
    get type() {
        return this._type;
    }

    /**
     * @returns {*|null}
     */
    get data() {
        return this._data;
    }

    /**
     * @returns {*|null}
     */
    get origin() {
        return this._origin;
    }
}

module.exports = {ftxtSession, ScratchLinkWebSocketTXT, ScratchLinkWebSocketBTSmart};
