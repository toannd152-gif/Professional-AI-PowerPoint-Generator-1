/**
 * Statusbar Component
 */

export class Statusbar {

    constructor(root, store, events) {

        this.root = root;
        this.store = store;
        this.events = events;

        this.message = "Sẵn sàng";

        this.events.on("status", msg => {
            this.message = msg;
            this.render();
        });

        this.events.on("store:changed", () => this.render());

        this.events.on("router:navigate", () => this.render());

    }

    render() {

        const doc = this.store.get("document");
        const slides = this.store.get("slides") || [];

        this.root.innerHTML = `
<div class="statusbar-left">${this.escape(this.message)}</div>
<div class="statusbar-right">
    <span>${doc ? "📄 " + this.escape(doc.title) : "Chưa có tài liệu"}</span>
    <span>🖼 ${slides.length} slide</span>
</div>`;

    }

    escape(text) {
        const div = document.createElement("div");
        div.textContent = text ?? "";
        return div.innerHTML;
    }

}
