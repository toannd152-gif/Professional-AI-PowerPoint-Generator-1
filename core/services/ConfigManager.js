/**
 * ConfigManager
 * Central configuration service (persisted to localStorage
 * when available — safe to use in Node for tests).
 */

const STORAGE_KEY = "app-config";

function storageAvailable() {

    try {

        return typeof localStorage !== "undefined" && localStorage !== null;

    } catch {

        return false;

    }

}

export class ConfigManager {

    constructor() {

        this.config = this.defaults();

    }

    defaults() {

        return {

            app: {
                name: "AI PPT Generator",
                version: "1.0.0"
            },

            ui: {
                theme: "light",
                language: "vi",
                zoom: 100
            },

            planner: {
                maxBullets: 5
            },

            ai: {
                autoLayout: true,
                autoAnimation: true
            },

            export: {
                defaultFormat: "pptx"
            }

        };

    }

    load() {

        if (!storageAvailable()) return;

        try {

            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved) {

                /*
                Deep-merge over defaults so new config keys
                keep working after app updates.
                */
                this.config = this.merge(this.defaults(), JSON.parse(saved));

            }

        } catch {

            this.config = this.defaults();

        }

    }

    merge(base, override) {

        const out = { ...base };

        for (const [key, value] of Object.entries(override || {})) {

            if (
                value && typeof value === "object" && !Array.isArray(value) &&
                base[key] && typeof base[key] === "object"
            ) {

                out[key] = this.merge(base[key], value);

            } else {

                out[key] = value;

            }

        }

        return out;

    }

    save() {

        if (!storageAvailable()) return;

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(this.config)
        );

    }

    get(path) {

        return path
            .split(".")
            .reduce((obj, key) => obj?.[key], this.config);

    }

    set(path, value) {

        const keys = path.split(".");

        let target = this.config;

        while (keys.length > 1) {

            const key = keys.shift();

            if (!(key in target) || typeof target[key] !== "object") {

                target[key] = {};

            }

            target = target[key];

        }

        target[keys[0]] = value;

    }

    has(path) {

        return this.get(path) !== undefined;

    }

    reset() {

        this.config = this.defaults();

        if (storageAvailable()) {

            localStorage.removeItem(STORAGE_KEY);

        }

    }

    getAll() {

        return structuredClone(this.config);

    }

}
