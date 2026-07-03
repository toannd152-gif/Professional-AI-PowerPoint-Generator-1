/**
 * ModuleManager
 * Manages application modules.
 */

import { BaseModule } from "./BaseModule.js";

export class ModuleManager {

    constructor(logger = null) {

        this.logger = logger;

        this.modules = new Map();

    }

    register(module) {

        if (!(module instanceof BaseModule)) {

            throw new Error(
                "Module must extend BaseModule."
            );

        }

        const name = module.getName();

        if (this.modules.has(name)) {

            throw new Error(
                `Module "${name}" already registered.`
            );

        }

        this.modules.set(name, module);

        this.logger?.info(
            `[ModuleManager] Registered: ${name}`
        );

    }

    get(name) {

        return this.modules.get(name);

    }

    has(name) {

        return this.modules.has(name);

    }

    list() {

        return [...this.modules.keys()];

    }

    async initializeAll() {

        for (const module of this.modules.values()) {

            await module.initialize();

        }

    }

    async startAll() {

        for (const module of this.modules.values()) {

            await module.start();

        }

    }

    async stopAll() {

        const modules = [...this.modules.values()].reverse();

        for (const module of modules) {

            await module.stop();

        }

    }

    async destroyAll() {

        const modules = [...this.modules.values()].reverse();

        for (const module of modules) {

            await module.destroy();

        }

    }

}