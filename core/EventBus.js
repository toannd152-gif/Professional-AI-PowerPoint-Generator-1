/**
 * EventBus
 *
 * Central pub/sub system. Adds an in-memory ring buffer of
 * recent events so the Developer Dashboard can show a live
 * stream.
 */

export class EventBus {

    constructor(logger = null, options = {}) {

        this.logger = logger;

        this.events = new Map();

        this.maxBuffer = options.maxBuffer ?? 500;
        this._devEventLog = [];

        this.logger?.debug?.("[EventBus] initialized");

    }

    on(event, callback) {

        if (!this.events.has(event)) {

            this.events.set(event, new Set());

        }

        this.events.get(event).add(callback);

    }

    once(event, callback) {

        const wrapper = (payload) => {

            callback(payload);

            this.off(event, wrapper);

        };

        this.on(event, wrapper);

    }

    off(event, callback) {

        if (!this.events.has(event)) {

            return;

        }

        this.events.get(event).delete(callback);

    }

    emit(event, payload = null) {

        /* capture for dev dashboard */

        this._capture(event, payload);

        if (this.logger) {

            this.logger.debug("[Event]", event, payload);

        }

        if (!this.events.has(event)) {

            return;

        }

        this.events
            .get(event)
            .forEach(listener => listener(payload));

    }

    clear() {

        this.events.clear();

    }

    listenerCount(event) {

        if (!this.events.has(event)) {

            return 0;

        }

        return this.events.get(event).size;

    }

    eventNames() {

        return [...this.events.keys()];

    }

    /* ---------- dev helpers ---------- */

    _capture(name, payload) {

        const entry = {
            time: Date.now(),
            name,
            payload
        };

        this._devEventLog.push(entry);

        if (this._devEventLog.length > this.maxBuffer) {

            this._devEventLog.shift();

        }

    }

}