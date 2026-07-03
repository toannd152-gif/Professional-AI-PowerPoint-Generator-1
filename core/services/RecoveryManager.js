/**
 * RecoveryManager
 *
 * Provides:
 *   - retry(): runs a function with exponential backoff
 *   - withRecovery(): wraps an async operation in a fallback chain
 *   - checkpoint(): saves a snapshot for later restore
 *   - restore(): replays the last snapshot
 *
 * Together with CrashReporter this implements the
 * "Recovery" / "Crash Report" pillars mentioned in the
 * architecture review.
 */

const DEFAULTS = {
    retries: 3,
    baseDelay: 200,            // ms
    backoffFactor: 2,
    maxDelay: 5000
};

export class RecoveryManager {

    constructor({ logger = null, storageKey = "app-recovery" } = {}) {

        this.logger = logger;
        this.storageKey = storageKey;

        this.fallbacks = new Map();    // name -> handler[]
        this._checkpoints = [];        // [{ name, snapshot, timestamp }]
        this.maxCheckpoints = 20;

    }

    /* ---------- retries ---------- */

    async retry(fn, options = {}) {

        const opts = { ...DEFAULTS, ...options };

        let attempt = 0;
        let lastError;

        while (attempt <= opts.retries) {

            try {

                return await fn(attempt);

            } catch (error) {

                lastError = error;

                this.logger?.warn?.(`[Recovery] attempt ${attempt + 1} failed:`, error?.message);

                if (attempt === opts.retries) break;

                const delay = Math.min(
                    opts.baseDelay * Math.pow(opts.backoffFactor, attempt),
                    opts.maxDelay
                );

                await this._sleep(delay);

                attempt += 1;

            }

        }

        throw lastError;

    }

    /* ---------- fallback chain ---------- */

    registerFallback(operation, handler) {

        if (!this.fallbacks.has(operation)) this.fallbacks.set(operation, []);

        this.fallbacks.get(operation).push(handler);

        return this;

    }

    async withRecovery(operation, primary, context = {}) {

        try {

            return await primary();

        } catch (error) {

            this.logger?.error?.(`[Recovery] primary "${operation}" failed:`, error?.message);

            const fallbacks = this.fallbacks.get(operation) || [];

            for (let i = 0; i < fallbacks.length; i += 1) {

                try {

                    this.logger?.info?.(`[Recovery] running fallback ${i + 1}/${fallbacks.length} for "${operation}"`);

                    return await fallbacks[i]({ error, ...context });

                } catch (fallbackError) {

                    this.logger?.warn?.(`[Recovery] fallback ${i + 1} failed:`, fallbackError?.message);

                }

            }

            throw error;

        }

    }

    /* ---------- checkpoints ---------- */

    checkpoint(name, snapshot) {

        const entry = { name, snapshot, timestamp: Date.now() };

        this._checkpoints.push(entry);

        if (this._checkpoints.length > this.maxCheckpoints) {

            this._checkpoints.shift();

        }

        if (typeof localStorage !== "undefined") {

            try {

                localStorage.setItem(this.storageKey, JSON.stringify(entry));

            } catch {}

        }

        return entry;

    }

    /**
     * List all in-memory checkpoints (Developer Dashboard
     * calls this as a method).
     */
    checkpoints() {

        return [...this._checkpoints];

    }

    lastCheckpoint() {

        if (this._checkpoints.length) {

            return this._checkpoints[this._checkpoints.length - 1];

        }

        if (typeof localStorage === "undefined") return null;

        try {

            const raw = localStorage.getItem(this.storageKey);

            return raw ? JSON.parse(raw) : null;

        } catch {

            return null;

        }

    }

    async restore() {

        const cp = this.lastCheckpoint();

        if (!cp) return null;

        return cp.snapshot;

    }

    clear() {

        this._checkpoints = [];

        if (typeof localStorage !== "undefined") {

            try { localStorage.removeItem(this.storageKey); } catch {}

        }

    }

    /* ---------- helpers ---------- */

    _sleep(ms) {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

}