/**
 * Global Application Store
 */

export class Store {

    constructor(eventBus, logger = null) {

        this.eventBus = eventBus;
        this.logger = logger;

        this.state = {

            app: {},

            project: null,

            document: null,

            workspace: {},

            slides: [],

            assets: [],

            ui: {

                theme: "light",

                zoom: 100,

                language: "vi"

            },

            settings: {}

        };

    }

    getState() {

        return structuredClone(this.state);

    }

    get(path) {

        return path.split(".").reduce(

            (obj, key) => obj?.[key],

            this.state

        );

    }

    set(path, value) {

        const keys = path.split(".");

        let target = this.state;

        while (keys.length > 1) {

            const key = keys.shift();

            if (!target[key]) {

                target[key] = {};

            }

            target = target[key];

        }

        target[keys[0]] = value;

        this.logger?.debug(

            "[Store]",

            path,

            value

        );

        this.eventBus.emit(

            "store:changed",

            {

                path,

                value

            }

        );

    }

    update(path, callback) {

        const current = this.get(path);

        this.set(

            path,

            callback(current)

        );

    }

    reset() {

        this.state = {

            app: {},

            project: null,

            document: null,

            workspace: {},

            slides: [],

            assets: [],

            ui: {

                theme: "light",

                zoom: 100,

                language: "vi"

            },

            settings: {}

        };

        this.eventBus.emit("store:reset");

    }

    subscribe(callback) {

        this.eventBus.on(

            "store:changed",

            callback

        );

    }

    unsubscribe(callback) {

        this.eventBus.off(

            "store:changed",

            callback

        );

    }

}