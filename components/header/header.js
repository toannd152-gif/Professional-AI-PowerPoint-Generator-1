/**
 * Header Component
 */

export class Header {

    constructor(root, store, events) {

        this.root = root;
        this.store = store;
        this.events = events;

        this.events.on("store:changed", ({ path }) => {
            if (path === "project") this.renderTitle();
        });

        this.events.on("history:changed", state => this.updateHistoryButtons(state));

    }

    render() {

        this.root.innerHTML = `
<div class="header-left">
    <div class="app-logo">AI PPT</div>
    <div class="project-info">
        <div class="project-title" id="project-title"></div>
    </div>
</div>

<div class="header-center">
    <button id="btn-save" class="btn btn-primary">Save</button>
    <button id="btn-undo" class="btn btn-secondary" disabled>Undo</button>
    <button id="btn-redo" class="btn btn-secondary" disabled>Redo</button>
</div>

<div class="header-right">
    <input id="global-search" type="text" placeholder="Tìm trong slide...">
</div>`;

        this.renderTitle();
        this.bindEvents();

    }

    renderTitle() {

        const el = this.root.querySelector("#project-title");

        if (!el) return;

        const project = this.store.get("project");

        el.textContent = project?.name || "Untitled Project";

    }

    updateHistoryButtons({ canUndo, canRedo }) {

        const undo = this.root.querySelector("#btn-undo");
        const redo = this.root.querySelector("#btn-redo");

        if (undo) undo.disabled = !canUndo;
        if (redo) redo.disabled = !canRedo;

    }

    bindEvents() {

        this.root.querySelector("#btn-save")
            .addEventListener("click", () => this.events.emit("project:save"));

        this.root.querySelector("#btn-undo")
            .addEventListener("click", () => this.events.emit("history:undo"));

        this.root.querySelector("#btn-redo")
            .addEventListener("click", () => this.events.emit("history:redo"));

        const search = this.root.querySelector("#global-search");

        search.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                this.events.emit("search:query", search.value.trim());

            }

        });

    }

}
