// describes one counter-configuration
import {TxtInput} from "./txtInput";


/**
 * Enum for counter specification.
 * @readonly
 * @enum {string}
 */
const CounterID = {
    C1: 0,
    C2: 1,
    C3: 2,
    C4: 3,
};


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

module.exports = {Counter, CounterID};
