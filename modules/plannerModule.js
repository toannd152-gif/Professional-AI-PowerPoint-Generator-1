/**
 * Slide Planner Module
 * Editable slide plan: edit, reorder, add, delete.
 */

import { BaseViewModule } from "./baseViewModule.js";

export class PlannerModule extends BaseViewModule {

    constructor(ctx) {

        super("planner", ctx);

        this.filter = "";

    }

    render(content, actions, options = {}) {

        this.content = content;

        if (options.filter !== undefined) {
            this.filter = options.filter;
        }

        const analysis = this.ctx.store.get("analysis");
        const slides = this.ctx.store.get("slides") || [];

        if (!slides.length && !analysis) {

            this.emptyState(content, {
                icon: "🗂",
                title: "Chưa có dữ liệu",
                text: "Hãy import và phân tích tài liệu trước.",
                buttonLabel: "Đi tới Upload",
                route: "upload"
            });

            return;

        }

        actions.innerHTML = `
<button id="btn-regen" class="btn btn-secondary">Tạo lại từ phân tích</button>
<button id="btn-add-slide" class="btn btn-primary">+ Thêm slide</button>`;

        actions.querySelector("#btn-regen")
            .addEventListener("click", () => this.generate());

        actions.querySelector("#btn-add-slide")
            .addEventListener("click", () => this.addSlide());

        if (!slides.length) {

            this.generate();

        } else {

            this.renderList();

        }

    }

    generate() {

        const analysis = this.ctx.store.get("analysis");

        if (!analysis) {

            this.notify("warning", "Chưa có kết quả phân tích");

            this.ctx.router.navigate("analysis");

            return;

        }

        const config = this.ctx.services.config;

        const slides = this.ctx.services.planner.plan(analysis, {
            maxBullets: config.get("planner.maxBullets") ?? 5
        });

        this.commit(slides, `Đã tạo ${slides.length} slide`);

    }

    addSlide() {

        const slides = structuredClone(this.ctx.store.get("slides") || []);

        slides.push(this.ctx.services.planner.empty());

        this.commit(slides, "Đã thêm slide mới");

    }

    /**
     * Save with history snapshot.
     */
    commit(slides, message = null) {

        const current = this.ctx.store.get("slides") || [];

        this.ctx.services.history.push(current);

        this.ctx.store.set("slides", slides);

        this.ctx.events.emit("history:changed", {
            canUndo: this.ctx.services.history.canUndo(),
            canRedo: this.ctx.services.history.canRedo()
        });

        if (message) this.notify("success", message);

        this.renderList();

    }

    mutate(id, changes) {

        const slides = structuredClone(this.ctx.store.get("slides") || []);

        const slide = slides.find(s => s.id === id);

        if (!slide) return;

        Object.assign(slide, changes);

        this.commit(slides);

    }

    move(id, delta) {

        const slides = structuredClone(this.ctx.store.get("slides") || []);

        const index = slides.findIndex(s => s.id === id);

        const target = index + delta;

        if (index < 0 || target < 0 || target >= slides.length) return;

        [slides[index], slides[target]] = [slides[target], slides[index]];

        this.commit(slides);

    }

    remove(id) {

        const slides = (this.ctx.store.get("slides") || [])
            .filter(s => s.id !== id);

        this.commit(structuredClone(slides), "Đã xóa slide");

    }

    matchesFilter(slide) {

        if (!this.filter) return true;

        const q = this.filter.toLowerCase();

        return slide.title.toLowerCase().includes(q)
            || (slide.bullets || []).some(b => b.toLowerCase().includes(q));

    }

    renderList() {

        const slides = this.ctx.store.get("slides") || [];

        const visible = slides.filter(s => this.matchesFilter(s));

        const filterBar = this.filter
            ? `<div class="filter-bar">Lọc theo: "<b>${this.esc(this.filter)}</b>" — ${visible.length}/${slides.length} slide
               <button class="btn btn-secondary btn-sm" id="btn-clear-filter">Bỏ lọc</button></div>`
            : "";

        const cards = visible.map(slide => {

            const index = slides.indexOf(slide);

            return `
<div class="slide-card" data-id="${slide.id}">
    <div class="slide-card-header">
        <span class="slide-number">${index + 1}</span>
        <span class="badge badge-${slide.type}">${slide.type}</span>
        <span class="slide-card-tools">
            <button class="icon-btn" data-action="up" title="Lên">↑</button>
            <button class="icon-btn" data-action="down" title="Xuống">↓</button>
            <button class="icon-btn icon-btn-danger" data-action="delete" title="Xóa">✕</button>
        </span>
    </div>
    <input class="slide-title-input" data-field="title" value="${this.esc(slide.title)}" placeholder="Tiêu đề slide">
    <textarea class="slide-bullets-input" data-field="bullets" rows="${Math.max(2, (slide.bullets || []).length)}"
        placeholder="Mỗi dòng là một gạch đầu dòng">${this.esc((slide.bullets || []).join("\n"))}</textarea>
</div>`;

        }).join("");

        this.content.innerHTML = `
<div class="planner">
    ${filterBar}
    <div class="planner-list">${cards || "<p class='inspector-empty'>Không có slide phù hợp.</p>"}</div>
    <div class="planner-footer">
        <button id="btn-go-renderer" class="btn btn-primary">Xem trước (Rendering) →</button>
    </div>
</div>`;

        this.bindList();

    }

    bindList() {

        this.content.querySelector("#btn-clear-filter")
            ?.addEventListener("click", () => {
                this.filter = "";
                this.renderList();
            });

        this.content.querySelector("#btn-go-renderer")
            ?.addEventListener("click", () => this.ctx.router.navigate("renderer"));

        this.content.querySelectorAll(".slide-card").forEach(card => {

            const id = card.dataset.id;

            card.addEventListener("click", () => {
                this.ctx.events.emit("slide:selected", id);
            });

            card.querySelectorAll(".icon-btn").forEach(btn => {

                btn.addEventListener("click", event => {

                    event.stopPropagation();

                    const action = btn.dataset.action;

                    if (action === "up") this.move(id, -1);
                    if (action === "down") this.move(id, 1);
                    if (action === "delete") this.remove(id);

                });

            });

            card.querySelector("[data-field='title']")
                .addEventListener("change", event => {
                    this.mutate(id, { title: event.target.value });
                });

            card.querySelector("[data-field='bullets']")
                .addEventListener("change", event => {

                    const bullets = event.target.value
                        .split("\n")
                        .map(b => b.trim())
                        .filter(Boolean);

                    this.mutate(id, { bullets });

                });

        });

    }

}
