/**
 * Plugin
 *
 * Base contract every plugin must follow. Provides the four
 * lifecycle hooks that the PluginManager calls:
 *
 *   install(api)      — called once when the plugin is registered.
 *                       Used to declare services, add stages, etc.
 *   activate(api)     — called when the plugin should start
 *                       contributing to the running app.
 *   deactivate(api)   — called when the plugin should stop
 *                       contributing (still installed).
 *   uninstall(api)    — called once before the plugin is removed.
 *                       Must release every resource it acquired.
 *
 * Subclasses implement the hooks they need; the default
 * implementations are no-ops.
 *
 * A plugin also exposes metadata: id, name, version, author.
 */

export const PLUGIN_STATE = Object.freeze({
    REGISTERED: "registered",
    INSTALLED: "installed",
    ACTIVE: "active",
    INACTIVE: "inactive",
    UNINSTALLED: "uninstalled",
    ERROR: "error"
});

export class Plugin {

    constructor({
        id,
        name = null,
        version = "1.0.0",
        author = "Unknown",
        description = "",
        dependencies = [],
        permissions = []
    } = {}) {

        if (!id) {

            throw new Error("Plugin requires an id.");

        }

        this.id = id;
        this.name = name || id;
        this.version = version;
        this.author = author;
        this.description = description;

        this.dependencies = dependencies;     // [pluginId]
        this.permissions = permissions;       // ["store:write", "events:emit", ...]

        this.state = PLUGIN_STATE.REGISTERED;
        this.error = null;
        this.installedAt = null;
        this.activatedAt = null;

    }

    /**
     * Called once when the plugin is registered.
     * Override to declare services, register stages, etc.
     */
    async install(api) {

        this.state = PLUGIN_STATE.INSTALLED;
        this.installedAt = Date.now();

    }

    /**
     * Called to start contributing to the running app.
     */
    async activate(api) {

        this.state = PLUGIN_STATE.ACTIVE;
        this.activatedAt = Date.now();

    }

    /**
     * Called to stop contributing without removing the plugin.
     */
    async deactivate(api) {

        this.state = PLUGIN_STATE.INACTIVE;

    }

    /**
     * Called once before the plugin is removed.
     * Must release every resource.
     */
    async uninstall(api) {

        this.state = PLUGIN_STATE.UNINSTALLED;

    }

    /**
     * Public introspection.
     */
    describe() {

        return {
            id: this.id,
            name: this.name,
            version: this.version,
            author: this.author,
            description: this.description,
            state: this.state,
            dependencies: [...this.dependencies],
            permissions: [...this.permissions],
            installedAt: this.installedAt,
            activatedAt: this.activatedAt,
            error: this.error ? { message: this.error.message } : null
        };

    }

}