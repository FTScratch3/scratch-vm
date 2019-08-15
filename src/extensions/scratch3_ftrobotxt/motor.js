
/**
 * Enum for motor specification.
 * @readonly
 * @enum {string}
 */
export const MotorID = {
    M1: 1,
    M2: 2,
    M3: 3,
    M4: 4,
};


/**
 * @enum
 */
export const MotorDirectionEnum = {
    MOTOR_FORWARD: 1,
    MOTOR_BACKWARDS: -1,
    MOTOR_STOP: 0
};

/**
 * @enum
 */
export const MotorSyncEnum = {
    SYNC_NO_CHANGE: -1,
    SYNC_NONE: -1,
    SYNC_MOTOR1: 1,
    SYNC_MOTOR2: 2,
    SYNC_MOTOR3: 3,
    SYNC_MOTOR4: 4,
};

export class Motor {
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
        //this.sync = -10;
        this.dist = -10;
        return this;
    }

    reset() {
        this.speed = 0;
        this.dir = 1;
        //this.sync = -10;
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
        newDist = Math.max(0, newDist);

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
        newSpeed = Math.max(newSpeed, 0);
        newSpeed = Math.min(newSpeed, 100);

        const changed = this.speed !== newSpeed;
        this.speed = newSpeed;
        if (changed) this.modified();

        return this;
    }

    setSpeed08(newSpeed) {
        newSpeed = Math.max(newSpeed, 0);
        newSpeed = Math.min(newSpeed, 8);
        newSpeed = newSpeed * 100 / 8;

        return this.setSpeed(newSpeed);
    }
}
