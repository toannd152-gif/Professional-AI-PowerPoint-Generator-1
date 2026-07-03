/**
 * BaseViewModule
 * A BaseModule that renders a view into the workspace.
 */

import { BaseModule } from "../core/BaseModule.js";

export class BaseViewModule extends BaseModule {

    constructor(name, ctx) {

        super(name);

        /*
        ctx: { store, events, logger, config, router, services }
        */
        this.ctx = ctx;

    }

    render(content, actions) {

        content.innerHTML = "";

    }

    /*
    Helpers
    */

    esc(text) {

        return String(text ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");

    }

    notify(type, message) {

        this.ctx.events.emit("notify", { type, message });

    }

    status(message) {

        this.ctx.events.emit("status", message);

    }

    emptyState(content, { icon, title, text, buttonLabel, route }) {

        content.innerHTML = `
<div class="upload-panel">
    <div class="upload-icon">${icon}</div>
    <h2>${this.esc(title)}</h2>
    <p>${this.esc(text)}</p>
    ${buttonLabel ? `<button class="btn btn-primary" id="empty-action">${this.esc(buttonLabel)}</button>` : ""}
</div>`;

        if (buttonLabel && route) {

            content.querySelector("#empty-action")
                .addEventListener("click", () => this.ctx.router.navigate(route));

        }

    }

}
