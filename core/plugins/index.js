/**
 * Plugins Module Index
 */

export { Plugin, PLUGIN_STATE } from "./Plugin.js";
export { PluginAPI, PERMISSIONS } from "./PluginAPI.js";
export { PluginManager } from "./PluginManager.js";

/**
 * Sample plugin: word-count addon.
 *
 * Demonstrates the full plugin lifecycle: registers itself,
 * extends the store with a `plugin.wordCount` field, listens
 * for analysis-complete events.
 *
 * Useful as a template for real third-party plugins.
 */
import { Plugin } from "./Plugin.js";

export class WordCountPlugin extends Plugin {

    constructor() {

        super({
            id: "word-count",
            name: "Word Count",
            version: "1.0.0",
            author: "AI PPT Team",
            description: "Đếm số từ cho từng slide và phát sự kiện khi thay đổi.",
            permissions: ["store:read", "store:write", "events:listen", "events:emit", "log"]
        });

        this._unsubscribe = null;

    }

    async install(api) {

        await super.install(api);

        api.setStore("plugin.wordCount.total", 0);

        this._unsubscribe = api.on("analysis-complete", (analysis) => {

            api.setStore("plugin.wordCount.total", analysis?.stats?.words ?? 0);

            api.emit("count-updated", { total: analysis?.stats?.words ?? 0 });

        });

        api.log("installed");

    }

    async activate(api) {

        await super.activate(api);

        api.log("activated");

    }

    async deactivate(api) {

        await super.deactivate(api);

        api.log("deactivated");

    }

    async uninstall(api) {

        try { this._unsubscribe?.(); } catch {}

        await super.uninstall(api);

        api.log("uninstalled");

    }

}