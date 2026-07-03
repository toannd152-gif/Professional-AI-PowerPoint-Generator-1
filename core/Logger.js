/**
 * Logger Service
 *
 * Centralized logging service with an in-memory ring buffer
 * so the Developer Dashboard can show a live log stream.
 */

export const LogLevel = Object.freeze({
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
});

const LEVEL_NAMES = ["debug", "info", "warn", "error"];

export class Logger {

    constructor(level = LogLevel.INFO, options = {}) {

        this.level = level;
        this.maxBuffer = options.maxBuffer ?? 500;
        this.logs = [];          // [{ time, level, message, args }]
        this.subscribers = new Set();

    }

    setLevel(level) {

        this.level = level;

    }

    debug(...args) {

        this._write(LogLevel.DEBUG, args);

        if (this.level <= LogLevel.DEBUG) console.debug("[DEBUG]", ...args);

    }

    info(...args) {

        this._write(LogLevel.INFO, args);

        if (this.level <= LogLevel.INFO) console.info("[INFO]", ...args);

    }

    warn(...args) {

        this._write(LogLevel.WARN, args);

        if (this.level <= LogLevel.WARN) console.warn("[WARN]", ...args);

    }

    error(...args) {

        this._write(LogLevel.ERROR, args);

        if (this.level <= LogLevel.ERROR) console.error("[ERROR]", ...args);

    }

    group(title) {

        console.group(title);

    }

    groupEnd() {

        console.groupEnd();

    }

    time(label) {

        console.time(label);

    }

    timeEnd(label) {

        console.timeEnd(label);

    }

    subscribe(callback) {

        this.subscribers.add(callback);

        return () => this.subscribers.delete(callback);

    }

    _write(level, args) {

        const entry = {
            time: Date.now(),
            level: LEVEL_NAMES[level],
            message: args.map(a => typeof a === "string" ? a : safeStringify(a)).join(" ")
        };

        this.logs.push(entry);

        if (this.logs.length > this.maxBuffer) {

            this.logs.shift();

        }

        for (const sub of this.subscribers) {

            try { sub(entry); } catch {}

        }

    }

}

function safeStringify(value) {

    try {

        if (value instanceof Error) {

            return `${value.name}: ${value.message}`;

        }

        return JSON.stringify(value);

    } catch {

        return String(value);

    }

}
