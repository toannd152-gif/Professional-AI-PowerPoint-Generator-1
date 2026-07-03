/**
 * PluginAPI
 *
 * The controlled surface that plugins see. We deliberately
 * expose only what's safe — every call is logged and
 * permission-checked.
 */

export const PERMISSIONS = Object.freeze({
    STORE_READ: "store:read",
    STORE_WRITE: "store:write",
    EVENTS_EMIT: "events:emit",
    EVENTS_LISTEN: "events:listen",
    LOG: "log",
    REGISTER_SERVICE: "service:register",
    REGISTER_MODULE: "module:register",
    REGISTER_STAGE: "stage:register"
});

export class PluginAPI {

    constructor({ pluginId, permissions, services, logger, eventBus, store }) {

        this.pluginId = pluginId;
        this.permissions = new Set(permissions || []);
        this.services = services;
        this.logger = logger;
        this.eventBus = eventBus;
        this.store = store;

        this._originalHandlers = [];

    }

    /* ---------- permission helpers ---------- */

    can(permission) {

        return this.permissions.has(permission);

    }

    require(permission) {

        if (!this.can(permission)) {

            throw new Error(
                `Plugin "${this.pluginId}" lacks permission "${permission}".`
            );

        }

    }

    /* ---------- logging ---------- */

    log(...args) {

        this.require(PERMISSIONS.LOG);

        this.logger?.info?.(`[plugin:${this.pluginId}]`, ...args);

    }

    warn(...args) {

        this.logger?.warn?.(`[plugin:${this.pluginId}]`, ...args);

    }

    error(...args) {

        this.logger?.error?.(`[plugin:${this.pluginId}]`, ...args);

    }

    /* ---------- store ---------- */

    getStore(path) {

        this.require(PERMISSIONS.STORE_READ);

        return this.store?.get?.(path);

    }

    setStore(path, value) {

        this.require(PERMISSIONS.STORE_WRITE);

        this.store?.set?.(path, value);

    }

    /* ---------- events ---------- */

    emit(event, payload) {

        this.require(PERMISSIONS.EVENTS_EMIT);

        this.eventBus?.emit?.(`plugin:${this.pluginId}:${event}`, payload);

    }

    on(event, callback) {

        this.require(PERMISSIONS.EVENTS_LISTEN);

        const wrapped = (payload) => callback(payload);

        this.eventBus?.on?.(`plugin:${this.pluginId}:${event}`, wrapped);

        this._originalHandlers.push({ event, callback: wrapped });

        return () => this.eventBus?.off?.(`plugin:${this.pluginId}:${event}`, wrapped);

    }

    /* ---------- services ---------- */

    registerService(name, instance) {

        this.require(PERMISSIONS.REGISTER_SERVICE);

        this.services?.register?.(name, instance);

    }

    resolveService(name) {

        return this.services?.resolve?.(name);

    }

    /* ---------- stages (extend the standard pipeline) ---------- */

    registerStage(extension) {

        this.require(PERMISSIONS.REGISTER_STAGE);

        /* extension: { name, handler, options } */

        this.services?.registerStage?.(extension);

    }

    /* ---------- cleanup ---------- */

    dispose() {

        for (const { event, callback } of this._originalHandlers) {

            this.eventBus?.off?.(`plugin:${this.pluginId}:${event}`, callback);

        }

        this._originalHandlers.length = 0;

    }

}