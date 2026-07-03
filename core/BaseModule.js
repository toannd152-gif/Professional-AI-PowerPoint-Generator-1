/**
 * BaseModule
 * Base class for every application module.
 */

export class BaseModule {

    constructor(name, version = "1.0.0") {

        this.name = name;
        this.version = version;

        this.initialized = false;
        this.running = false;

    }

    async initialize() {

        this.initialized = true;

    }

    async start() {

        this.running = true;

    }

    async stop() {

        this.running = false;

    }

    async destroy() {

        this.running = false;
        this.initialized = false;

    }

    getName() {

        return this.name;

    }

    getVersion() {

        return this.version;

    }

    isRunning() {

        return this.running;

    }

}