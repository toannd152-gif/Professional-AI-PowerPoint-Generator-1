/**
 * Service Container
 * Dependency Injection Container
 */

export class ServiceContainer {

    constructor(logger = null) {

        this.logger = logger;

        this.services = new Map();

        this.factories = new Map();

    }

    register(name, instance) {

        if (this.services.has(name)) {

            throw new Error(
                `Service "${name}" already exists.`
            );

        }

        this.services.set(name, instance);

        this.logger?.debug(
            "[Container] register",
            name
        );

    }

    registerFactory(name, factory) {

        this.factories.set(name, factory);

    }

    resolve(name) {

        if (this.services.has(name)) {

            return this.services.get(name);

        }

        if (this.factories.has(name)) {

            const instance = this.factories
                .get(name)(this);

            this.services.set(name, instance);

            return instance;

        }

        throw new Error(
            `Service "${name}" not found.`
        );

    }

    has(name) {

        return this.services.has(name)
            || this.factories.has(name);

    }

    remove(name) {

        this.services.delete(name);

        this.factories.delete(name);

    }

    clear() {

        this.services.clear();

        this.factories.clear();

    }

    list() {

        return [

            ...this.services.keys(),

            ...this.factories.keys()

        ];

    }

}