/**
 * PluginManager
 *
 * Owns the plugin lifecycle: install / activate / deactivate
 * / uninstall.
 *
 * Lifecycle of a plugin:
 *
 *   register() → install() → activate() ⇄ deactivate() → uninstall()
 *
 * Plugins are stored in a map keyed by id. The manager
 * enforces dependency order on install/activate and reverse
 * order on uninstall.
 */

import { Plugin, PLUGIN_STATE } from "./Plugin.js";
import { PluginAPI, PERMISSIONS } from "./PluginAPI.js";

export class PluginManager {

    constructor({
        services,
        logger = null,
        eventBus = null,
        store = null,
        permissions = null
    } = {}) {

        this.services = services;
        this.logger = logger;
        this.eventBus = eventBus;
        this.store = store;

        /*
        Permissions granted to plugins by default. They are
        free to declare more in their metadata, but the
        manager will only grant what is allowed here.
        */
        this.allowedPermissions = permissions || Object.values(PERMISSIONS);

        this.plugins = new Map();

        this.eventBus?.on?.("plugin:install", ({ id }) => this.install(id));
        this.eventBus?.on?.("plugin:activate", ({ id }) => this.activate(id));
        this.eventBus?.on?.("plugin:deactivate", ({ id }) => this.deactivate(id));
        this.eventBus?.on?.("plugin:uninstall", ({ id }) => this.uninstall(id));

    }

    /* ---------- registration ---------- */

    register(plugin) {

        if (!(plugin instanceof Plugin)) {

            throw new Error("PluginManager.register: must be a Plugin instance.");

        }

        if (this.plugins.has(plugin.id)) {

            throw new Error(`Plugin "${plugin.id}" already registered.`);

        }

        this.plugins.set(plugin.id, plugin);

        this.logger?.info?.(`[PluginManager] Registered: ${plugin.id} v${plugin.version}`);

        return plugin;

    }

    has(id) {

        return this.plugins.has(id);

    }

    get(id) {

        return this.plugins.get(id);

    }

    list() {

        return [...this.plugins.values()];

    }

    describeAll() {

        return [...this.plugins.values()].map(p => p.describe());

    }

    /* ---------- lifecycle ---------- */

    async install(id) {

        const plugin = this._require(id);

        if (plugin.state === PLUGIN_STATE.INSTALLED || plugin.state === PLUGIN_STATE.ACTIVE) {

            return plugin;

        }

        this._checkDependenciesInstalled(plugin);

        const api = this._makeAPI(plugin);

        try {

            await plugin.install(api);

            this._emit("plugin:installed", { id });

            return plugin;

        } catch (error) {

            plugin.error = error;
            plugin.state = PLUGIN_STATE.ERROR;

            this._emit("plugin:error", { id, error });

            throw error;

        }

    }

    async activate(id) {

        const plugin = this._require(id);

        if (plugin.state === PLUGIN_STATE.ACTIVE) return plugin;

        if (plugin.state !== PLUGIN_STATE.INSTALLED && plugin.state !== PLUGIN_STATE.INACTIVE) {

            await this.install(id);

        }

        const api = this._makeAPI(plugin);

        try {

            await plugin.activate(api);

            this._emit("plugin:activated", { id });

            return plugin;

        } catch (error) {

            plugin.error = error;
            plugin.state = PLUGIN_STATE.ERROR;

            this._emit("plugin:error", { id, error });

            throw error;

        }

    }

    async deactivate(id) {

        const plugin = this._require(id);

        if (plugin.state !== PLUGIN_STATE.ACTIVE) return plugin;

        const api = this._makeAPI(plugin);

        await plugin.deactivate(api);

        this._emit("plugin:deactivated", { id });

        return plugin;

    }

    async uninstall(id) {

        const plugin = this._require(id);

        if (plugin.state === PLUGIN_STATE.ACTIVE) {

            await this.deactivate(id);

        }

        const api = this._makeAPI(plugin);

        await plugin.uninstall(api);

        api.dispose();

        this._emit("plugin:uninstalled", { id });

        return plugin;

    }

    /* ---------- bulk operations ---------- */

    async installAll() {

        for (const p of this._topoSort()) {

            if (p.state === PLUGIN_STATE.REGISTERED) {

                try { await this.install(p.id); } catch {}

            }

        }

    }

    async activateAll() {

        for (const p of this._topoSort()) {

            try { await this.activate(p.id); } catch {}

        }

    }

    async deactivateAll() {

        for (const p of [...this._topoSort()].reverse()) {

            try { await this.deactivate(p.id); } catch {}

        }

    }

    async uninstallAll() {

        for (const p of [...this._topoSort()].reverse()) {

            try { await this.uninstall(p.id); } catch {}

        }

    }

    /* ---------- internals ---------- */

    _require(id) {

        const plugin = this.plugins.get(id);

        if (!plugin) {

            throw new Error(`Plugin "${id}" is not registered.`);

        }

        return plugin;

    }

    _checkDependenciesInstalled(plugin) {

        for (const dep of plugin.dependencies || []) {

            const depPlugin = this.plugins.get(dep);

            if (!depPlugin || depPlugin.state === PLUGIN_STATE.REGISTERED) {

                throw new Error(
                    `Plugin "${plugin.id}" depends on "${dep}" which is not installed.`
                );

            }

        }

    }

    _makeAPI(plugin) {

        const granted = (plugin.permissions || []).filter(p => this.allowedPermissions.includes(p));

        return new PluginAPI({
            pluginId: plugin.id,
            permissions: granted,
            services: this.services,
            logger: this.logger,
            eventBus: this.eventBus,
            store: this.store
        });

    }

    _topoSort() {

        const visited = new Set();
        const result = [];

        const visit = (plugin) => {

            if (visited.has(plugin.id)) return;

            visited.add(plugin.id);

            for (const dep of plugin.dependencies || []) {

                const depPlugin = this.plugins.get(dep);

                if (depPlugin) visit(depPlugin);

            }

            result.push(plugin);

        };

        for (const plugin of this.plugins.values()) visit(plugin);

        return result;

    }

    _emit(event, payload) {

        if (!this.eventBus) return;

        try { this.eventBus.emit(event, payload); } catch {}

    }

}