/**
 * Inspector Component
 * Shows details of the selected slide.
 */

export class Inspector {

    constructor(root, store, events) {

        this.root = root;
        this.store = store;
        this.events = events;

        this.slideId = null;

        this.events.on("slide:selected", id => {
            this.slideId = id;
            this.render();
        });

        this.events.on("store:changed", ({ path }) => {
            if (path === "slides") this.render();
        });

    }

    render() {

        const slides = this.store.get("slides") || [];

        const slide = slides.find(s => s.id === this.slideId);

        if (!slide) {

            this.root.innerHTML = `
<div class="inspector-panel">
    <div class="inspector-title">Inspector</div>
    <p class="inspector-empty">Chọn một slide trong Slide Planner hoặc Rendering để xem chi tiết.</p>
</div>`;

            return;

        }

        const index = slides.indexOf(slide);

        this.root.innerHTML = `
<div class="inspector-panel">
    <div class="inspector-title">Slide ${index + 1}</div>

    <div class="inspector-field">
        <label>Loại</label>
        <div class="badge badge-${slide.type}">${slide.type}</div>
    </div>

    <div class="inspector-field">
        <label>Tiêu đề</label>
        <div class="inspector-value"></div>
    </div>

    <div class="inspector-field">
        <label>Số dòng nội dung</label>
        <div>${(slide.bullets || []).length}</div>
    </div>

    <div class="inspector-field">
        <label>Ghi chú (speaker notes)</label>
        <textarea id="inspector-notes" rows="6" placeholder="Ghi chú cho slide..."></textarea>
    </div>
</div>`;

        this.root.querySelector(".inspector-value").textContent = slide.title;

        const notes = this.root.querySelector("#inspector-notes");

        notes.value = slide.notes || "";

        notes.addEventListener("change", () => {

            this.events.emit("slide:update", {
                id: slide.id,
                changes: { notes: notes.value }
            });

        });

    }

}
