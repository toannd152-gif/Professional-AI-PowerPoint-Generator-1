/*
============================================================

AI PowerPoint Generator

router.js

Application Router

============================================================
*/

export class Router {

    constructor(eventBus) {

        this.events = eventBus;

        this.routes = new Map();

        this.currentRoute = null;

    }

    /**
     * Register Route
     */
    register(name, callback) {

        if (typeof callback !== "function") {
            throw new Error(`Router: "${name}" callback must be a function.`);
        }

        this.routes.set(name, callback);

    }

    /**
     * Navigate
     */
    navigate(name, payload = {}) {

        if (!this.routes.has(name)) {

            console.warn(`Route "${name}" not found.`);

            return;

        }

        this.currentRoute = name;

        const handler = this.routes.get(name);

        handler(payload);

        this.events.emit(
            "router:navigate",
            {
                route: name,
                payload
            }
        );

        console.log(`Navigate -> ${name}`);

    }

    /**
     * Current Route
     */
    getCurrentRoute() {

        return this.currentRoute;

    }

    /**
     * Check Route
     */
    hasRoute(name) {

        return this.routes.has(name);

    }

    /**
     * Remove Route
     */
    unregister(name) {

        this.routes.delete(name);

    }

    /**
     * Clear
     */
    clear() {

        this.routes.clear();

        this.currentRoute = null;

    }

}