
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
 * Enum for motor direction specification.
 * @readonly
 * @enum {string}
 */
const MotorDirection = {
    FORWARD: 'forward',
    REVERSE: 'backwards'
};


/**
 * @enum
 */
const MotorDirectionEnum = {
    MOTOR_FORWARD: 1,
    MOTOR_BACKWARDS: -1,
    MOTOR_STOP: 0
};

/**
 * @enum
 */
const MotorSyncEnum = {
    SYNC_NO_CHANGE: -1,
    SYNC_NONE: -1,
    SYNC_MOTOR1: 1,
    SYNC_MOTOR2: 2,
    SYNC_MOTOR3: 3,
    SYNC_MOTOR4: 4,
};

class Motor {
    constructor(id) {
        this.id = id;

        this.mod = false;		// motor was changed?
        this.speed = 0;
        this.dir = MotorDirectionEnum.MOTOR_FORWARD;			// -1 (back), 0 (stop), 1 (forward)
        this.sync = -10;		// -10 = no change, -1 = no-sync, [0-3] = sync with M1-M4
        this.dist = -10;		// -10 = no change, 0 = no distance limit, >0 = distance limit
    }

    modified() {
        this.mod = true;
        return this;
    }

    transmitted() {
        this.mod = false;
        this.sync = -10;
        this.dist = -10;
        return this;
    }

    reset() {
        this.speed = 0;
        this.dir = 1;
        this.sync = -10;
        this.dist = -10;
        return this;
    }

    /**
     * @param {number} newSync
     * @returns {Motor}
     */
    setSync(newSync) {
        const changed = this.sync !== newSync;
        this.sync = newSync;
        if (changed) this.modified();

        return this;
    }

    /**
     * @returns {Motor}
     */
    resetSync() {
        return this.setSync(-1);
    }

    setDistanceLimit(newDist) {
        const changed = this.dist !== newDist;
        this.dist = newDist;
        if (changed) this.modified();

        return this;
    }

    resetDistanceLimit() {
        return this.setDistanceLimit(0);
    }

    setDirection(newDirection) {
        const changed = this.dir !== newDirection;
        this.dir = newDirection;
        if (changed) this.modified();

        return this;
    }

    setSpeed(newSpeed) {
        const changed = this.speed !== newSpeed;
        this.speed = newSpeed * 100 / 8;
        if (changed) this.modified();

        return this;
    }
}

module.exports = {
    MotorDirectionEnum,
    MotorDirection,
    MotorSyncEnum,
    MotorID,
    Motor
};
