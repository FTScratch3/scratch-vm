// describes one counter-configuration
import {TxtInput} from "./txtInput";


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
