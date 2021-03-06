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

    constructor(runtime, websocketAddress, connectCallback, sensCallback, soundDoneCallback) {
        this._runtime = runtime;
        this._status = 0;
        this._device = null;

        this._connectCallback = connectCallback;
        this._sensCallback = sensCallback;
        this._soundDoneCallback = soundDoneCallback;

        this._ws = new WebSocket(websocketAddress);

        this._ws.onopen = () => this.connectToDevice();
        this._ws.onerror = () => this._sendError('ws onerror');
        this._ws.onclose = () => this._sendError('ws onclose');
        this._ws.onmessage = msg => this._didReceiveMessage(msg);

        this._connectionCheckInterval = null;
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
            this._status = 1;
            this._runtime.emit(this._runtime.constructor.PERIPHERAL_ERROR);
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

    _sendError() {
        this._status = 0;
        this._runtime.emit(this._runtime.constructor.PERIPHERAL_ERROR);
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
        this._ws.close();
        this._status = 0;
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
        if (this._ws.readyState === 1) {
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
